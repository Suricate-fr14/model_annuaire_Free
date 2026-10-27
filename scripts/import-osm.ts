// Import des entreprises et commerces de la zone couverte (CITY dans src/config.ts) depuis OpenStreetMap (licence ODbL).
// Usage : npm run db:import            (utilise le cache data/osm-<ville>.json s'il existe)
//         npm run db:import -- --refresh   (retélécharge depuis l'API Overpass)
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { db, get, run, tx } from '../src/lib/db.ts';
import { createFiche, updateFiche, setStatus, type FicheInput } from '../src/lib/fiches.ts';
import { parseOsmHours } from '../src/lib/hours.ts';
import { NETWORKS, normalizeSocial, type Socials } from '../src/lib/social.ts';
import { categoryExists, categoryName } from '../src/lib/taxonomy.ts';
import { phoneValid, emailValid, cleanCity } from '../src/lib/text.ts';
import { communeAt } from '../src/lib/geo.ts';
import { CITY } from '../src/config.ts';

const CENTER = CITY.center;
if (!CENTER.lat && !CENTER.lng) {
  console.error('Renseignez CITY.center (latitude et longitude de la ville) dans src/config.ts avant l\'import.');
  process.exit(1);
}
const RADIUS_M = CITY.radiusM;
const CACHE = `./data/osm-${CITY.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
const refresh = process.argv.includes('--refresh');

type El = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: Record<string, string> };

// ---------- 1. Téléchargement ----------

async function fetchOsm(): Promise<El[]> {
  if (existsSync(CACHE) && !refresh) return JSON.parse(readFileSync(CACHE, 'utf8')).elements;
  const a = `(around:${RADIUS_M},${CENTER.lat},${CENTER.lng})`;
  const query = `[out:json][timeout:180];(
    nwr${a}["name"]["shop"];
    nwr${a}["name"]["craft"];
    nwr${a}["name"]["office"];
    nwr${a}["name"]["amenity"~"^(restaurant|cafe|bar|pub|fast_food|ice_cream|pharmacy|dentist|doctors|clinic|veterinary|bank|driving_school|cinema|theatre|nightclub|arts_centre|library|childcare|kindergarten|coworking_space)$"];
    nwr${a}["name"]["healthcare"];
    nwr${a}["name"]["tourism"~"^(hotel|guest_house|hostel|camp_site|museum|gallery|apartment)$"];
    nwr${a}["name"]["leisure"~"^(fitness_centre|sports_centre|escape_game|bowling_alley|dance|amusement_arcade|water_park)$"];
  );out center tags;`;
  // Les serveurs Overpass publics sont souvent saturés (429, 504) : plusieurs serveurs, plusieurs tentatives.
  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const url of servers) {
      console.log(`Téléchargement Overpass (${new URL(url).host}, essai ${attempt})…`);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'annuaire/0.2 (import)' },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(200_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.elements) || !data.elements.length) throw new Error('réponse vide');
        mkdirSync('./data', { recursive: true });
        writeFileSync(CACHE, JSON.stringify(data));
        return data.elements;
      } catch (e) {
        lastError = `${new URL(url).host} : ${(e as Error).message}`;
        console.warn(`  échec (${lastError})`);
      }
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 15_000 * attempt));
  }
  throw new Error(`Overpass indisponible après plusieurs essais (${lastError}). Réessayez plus tard, ou copiez ${CACHE} depuis une autre installation.`);
}

// ---------- 2. Catégorisation ----------

const BY_TAG: Record<string, Record<string, string>> = {
  amenity: {
    restaurant: 'restaurants', fast_food: 'fast-food', cafe: 'bars-cafes', bar: 'bars-cafes', pub: 'bars-cafes', ice_cream: 'glaciers',
    pharmacy: 'pharmacies', dentist: 'dentistes', doctors: 'medecins', clinic: 'cliniques', veterinary: 'veterinaires', bank: 'banques',
    driving_school: 'auto-ecoles', cinema: 'lieux-culturels', theatre: 'lieux-culturels', arts_centre: 'lieux-culturels', library: 'lieux-culturels',
    nightclub: 'discotheques', childcare: 'creches', kindergarten: 'creches', coworking_space: 'coworking',
  },
  healthcare: {
    physiotherapist: 'kinesitherapeutes', psychotherapist: 'psychologues', psychologist: 'psychologues', nurse: 'infirmiers',
    laboratory: 'laboratoires-analyses', dentist: 'dentistes', doctor: 'medecins', pharmacy: 'pharmacies', clinic: 'cliniques',
    hospital: 'cliniques', optometrist: 'opticiens', audiologist: 'opticiens', osteopath: 'osteopathes', dietitian: 'dieteticiens',
    podiatrist: 'medecins', speech_therapist: 'medecins', occupational_therapist: 'medecins', midwife: 'medecins', centre: 'cliniques',
  },
  tourism: { hotel: 'hotels', hostel: 'hotels', guest_house: 'gites', apartment: 'locations-saisonnieres', camp_site: 'campings', museum: 'lieux-culturels', gallery: 'galeries' },
  leisure: {
    fitness_centre: 'salles-de-sport', sports_centre: 'clubs-sportifs', escape_game: 'escape-games', bowling_alley: 'karting-bowling',
    dance: 'danse', amusement_arcade: 'parcs-loisirs', water_park: 'parcs-loisirs',
  },
  shop: {
    bakery: 'boulangeries', pastry: 'boulangeries', butcher: 'boucheries', deli: 'epiceries-fines', cheese: 'primeurs', greengrocer: 'primeurs',
    chocolate: 'chocolatiers', confectionery: 'chocolatiers', wine: 'cavistes', alcohol: 'cavistes', beverages: 'cavistes', coffee: 'epiceries-fines', tea: 'epiceries-fines',
    supermarket: 'supermarches', convenience: 'supermarches', 'convenience;gas': 'supermarches', organic: 'supermarches', frozen_food: 'supermarches', farm: 'producteurs',
    clothes: 'mode', shoes: 'mode', bag: 'mode', boutique: 'mode', fashion_accessories: 'mode', tailor: 'mode', leather: 'mode',
    jewelry: 'bijouteries', watches: 'bijouteries', florist: 'fleuristes', books: 'librairies', stationery: 'librairies',
    electronics: 'high-tech', mobile_phone: 'high-tech', computer: 'high-tech', hifi: 'high-tech', appliance: 'high-tech', video_games: 'jeux-video',
    toys: 'jouets', baby_goods: 'jouets', pet: 'animaleries', pet_grooming: 'toiletteurs', sports: 'sport-boutiques', outdoor: 'sport-boutiques', bicycle: 'velos',
    newsagent: 'tabac-presse', tobacco: 'tabac-presse', 'e-cigarette': 'tabac-presse', gift: 'cadeaux', cosmetics: 'cosmetiques', perfumery: 'cosmetiques',
    variety_store: 'bazars', second_hand: 'depot-vente', charity: 'depot-vente', shoe_repair: 'cordonniers', key_cutter: 'cordonniers', locksmith: 'serruriers',
    hairdresser: 'coiffeurs', beauty: 'instituts', tattoo: 'tatoueurs', massage: 'spas', hairdresser_supply: 'coiffeurs',
    optician: 'opticiens', hearing_aids: 'opticiens', medical_supply: 'pharmacies',
    car: 'concessionnaires', motorcycle: 'concessionnaires', car_repair: 'garages', car_parts: 'garages', tyres: 'garages',
    doityourself: 'bricolage', hardware: 'bricolage', paint: 'bricolage', garden_centre: 'jardineries', furniture: 'decoration', interior_decoration: 'decoration',
    kitchen: 'cuisinistes', bathroom_furnishing: 'cuisinistes', bed: 'decoration', curtain: 'decoration', houseware: 'decoration', lighting: 'decoration', flooring: 'carreleurs',
    laundry: 'pressing', dry_cleaning: 'pressing', funeral_directors: 'pompes-funebres', travel_agency: 'agences-de-voyages',
    music: 'instruments', musical_instrument: 'instruments', photo: 'photographes', copyshop: 'imprimeries', printing: 'imprimeries', art: 'galeries', frame: 'galeries',
    estate_agent: 'agences-immobilieres', insurance: 'assurances',
  },
  craft: {
    plumber: 'plombiers', electrician: 'electriciens', carpenter: 'menuisiers', joiner: 'menuisiers', cabinet_maker: 'menuisiers', roofer: 'couvreurs',
    painter: 'peintres', locksmith: 'serruriers', tiler: 'carreleurs', hvac: 'chauffagistes', heating_engineer: 'chauffagistes', builder: 'macons', mason: 'macons',
    photographer: 'photographes', caterer: 'traiteurs', brewery: 'producteurs', winery: 'producteurs', gardener: 'paysagistes', shoemaker: 'cordonniers',
    key_cutter: 'cordonniers', tailor: 'mode', dressmaker: 'mode', electronics_repair: 'depannage-informatique', cleaning: 'nettoyage', jeweller: 'bijouteries',
    printer: 'imprimeries', confectionery: 'chocolatiers', window_construction: 'menuisiers', glaziery: 'menuisiers', upholsterer: 'decoration',
  },
  office: {
    lawyer: 'avocats', notary: 'notaires', accountant: 'experts-comptables', estate_agent: 'agences-immobilieres', insurance: 'assurances',
    architect: 'architectes', travel_agent: 'agences-de-voyages', employment_agency: 'interim', it: 'agences-web', company: 'societes',
    consulting: 'conseil-strategie', financial: 'banques', financial_advisor: 'patrimoine', tax_advisor: 'experts-comptables', advertising_agency: 'agences-communication',
    graphic_design: 'illustrateurs', bailiff: 'commissaires-justice', association: 'associations', ngo: 'ong', educational_institution: 'organismes-formation',
    university: 'ecoles', research: 'laboratoires', telecommunication: 'high-tech', energy_supplier: 'energies', translator: 'traduction', coworking: 'coworking',
    surveyor: 'bureaux-etudes', engineer: 'bureaux-etudes', moving_company: 'demenageurs', property_management: 'gestion-locative', security: 'securite',
  },
};

function categorize(t: Record<string, string>): string | null {
  if (t.healthcare === 'alternative') {
    const sp = t['healthcare:speciality'] ?? '';
    if (/osteopath/.test(sp)) return 'osteopathes';
    if (/naturopath|sophro|homeopath/.test(sp)) return 'naturopathes';
  }
  for (const key of ['amenity', 'healthcare', 'tourism', 'leisure', 'craft', 'office', 'shop']) {
    const v = t[key];
    const cat = v ? BY_TAG[key]?.[v] : undefined;
    if (cat && categoryExists(cat)) return cat;
  }
  return null;
}

// ---------- 3. Détails ----------

const CUISINES: Record<string, string> = {
  italian: 'italienne', pizza: 'pizzas', french: 'française', regional: 'régionale', japanese: 'japonaise', sushi: 'sushis', chinese: 'chinoise',
  indian: 'indienne', burger: 'burgers', kebab: 'kebab', asian: 'asiatique', thai: 'thaïlandaise', vietnamese: 'vietnamienne', crepe: 'crêpes et galettes',
  lebanese: 'libanaise', mexican: 'mexicaine', seafood: 'fruits de mer', sandwich: 'sandwichs', moroccan: 'marocaine', turkish: 'turque',
  korean: 'coréenne', greek: 'grecque', spanish: 'espagnole', portuguese: 'portugaise', african: 'africaine', american: 'américaine',
  steak_house: 'grillades', coffee_shop: 'coffee shop', bagel: 'bagels', tapas: 'tapas', vegetarian: 'végétarienne', vegan: 'vegan',
  ice_cream: 'glaces', chicken: 'poulet', salad: 'salades', brunch: 'brunch', tea: 'salon de thé', cake: 'pâtisseries', bubble_tea: 'bubble tea',
};

const yes = (v?: string) => v === 'yes' || v === 'only' || v === 'designated';

function features(t: Record<string, string>) {
  const f: string[] = [];
  if (t.wheelchair === 'yes') f.push('accessible');
  if (yes(t.takeaway)) f.push('emporter');
  if (yes(t.delivery)) f.push('livraison');
  if (yes(t.outdoor_seating)) f.push('terrasse');
  if (t.internet_access && t.internet_access !== 'no') f.push('wifi');
  if (yes(t['diet:vegetarian'])) f.push('vegetarien');
  if (yes(t['diet:vegan'])) f.push('vegan');
  if (yes(t['payment:credit_cards']) || yes(t['payment:cards']) || yes(t['payment:debit_cards'])) f.push('cb');
  if (yes(t['payment:contactless'])) f.push('sans-contact');
  if (yes(t['payment:cheque'])) f.push('cheques');
  if (yes(t.air_conditioning)) f.push('clim');
  if (t.reservation === 'yes' || t.reservation === 'required' || t.reservation === 'recommended') f.push('reservation');
  if (t.dog === 'yes') f.push('animaux');
  return f;
}

const first = (v?: string) => (v ?? '').split(';')[0].trim();

function socials(t: Record<string, string>): Socials {
  const out: Socials = {};
  const pick: Record<string, string[]> = {
    facebook: ['contact:facebook', 'facebook'], instagram: ['contact:instagram', 'instagram'], linkedin: ['contact:linkedin', 'linkedin'],
    x: ['contact:twitter', 'twitter', 'contact:x'], youtube: ['contact:youtube', 'youtube'], tiktok: ['contact:tiktok', 'tiktok'],
    pinterest: ['contact:pinterest'], whatsapp: ['contact:whatsapp'],
  };
  for (const net of NETWORKS) {
    const raw = (pick[net.key] ?? []).map((k) => first(t[k])).find(Boolean);
    if (!raw) continue;
    // Les tags OSM contiennent parfois un simple identifiant sans @.
    const value = /^[\w.-]+$/.test(raw) && net.fromHandle ? `@${raw}` : raw;
    const { url } = normalizeSocial(net, value);
    if (url) out[net.key] = url;
  }
  return out;
}

function shortDesc(t: Record<string, string>, category: string, city: string) {
  const cuisines = (t.cuisine ?? '').split(';').map((c) => CUISINES[c.trim()]).filter(Boolean);
  const where = city ? ` à ${city}` : '';
  if (cuisines.length && /restaurants|fast-food|bars-cafes/.test(category)) {
    const base = category === 'fast-food' ? 'Restauration rapide' : category === 'bars-cafes' ? 'Bar et café' : 'Restaurant';
    return `${base}${where} · cuisine ${cuisines.slice(0, 3).join(', ')}`;
  }
  return `${categoryName(category)}${where}`;
}

function description(t: Record<string, string>, name: string, category: string, street: string, city: string) {
  const lines: string[] = [];
  const cat = categoryName(category).toLowerCase();
  lines.push(`${name} est référencé dans la catégorie « ${cat} »${street ? `, au ${street}` : ''}${city ? ` à ${city}` : ''}.`);
  if (t.description) lines.push(t.description);
  if (t.brand && t.brand !== name) lines.push(`Enseigne : ${t.brand}.`);
  if (t.operator && t.operator !== name && t.operator !== t.brand) lines.push(`Exploitant : ${t.operator}.`);
  if (t.stars) lines.push(`Classement : ${t.stars} étoile${Number(t.stars) > 1 ? 's' : ''}.`);
  if (t.rooms) lines.push(`${t.rooms} chambres.`);
  if (t['healthcare:speciality'] && t.healthcare) lines.push(`Spécialité : ${t['healthcare:speciality'].replace(/_/g, ' ')}.`);
  return lines.join('\n\n');
}

// ---------- 4. Géocodage inverse des adresses manquantes (Géoplateforme IGN, par lots CSV) ----------

async function reverseGeocode(points: { key: string; lat: number; lng: number }[]) {
  const out = new Map<string, { street: string; postcode: string; city: string }>();
  for (let i = 0; i < points.length; i += 1000) {
    const batch = points.slice(i, i + 1000);
    const csv = 'key,lat,lon\n' + batch.map((p) => `${p.key},${p.lat},${p.lng}`).join('\n');
    const fd = new FormData();
    fd.append('data', new Blob([csv], { type: 'text/csv' }), 'points.csv');
    fd.append('columns', 'lat');
    fd.append('columns', 'lon');
    const res = await fetch('https://data.geopf.fr/geocodage/reverse/csv', { method: 'POST', body: fd });
    if (!res.ok) { console.warn(`Géocodage inverse : HTTP ${res.status}, lot ignoré`); continue; }
    const rows = parseCsv(await res.text());
    const head = rows.shift()!;
    const col = (n: string) => head.indexOf(n);
    for (const r of rows) {
      if (r[col('result_status')] !== 'ok') continue;
      const type = r[col('result_type')];
      out.set(r[col('key')], {
        street: type === 'housenumber' || type === 'street' ? r[col('result_name')] : '',
        postcode: r[col('result_postcode')],
        city: r[col('result_city')],
      });
    }
    console.log(`  géocodage inverse : ${Math.min(i + 1000, points.length)}/${points.length}`);
  }
  return out;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ---------- 5. Import ----------

const elements = await fetchOsm();
console.log(`${elements.length} objets OSM`);

type Candidate = { ref: string; el: El; category: string; lat: number; lng: number };
const candidates: Candidate[] = [];
const seen = new Set<string>();
for (const el of elements) {
  const t = el.tags ?? {};
  const category = categorize(t);
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!category || lat == null || lng == null || !t.name) continue;
  if (t.disused || t['disused:shop'] || t.abandoned) continue;
  // Fiches « détaillées » uniquement : au moins des horaires ou un moyen de contact.
  const detailed = t.opening_hours || t.phone || t['contact:phone'] || t.email || t['contact:email'] || t['contact:facebook'] || t['contact:instagram'];
  if (!detailed) continue;
  const dedupe = `${t.name.toLowerCase()}|${lat.toFixed(3)}|${lng.toFixed(3)}`;
  if (seen.has(dedupe)) continue;
  seen.add(dedupe);
  candidates.push({ ref: `${el.type}/${el.id}`, el, category, lat, lng });
}
console.log(`${candidates.length} établissements retenus`);

// Géocodage inverse de tous les établissements : la commune officielle (BAN) prime sur le champ libre addr:city d'OSM.
const geo = await reverseGeocode(candidates.map((c) => ({ key: c.ref.replace('/', '_'), lat: c.lat, lng: c.lng })));

// Points trop loin d'une adresse : commune qui contient le point.
for (const c of candidates) {
  const key = c.ref.replace('/', '_');
  if (geo.get(key)?.city) continue;
  const m = await communeAt(c.lat, c.lng);
  if (m) geo.set(key, { street: geo.get(key)?.street ?? '', postcode: m.postcode, city: m.city });
}

db();
let created = 0, updated = 0, skipped = 0;
tx(() => {
  for (const c of candidates) {
    const t = c.el.tags;
    const g = geo.get(c.ref.replace('/', '_'));
    const street = t['addr:street'] ? [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ') : g?.street ?? '';
    const city = g?.city || cleanCity(t['addr:city'] ?? '');
    const postcode = g?.postcode || (/^\d{5}$/.test(t['addr:postcode'] ?? '') ? t['addr:postcode'] : '');
    const phone = first(t.phone || t['contact:phone'] || t['contact:mobile']);
    const email = first(t.email || t['contact:email']);
    const hoursRaw = t.opening_hours ?? '';
    const hours = parseOsmHours(hoursRaw);

    const data: FicheInput = {
      name: t.name.trim(),
      kind: 'organization',
      category: c.category,
      short_desc: shortDesc(t, c.category, city),
      description: description(t, t.name.trim(), c.category, street, city),
      street, postcode, city,
      lat: c.lat, lng: c.lng,
      phone: phoneValid(phone) ? phone : '',
      email: emailValid(email) ? email : '',
      website: '', // le site internet est réservé à l'abonnement Pro
      siret: t['ref:FR:SIRET'] ?? '',
      hours,
      hours_note: hoursRaw && !hours ? `Horaires : ${hoursRaw}` : /PH/.test(hoursRaw) ? 'Horaires susceptibles de varier les jours fériés.' : '',
      socials: socials(t),
      features: features(t),
      logo: '',
      photos: [],
    };

    const existing = get<{ id: number; owner_id: number | null }>("SELECT id, owner_id FROM fiches WHERE source = 'osm' AND source_ref = ?", c.ref);
    if (existing) {
      // Une fiche revendiquée appartient désormais à son propriétaire : on n'écrase plus ses données.
      if (existing.owner_id) { skipped++; continue; }
      updateFiche(existing.id, data);
      updated++;
    } else {
      const { id } = createFiche(data, { ownerId: null, status: 'published', source: 'osm', sourceRef: c.ref });
      setStatus(id, 'published');
      created++;
    }
  }
});

const total = get<{ n: number }>("SELECT COUNT(*) AS n FROM fiches WHERE source = 'osm'")!.n;
console.log(`Terminé : ${created} créées, ${updated} mises à jour, ${skipped} revendiquées conservées · ${total} fiches OSM en base.`);
run('INSERT INTO audit (user_id, action, target) VALUES (NULL, ?, ?)', 'import-osm', `${created}+${updated}`);
