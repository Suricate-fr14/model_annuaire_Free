// Contenu éditorial des pages catégories, univers et villes : introduction, repères chiffrés, listes utiles
// (ouverts le dimanche, tôt le matin, tard le soir), guide et FAQ.
// Les chiffres et les noms viennent des fiches publiées (lib/insights) ; les textes de conseil des fichiers data/.
// Les formulations varient selon la page (empreinte du chemin), si bien que deux pages voisines ne se ressemblent pas.
import { all } from './db.ts';
import { insights, type Insights, type Named } from './insights.ts';
import { CATEGORY_TIPS } from '../data/categoryTips.ts';
import { CATEGORY_EXTRAS } from '../data/categoryExtras.ts';
import { CATEGORY_GUIDES } from '../data/categoryGuides.ts';
import { UNIVERSE_TIPS } from '../data/universeTips.ts';
import { UNIVERSE_GUIDES } from '../data/universeGuides.ts';
import { PLANS, euro, CITY } from '../config.ts';
import { categoryName, categoryUrlBySlug, universes } from './taxonomy.ts';
import { DAY_LABELS, fmtTime } from './hours.ts';

export interface Faq { q: string; a: string; link?: { href: string; label: string } }
export interface Item { href: string; label: string; note?: string }
export type Guide = [string, string, Item?];
export interface Block { h: string; p?: string; items?: Item[] }
export interface PageContent {
  intro: string[];
  factsTitle?: string;
  facts?: { value: string; label: string }[];
  blocks?: Block[];
  guideTitle?: string;
  /** Conseils : [intertitre, paragraphe, lien facultatif]. */
  guide?: Guide[];
  faq: Faq[];
  links?: Item[];
}

// --- outils ---

/** Empreinte stable d'une chaîne (choix des variantes par page). */
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const pick = <T>(arr: T[], seed: number, salt = 0) => arr[(seed + salt * 7919) % arr.length];
const fr = (n: number) => n.toLocaleString('fr-FR');
const nb = (n: number, one: string, many = `${one}s`) => `${fr(n)} ${n > 1 ? many : one}`;
const list = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pct = (n: number, d: number) => `${Math.round((n / d) * 100)} %`;
/** « un plombier » → « d'un plombier ». */
const of = (one: string) => (/^une? /.test(one) ? `d'${one}` : `de ${one}`);
const proFrom = () => euro(Math.round((PLANS.pro.year / 12) * 100) / 100);
const low = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const fmtH = (t: string) => fmtTime(t);
const day = (d: keyof typeof DAY_LABELS) => DAY_LABELS[d].toLowerCase();

/** Noms cités dans une réponse : « A (Ville, 7h), B et C ». */
const names = (l: Named[], n: number, withCity: boolean) => list(l.slice(0, n).map((x) => {
  const extra = [withCity ? x.city : '', x.note ?? ''].filter(Boolean).join(', ');
  return extra ? `${x.name} (${extra})` : x.name;
}));
const items = (l: Named[], n: number, withCity: boolean, note?: (x: Named) => string): Item[] =>
  l.slice(0, n).map((x) => ({ href: `/${x.slug}`, label: x.name, note: [note ? note(x) : x.note, withCity ? x.city : ''].filter(Boolean).join(' · ') }));
const firstOf = (total: number, shown: number, order: string) => (total > shown ? ` Les ${shown} premiers, ${order} :` : '');

/** Services signalés, avec la tournure à employer dans une question (« un restaurant avec terrasse »). */
const FEATURE_PHRASE: Record<string, string> = {
  terrasse: 'avec terrasse', accessible: 'accessible en fauteuil roulant', livraison: 'qui livre à domicile', emporter: 'avec vente à emporter',
  vegetarien: 'avec des plats végétariens', vegan: 'avec des options vegan', wifi: 'avec Wi-Fi', reservation: 'qui prend les réservations',
  domicile: 'qui se déplace à domicile', devis: 'qui fait des devis gratuits', parking: 'avec parking', animaux: 'qui accepte les animaux',
};

function proFaq(seed: number, scope: string): Faq {
  return {
    q: pick([
      `Comment faire apparaître mon activité ${scope} ?`,
      `Professionnel : comment être référencé ${scope} ?`,
      `Comment mettre en avant mon entreprise ${scope} ?`,
    ], seed, 5),
    a: pick([
      `La création d'une fiche est gratuite : nom, adresse, horaires et services. Avec la formule Pro (dès ${proFrom()} HT par mois), votre téléphone, votre site internet et vos photos sont affichés et votre fiche est référencée sur Google ; Premium la place en tête de liste, avec un visuel et un formulaire de demande de devis.`,
      `Créez ou revendiquez gratuitement votre fiche, puis choisissez la formule Pro (dès ${proFrom()} HT par mois) pour afficher vos coordonnées, votre site et vos photos et être référencé sur Google, ou Premium pour apparaître en tête de liste et recevoir des demandes de devis.`,
    ], seed, 6),
    link: { href: '/creer-ma-fiche', label: 'Créer ou revendiquer ma fiche' },
  };
}

/** Repères chiffrés communs. */
function facts(I: Insights, o: { communes?: boolean; categories?: number }) {
  const f: { value: string; label: string }[] = [{ value: fr(I.total), label: I.total > 1 ? 'fiches publiées' : 'fiche publiée' }];
  if (o.categories) f.push({ value: fr(o.categories), label: o.categories > 1 ? 'catégories' : 'catégorie' });
  if (o.communes && I.communes.length > 1) f.push({ value: fr(I.communes.length), label: 'communes' });
  if (I.known >= 3) {
    f.push({ value: fr(I.known), label: 'horaires renseignés' });
    f.push({ value: pct(I.sun, I.known), label: 'ouverts le dimanche' });
    if (I.early.length) f.push({ value: fr(I.early.length), label: 'ouvrent avant 8h' });
    if (I.late.length) f.push({ value: fr(I.late.length), label: 'ferment à 21h ou après' });
    if (I.closed[0]?.pct >= 15) f.push({ value: cap(day(I.closed[0].day)), label: `jour de fermeture le plus fréquent (${I.closed[0].pct} %)` });
  }
  if (I.claimed) f.push({ value: fr(I.claimed), label: 'gérées par le professionnel' });
  return f;
}

/** Semaine type : ouvertures par jour, jour de fermeture (et qui reste ouvert), heures habituelles, pause de midi, samedi, soirée. */
function weekText(I: Insights, withCity: boolean) {
  const W = I.week;
  if (I.known < 3) return '';
  const k = I.known;
  const est = (n: number) => nb(n, 'établissement');
  const verb = (n: number, one: string, many: string) => (n > 1 ? many : one);
  const out: string[] = [];
  const order: (keyof typeof W.open)[] = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'];
  out.push(`Sur les ${est(k)} dont les horaires sont connus, le nombre d'établissements ouverts varie selon le jour : ${list(order.map((d) => `${fr(W.open[d])} le ${day(d)}`))}.`);
  const top = I.closed[0];
  if (top && top.pct >= 10) {
    const openThatDay = W.openNames[top.day];
    out.push(`Le ${day(top.day)} est le jour de fermeture le plus fréquent en semaine (${top.pct} % des établissements)${openThatDay.length ? ` ; ${openThatDay.length > 1 ? 'restent notamment ouverts ce jour-là' : 'reste ouvert ce jour-là'} ${names(openThatDay, 5, withCity)}` : ''}.`);
  } else {
    out.push(`La grande majorité des établissements ouvrent du lundi au samedi, sans jour de fermeture dominant.`);
  }
  if (W.medOpen && W.medClose) {
    out.push(`En semaine, l'ouverture se fait habituellement vers ${fmtH(W.medOpen)} et la fermeture vers ${fmtH(W.medClose)} (heures médianes).`);
  }
  const lunch = [
    W.lunchBreak ? `${cap(est(W.lunchBreak))} ${verb(W.lunchBreak, 'ferme', 'ferment')} à l'heure du déjeuner${W.breakFrom && W.breakTo ? `, le plus souvent de ${fmtH(W.breakFrom)} à ${fmtH(W.breakTo)}` : ''}` : '',
    I.continuous ? `${W.lunchBreak ? fr(I.continuous) : est(I.continuous)} ${verb(I.continuous, 'reste ouvert', 'restent ouverts')} sans interruption entre 12h et 14h` : '',
  ].filter(Boolean);
  if (lunch.length) out.push(`${cap(lunch.join(' ; '))}.`);
  if (W.open.sa) out.push(`Le samedi, ${est(W.open.sa)} ${verb(W.open.sa, 'ouvre', 'ouvrent')}${W.satAfternoon ? `, dont ${fr(W.satAfternoon)} l'après-midi` : ', surtout le matin'}.`);
  if (W.evening) out.push(`${cap(est(W.evening))} ${verb(W.evening, 'reste ouvert', 'restent ouverts')} après 19h au moins un soir de semaine${W.always ? `, dont ${fr(W.always)} 24h/24` : ''}.`);
  out.push(`Les horaires peuvent changer pendant les vacances et les jours fériés : vérifiez la fiche avant de vous déplacer.`);
  return out.join(' ');
}

/** Blocs « ouverts le dimanche / tôt / tard / semaine type ». */
function hourBlocks(I: Insights, place: string, withCity: boolean, seed: number): Block[] {
  const b: Block[] = [];
  if (I.known < 3) return b;
  if (I.sun) {
    b.push({
      h: pick([`Ouverts le dimanche ${place}`, `Le dimanche ${place}`], seed, 20),
      p: `${cap(nb(I.sun, 'établissement'))} sur ${fr(I.known)} dont les horaires sont connus ${I.sun > 1 ? 'ouvrent' : 'ouvre'} le dimanche.${firstOf(I.sun, 12, 'par ordre alphabétique')}`,
      items: items(I.sunList, 12, withCity),
    });
  }
  if (I.early.length) b.push({ h: 'Ouverts tôt le matin', p: `Ouverture avant 8h au moins un jour de semaine.${firstOf(I.early.length, 10, 'du plus matinal au moins matinal')}`, items: items(I.early, 10, withCity, (x) => `dès ${x.note}`) });
  if (I.late.length) b.push({ h: 'Ouverts tard le soir', p: `Fermeture à 21h ou plus tard au moins un jour par semaine.${firstOf(I.late.length, 10, 'du plus tardif au moins tardif')}`, items: items(I.late, 10, withCity, (x) => `jusqu'à ${x.note}`) });
  const days = weekText(I, withCity);
  if (days) b.push({ h: pick(["Jours d'ouverture, horaires et pause de midi", 'Horaires : jours, heures et pause de midi'], seed, 21), p: days });
  return b;
}

/** Services : tournure d'une phrase selon le nombre d'établissements, et regroupement par thème. */
const v = (n: number, one: string, many: string) => (n > 1 ? many : one);
const FEATURE_TEXT: Record<string, (n: number) => string> = {
  terrasse: (n) => `${v(n, 'dispose', 'disposent')} d'une terrasse`,
  accessible: (n) => `${v(n, 'est signalé accessible', 'sont signalés accessibles')} aux personnes à mobilité réduite`,
  parking: (n) => `${v(n, 'dispose', 'disposent')} d'un parking`,
  wifi: (n) => `${v(n, 'propose', 'proposent')} le Wi-Fi`,
  clim: (n) => `${v(n, 'est climatisé', 'sont climatisés')}`,
  animaux: (n) => `${v(n, 'accepte', 'acceptent')} les animaux`,
  emporter: (n) => `${v(n, 'fait', 'font')} de la vente à emporter`,
  livraison: (n) => `${v(n, 'livre', 'livrent')} à domicile`,
  'click-collect': (n) => `${v(n, 'propose', 'proposent')} le click & collect`,
  reservation: (n) => `${v(n, 'prend', 'prennent')} les réservations`,
  rdv: (n) => `${v(n, 'reçoit', 'reçoivent')} sur rendez-vous`,
  domicile: (n) => `${v(n, 'intervient', 'interviennent')} à domicile`,
  devis: (n) => `${v(n, 'propose', 'proposent')} un devis gratuit`,
  vegetarien: (n) => `${v(n, 'propose', 'proposent')} des plats végétariens`,
  vegan: (n) => `${v(n, 'propose', 'proposent')} des options vegan`,
  cb: (n) => `${v(n, 'accepte', 'acceptent')} la carte bancaire`,
  'sans-contact': (n) => `${v(n, 'accepte', 'acceptent')} le paiement sans contact`,
  cheques: (n) => `${v(n, 'accepte', 'acceptent')} les chèques`,
};
const FEATURE_GROUPS: [string, string[]][] = [
  ['Sur place', ['terrasse', 'accessible', 'parking', 'wifi', 'clim', 'animaux']],
  ['Côté services', ['emporter', 'livraison', 'click-collect', 'reservation', 'rdv', 'domicile', 'devis']],
  ['Côté menu', ['vegetarien', 'vegan']],
  ['Pour le paiement', ['cb', 'sans-contact', 'cheques']],
];

function servicesText(I: Insights) {
  const by = new Map(I.features.map((f) => [f.key, f.n]));
  const sentences = FEATURE_GROUPS.map(([lead, keys]) => {
    const parts = keys.filter((k) => (by.get(k) ?? 0) >= 2).sort((a, b) => by.get(b)! - by.get(a)!)
      .map((k, i) => `${i === 0 ? nb(by.get(k)!, 'établissement') : fr(by.get(k)!)} ${FEATURE_TEXT[k](by.get(k)!)}`);
    return parts.length ? `${lead}, ${list(parts)}.` : '';
  }).filter(Boolean);
  if (!sentences.length) return '';
  return `D'après les informations renseignées sur les fiches : ${low(sentences.join(' '))} Un service non signalé n'est pas forcément absent : en cas de doute, renseignez-vous auprès de l'établissement.`;
}

/** Types de cuisine (issus des fiches) : tournure avec article. */
const CUISINE_ADJ = new Set(['italienne', 'française', 'régionale', 'japonaise', 'chinoise', 'indienne', 'asiatique', 'thaïlandaise', 'vietnamienne',
  'libanaise', 'mexicaine', 'marocaine', 'turque', 'coréenne', 'grecque', 'espagnole', 'portugaise', 'africaine', 'américaine', 'végétarienne', 'vegan']);
const CUISINE_NOUN: Record<string, string> = {
  pizzas: 'les pizzas', sushis: 'les sushis', burgers: 'les burgers', kebab: 'les kebabs', 'crêpes et galettes': 'les crêpes et galettes',
  'fruits de mer': 'les fruits de mer', sandwichs: 'les sandwichs', grillades: 'les grillades', 'coffee shop': 'les coffee shops', bagels: 'les bagels',
  tapas: 'les tapas', glaces: 'les glaces', poulet: 'le poulet', salades: 'les salades', brunch: 'le brunch', 'salon de thé': 'les salons de thé',
  pâtisseries: 'les pâtisseries', 'bubble tea': 'le bubble tea',
};
const cuisineName = (l: string) => (CUISINE_ADJ.has(l) ? `la cuisine ${l}` : CUISINE_NOUN[l] ?? '');
/** « les pizzas » → « des pizzas », « la cuisine thaï » → « de la cuisine thaï », « le brunch » → « du brunch ». */
const partitive = (s: string) => s.replace(/^les /, 'des ').replace(/^la /, 'de la ').replace(/^le /, 'du ');
const knownCuisines = (I: Insights) => I.cuisines.filter((c) => cuisineName(c.label));

function cuisineText(I: Insights) {
  const c = knownCuisines(I);
  if (c.length < 3) return '';
  const [first, ...rest] = c;
  const next = rest.slice(0, 4), after = rest.slice(4, 10);
  return [
    `Parmi les fiches qui précisent leur cuisine, ${cuisineName(first.label)} ${cuisineName(first.label).startsWith('les ') ? 'arrivent' : 'arrive'} en tête (${nb(first.n, 'établissement')}), devant ${list(next.map((x) => `${cuisineName(x.label)} (${x.n})`))}.`,
    after.length ? `On trouve aussi ${list(after.map((x) => `${partitive(cuisineName(x.label))} (${x.n})`))}.` : '',
  ].filter(Boolean).join(' ');
}

/** « rue Saint-Jean » → « la rue Saint-Jean ». */
function withArticle(street: string) {
  const w = street.split(' ')[0].toLowerCase();
  if (/^(rue|place|route|promenade|zone)$/.test(w)) return `la ${street}`;
  if (/^(avenue|allée|impasse|esplanade)$/.test(w)) return `l'${street}`;
  if (/^(za|zi)$/.test(w)) return `la ${street.replace(/^\w+/, (m) => m.toUpperCase())}`;
  return `le ${street}`;
}
const streetList = (I: Insights, n: number) => list(I.streets.slice(0, n).map((s, i) =>
  `${withArticle(s.street)}${I.communes.length > 1 ? ` à ${s.city}` : ''} (${i === 0 ? nb(s.n, 'fiche') : s.n})`));

/** Blocs « services / cuisines / rues ». */
function extraBlocks(I: Insights, o: { streets?: boolean; place: string }): Block[] {
  const b: Block[] = [];
  const services = servicesText(I);
  if (services) b.push({ h: 'Services signalés', p: services });
  const cuisines = cuisineText(I);
  if (cuisines) b.push({ h: 'Types de cuisine', p: cuisines });
  if (o.streets && I.streets.length >= 2) {
    b.push({ h: `Adresses les plus fréquentes ${o.place}`, p: `D'après les adresses des fiches, les voies qui reviennent le plus souvent sont ${streetList(I, 8)}.` });
  }
  return b;
}

// --- pages catégories ---

export function categoryContent(o: {
  slug: string; name: string; universe: string; universeName: string; total: number; citySlug: string; cityName?: string;
  cities: { city: string; city_slug: string; n: number }[];
}): PageContent {
  const [oneFull, tip] = CATEGORY_TIPS[o.slug] ?? ['un professionnel', ''];
  const one = oneFull.split(' ou ')[0];
  const fem = one.startsWith('une ');
  const noun = one.replace(/^une? /, '');
  const e = fem ? 'e' : '';
  const Quel = `Quel${fem ? 'le' : ''}`;
  const x = CATEGORY_EXTRAS[o.slug] ?? {};
  const seed = hash(`${o.slug}|${o.citySlug}`);
  const catMin = o.name.toLowerCase();
  const place = o.cityName ? `à ${o.cityName}` : `à ${CITY.area}`;
  const regional = o.universe === 'regional';
  const search = `/recherche?q=${encodeURIComponent(o.name.split(/ et |,/)[0])}&ouvert=1${o.citySlug ? `&ville=${o.citySlug}` : ''}`;
  const withCity = !o.cityName;

  if (!o.total) {
    return {
      intro: [`Aucune fiche n'est encore publiée dans la catégorie « ${o.name} » ${place}. Vous exercez dans ce domaine ? La création d'une fiche est gratuite.`],
      faq: regional ? [] : [proFaq(seed, 'dans cette catégorie')],
    };
  }
  const I = insights(`category = ?${o.citySlug ? ' AND city_slug = ?' : ''}`, o.citySlug ? [o.slug, o.citySlug] : [o.slug]);

  // Introduction
  const towns = withCity && o.cities.length > 1 ? o.cities.slice(0, 3).map((c) => c.city) : [];
  const p1 = pick([
    `L'annuaire des ${catMin} ${place} réunit ${nb(o.total, 'fiche')} avec adresse, horaires d'ouverture et itinéraire${towns.length ? `, principalement à ${list(towns)}` : ''}.`,
    `Vous cherchez ${one} ${place} ? Comparez ${nb(o.total, 'fiche')} : horaires d'ouverture, adresses, itinéraires${towns.length ? `, à ${list(towns)} et dans les communes voisines` : ''}.`,
    `${cap(nb(o.total, 'fiche'))} dans la catégorie « ${o.name} » ${place} : horaires, adresses et accès${towns.length ? `, de ${list(towns)}` : ''}, mis à jour par l'équipe de l'annuaire et par les professionnels eux-mêmes.`,
  ], seed);
  const p2 = x.subs?.length ? pick([
    `Les recherches les plus fréquentes portent sur : ${list(x.subs.slice(0, 6))}.`,
    `On y trouve notamment : ${list(x.subs.slice(0, 6))}.`,
    `Spécialités et services recherchés : ${list(x.subs.slice(0, 6))}.`,
  ], seed, 1) : '';
  const p3 = I.known >= 3
    ? `D'après les horaires renseignés sur ${nb(I.known, 'fiche')}, ${nb(I.sun, 'établissement')} ${I.sun > 1 ? 'ouvrent' : 'ouvre'} le dimanche${I.early.length ? ` et ${fr(I.early.length)} avant 8h en semaine` : ''}${I.closed[0]?.pct >= 15 ? ` ; le jour de fermeture le plus courant est le ${day(I.closed[0].day)}` : ''}. Le détail figure sous la liste.`
    : '';
  const intro = [p1, [p2, p3].filter(Boolean).join(' ')].filter(Boolean);

  // Repères et listes
  const blocks = [...hourBlocks(I, place, withCity, seed), ...extraBlocks(I, { streets: true, place })];
  if (withCity && o.cities.length > 1) {
    blocks.push({
      h: `${o.name} par commune`,
      items: o.cities.slice(0, 24).map((c) => ({ href: `${categoryUrlBySlug(o.slug)}?ville=${c.city_slug}`, label: c.city, note: nb(c.n, 'fiche') })),
    });
  }

  // Guide
  const guide: Guide[] = [];
  if (tip && !regional) guide.push([pick(['Bien choisir', 'Les bons réflexes', 'Avant de vous décider'], seed, 3), tip]);
  guide.push(...(CATEGORY_GUIDES[o.slug] ?? []));

  // FAQ
  const faq: Faq[] = [];
  if (I.known >= 3) {
    faq.push({
      q: pick([`${Quel} ${noun} est ouvert${e} le dimanche ${place} ?`, `Où trouver ${one} ouvert${e} le dimanche ${place} ?`], seed, 10),
      a: I.sun
        ? `D'après les horaires renseignés, ${nb(I.sun, 'établissement')} sur ${fr(I.known)} ${I.sun > 1 ? 'ouvrent' : 'ouvre'} le dimanche, dont ${names(I.sunList, 5, withCity)}. Vérifiez la fiche avant de vous déplacer : les horaires changent pendant les vacances et les jours fériés.`
        : `Aucun des ${nb(I.known, 'établissement')} dont les horaires sont renseignés n'ouvre le dimanche ${place}. Élargissez la recherche aux communes voisines.`,
      link: { href: search, label: 'Voir les établissements ouverts maintenant' },
    });
  }
  if (I.early.length) {
    faq.push({
      q: pick([`${Quel} ${noun} ouvre le plus tôt ${place} ?`, `Où trouver ${one} ouvert${e} tôt le matin ${place} ?`], seed, 13),
      a: `Les plus matinaux, d'après leurs horaires de semaine : ${names(I.early, 5, withCity)}.`,
    });
  }
  if (I.late.length) {
    faq.push({
      q: pick([`${Quel} ${noun} ferme le plus tard ${place} ?`, `Où trouver ${one} ouvert${e} tard le soir ${place} ?`], seed, 14),
      a: `Les fermetures les plus tardives : ${names(I.late, 5, withCity)}.`,
    });
  }
  if (I.known >= 5 && I.closed[0]?.pct >= 15) {
    const c = I.closed.slice(0, 2);
    faq.push({
      q: pick([`Quel jour ${one} est-${fem ? 'elle' : 'il'} fermé${e} ${place} ?`, `Quel est le jour de fermeture habituel ${of(one)} ${place} ?`], seed, 15),
      a: `Le ${day(c[0].day)} est le jour de fermeture le plus fréquent : ${c[0].pct} % des établissements aux horaires connus sont fermés ce jour-là${c[1]?.pct >= 10 ? `, ${c[1].pct} % le ${day(c[1].day)}` : ''}. Le dimanche, ${I.sunClosedPct} % sont fermés.`,
    });
  }
  const feat = I.features.find((f) => f.n >= 2 && FEATURE_PHRASE[f.key]);
  if (feat) {
    faq.push({
      q: `Où trouver ${one} ${FEATURE_PHRASE[feat.key]} ${place} ?`,
      a: `${cap(nb(feat.n, 'fiche'))} ${feat.n > 1 ? 'signalent' : 'signale'} ce service (« ${feat.label} »), dont ${names(feat.examples, 5, withCity)}.`,
    });
  }
  if (knownCuisines(I).length >= 3) {
    faq.push({
      q: pick([`Quels types de cuisine dans la catégorie « ${o.name} » ${place} ?`, `Quelles cuisines sont les plus représentées ${place} ?`], seed, 16),
      a: cuisineText(I),
    });
  }
  const extras: Faq[] = [];
  if (x.vs) extras.push({ q: x.vs[0], a: x.vs[1] });
  if (x.cost) extras.push({ q: pick([`Combien coûte ${oneFull} ${place} ?`, `Comment sont fixés les tarifs ${of(oneFull)} ?`, `Quel budget prévoir pour ${oneFull} ?`], seed, 4), a: x.cost });
  if (x.refund) extras.push({ q: pick([`Les consultations ${of(oneFull)} sont-elles remboursées ?`, `Quelle prise en charge pour une consultation ${of(oneFull)} ?`], seed, 8), a: x.refund });
  const fill = (t: string) => t.replace('{one}', oneFull).replace('{place}', place);
  if (x.urgent) extras.push({ q: fill(pick(x.urgentQ ?? [`Besoin ${of(oneFull)} en urgence : que faire ?`, `Comment trouver ${oneFull} rapidement ${place} ?`], seed, 9)), a: x.urgent, link: { href: search, label: 'Voir les établissements ouverts maintenant' } });
  extras.sort((a, b) => hash(a.q + seed) - hash(b.q + seed));
  faq.push(...extras.slice(0, 3));

  if (withCity && o.cities.length > 1) {
    faq.push({
      q: pick([`Dans quelles communes trouver ${one} ?`, `Où trouver ${one} autour de ${CITY.name} ?`, `Quelles communes comptent le plus de fiches « ${o.name} » ?`], seed, 12),
      a: `Les ${nb(o.total, 'fiche')} de cette catégorie se répartissent entre ${nb(o.cities.length, 'commune')}, principalement ${list(o.cities.slice(0, 6).map((c) => `${c.city} (${c.n})`))}. Le filtre par commune, en haut de la liste, affiche les établissements d'une ville en particulier.`,
    });
  } else if (o.cityName) {
    const st = I.streets.slice(0, 3);
    faq.push({
      q: pick([`Combien de fiches « ${o.name} » à ${o.cityName} ?`, `Où trouver ${one} à ${o.cityName} ?`], seed, 12),
      a: `L'annuaire compte ${nb(o.total, 'fiche')} dans cette catégorie à ${o.cityName}${st.length ? `, notamment ${list(st.map((s) => `${withArticle(s.street)} (${s.n})`))}` : ''}. Retirez le filtre de commune pour élargir à ${CITY.area}.`,
    });
  }
  if (!regional) faq.push(proFaq(seed, 'dans cette catégorie'));

  return {
    intro,
    factsTitle: `${o.name} ${place} en chiffres`,
    facts: o.total >= 3 ? facts(I, { communes: withCity }) : [],
    blocks,
    guideTitle: guide.length ? `Nos conseils : bien choisir ${one} ${place}` : undefined,
    guide,
    faq,
  };
}

/** Chiffres réels d'une catégorie, en une phrase (pages univers). */
function categoryFacts(slug: string, count: number) {
  const I = insights('category = ?', [slug]);
  const out = [`L'annuaire en recense ${fr(count)} à ${CITY.area}${I.communes.length > 1 ? `, dans ${nb(I.communes.length, 'commune')}` : ''}.`];
  if (I.known >= 3) {
    const closed = I.closed[0]?.pct >= 15 ? ` et le jour de fermeture le plus courant est le ${day(I.closed[0].day)}` : '';
    out.push(`D'après les horaires connus, ${pct(I.sun, I.known)} ouvrent le dimanche${closed}.`);
  }
  const cu = knownCuisines(I);
  if (cu.length >= 3) out.push(`Parmi les cuisines indiquées, ${list(cu.slice(0, 3).map((c) => cuisineName(c.label)))} reviennent le plus souvent.`);
  return out.join(' ');
}

// --- pages univers ---

export function universeContent(u: { slug: string; name: string; description: string; count: number; categories: { slug: string; name: string; count: number }[] }): PageContent {
  const seed = hash(`u|${u.slug}`);
  const filled = u.categories.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
  if (!u.count) return { intro: [u.description], faq: [] };
  const cats = filled.map((c) => c.slug);
  const I = insights(`category IN (${cats.map(() => '?').join(',')})`, cats);
  const top = filled.slice(0, 4).map((c) => `${c.name.toLowerCase()} (${c.count})`);
  const regional = u.slug === 'regional';
  const intro = [
    pick([
      `${u.name} à ${CITY.area} : ${nb(u.count, 'fiche')} réparties dans ${nb(filled.length, 'catégorie')}, notamment ${list(top)}.`,
      `L'univers « ${u.name} » de l'annuaire regroupe ${nb(u.count, 'professionnel')} ${CITY.of} et alentour, en ${nb(filled.length, 'catégorie')} : ${list(top)}…`,
    ], seed),
    [
      UNIVERSE_TIPS[u.slug],
      I.communes.length > 1 ? `Communes les mieux représentées : ${list(I.communes.slice(0, 4).map((c) => c.city))}.` : '',
      I.known >= 5 ? `${cap(nb(I.sun, 'établissement'))} sur ${fr(I.known)} aux horaires connus ${I.sun > 1 ? 'ouvrent' : 'ouvre'} le dimanche.` : '',
    ].filter(Boolean).join(' '),
  ];

  const blocks: Block[] = [];
  if (I.communes.length > 1) {
    blocks.push({
      h: 'Par commune',
      items: I.communes.slice(0, 16).map((c) => ({ href: `/ville/${c.city_slug}?univers=${u.slug}`, label: c.city, note: nb(c.n, 'fiche') })),
    });
  }
  blocks.push(...hourBlocks(I, `à ${CITY.area}`, true, seed), ...extraBlocks(I, { place: '' }));

  const guide: Guide[] = [];
  if (!regional) {
    guide.push(...(UNIVERSE_GUIDES[u.slug] ?? (UNIVERSE_TIPS[u.slug] ? [['Les bons réflexes', UNIVERSE_TIPS[u.slug]] as Guide] : [])));
    // Puis chaque catégorie : conseil du métier, repère réglementaire, chiffres réels et lien vers la catégorie.
    for (const c of filled.slice(0, 10)) {
      const tip = CATEGORY_TIPS[c.slug]?.[1];
      if (!tip) continue;
      const extra = CATEGORY_GUIDES[c.slug]?.[0]?.[1] ?? CATEGORY_EXTRAS[c.slug]?.cost ?? '';
      guide.push([c.name, [tip, extra, categoryFacts(c.slug, c.count)].filter(Boolean).join(' '),
        { href: categoryUrlBySlug(c.slug), label: `Voir ${c.count > 1 ? `les ${fr(c.count)} fiches` : 'la fiche'} « ${c.name} »` }]);
    }
  }

  const faq: Faq[] = [];
  faq.push({
    q: pick([`Quels professionnels trouve-t-on dans l'univers « ${u.name} » ?`, `Quelles catégories regroupe « ${u.name} » ?`], seed, 1),
    a: `Les catégories les plus fournies sont ${list(filled.slice(0, 6).map((c) => `${c.name.toLowerCase()} (${c.count})`))}. Chaque catégorie a sa propre page, filtrable par commune.`,
  });
  if (I.communes.length > 1) {
    faq.push({
      q: pick([`Dans quelles communes ces professionnels sont-ils installés ?`, `Où trouver ces professionnels autour de ${CITY.name} ?`], seed, 3),
      a: `Ils se répartissent entre ${nb(I.communes.length, 'commune')}, principalement ${list(I.communes.slice(0, 6).map((c) => `${c.city} (${c.n})`))}.`,
    });
  }
  if (I.known >= 5) {
    faq.push({
      q: pick([`Lesquels sont ouverts le dimanche ?`, `Peut-on trouver des établissements ouverts le dimanche ?`], seed, 4),
      a: I.sun
        ? `Oui : ${nb(I.sun, 'établissement')} sur ${fr(I.known)} aux horaires connus ${I.sun > 1 ? 'ouvrent' : 'ouvre'} le dimanche, dont ${names(I.sunList, 5, true)}.`
        : `Aucun des ${nb(I.known, 'établissement')} aux horaires connus n'ouvre le dimanche.`,
    });
  }
  if (I.early.length) faq.push({ q: 'Lesquels ouvrent tôt le matin ?', a: `Les plus matinaux en semaine : ${names(I.early, 5, true)}.` });
  if (I.late.length) faq.push({ q: 'Lesquels ferment tard le soir ?', a: `Les fermetures les plus tardives : ${names(I.late, 5, true)}.` });
  if (!regional) faq.push(proFaq(seed, `dans « ${u.name} »`));

  return {
    intro,
    factsTitle: `${u.name} à ${CITY.area} en chiffres`,
    facts: facts(I, { communes: true, categories: filled.length }),
    blocks,
    guideTitle: guide.length ? `Nos conseils : ${u.name.toLowerCase()} à ${CITY.area}` : undefined,
    guide,
    faq,
  };
}

// --- pages villes ---

/** Communes voisines : centre des fiches de chaque commune, puis les plus proches. */
export function nearbyCities(citySlug: string, n = 5) {
  const rows = all<{ city: string; city_slug: string; lat: number; lng: number; c: number }>(
    "SELECT city, city_slug, AVG(lat) lat, AVG(lng) lng, COUNT(*) c FROM fiches WHERE status = 'published' AND lat IS NOT NULL AND city_slug <> '' GROUP BY city_slug");
  const me = rows.find((r) => r.city_slug === citySlug);
  if (!me) return [];
  return rows.filter((r) => r.city_slug !== citySlug)
    .map((r) => ({ ...r, d: Math.hypot(r.lat - me.lat, (r.lng - me.lng) * 0.66) }))
    .sort((a, b) => a.d - b.d).slice(0, n);
}

export function cityContent(c: { city: string; city_slug: string; n: number }): PageContent {
  const seed = hash(`v|${c.city_slug}`);
  const I = insights('city_slug = ?', [c.city_slug]);
  const cats = all<{ category: string; n: number }>(
    "SELECT category, COUNT(*) n FROM fiches WHERE status = 'published' AND city_slug = ? GROUP BY category ORDER BY n DESC", c.city_slug);
  const uniCount = new Map<string, { slug: string; name: string; n: number }>();
  for (const k of cats) {
    const u = universes.find((x) => x.categories.some((y) => y.slug === k.category));
    if (!u) continue;
    const v = uniCount.get(u.slug) ?? { slug: u.slug, name: u.name, n: 0 };
    v.n += k.n; uniCount.set(u.slug, v);
  }
  const unis = [...uniCount.values()].sort((a, b) => b.n - a.n);
  const near = nearbyCities(c.city_slug, 8);
  const topCats = cats.slice(0, 6).map((k) => `${categoryName(k.category).toLowerCase()} (${k.n})`);
  const place = `à ${c.city}`;

  const intro = [
    pick([
      `Entreprises, commerces et services ${place} : ${nb(c.n, 'fiche')} dans l'annuaire, avec horaires d'ouverture, adresses et itinéraires${I.postcodes.length ? ` (${I.postcodes.length > 1 ? 'codes postaux' : 'code postal'} ${list(I.postcodes.slice(0, 4))})` : ''}.`,
      `Trouvez un professionnel ${place} parmi ${nb(c.n, 'fiche')} : horaires, adresses, itinéraires et coordonnées des fiches Pro et Premium.`,
      `${cap(nb(c.n, 'établissement'))} de ${c.city} sont référencés dans l'annuaire : commerces, artisans, santé, services et loisirs.`,
    ], seed),
    [
      unis.length ? `Les domaines les plus représentés sont ${list(unis.slice(0, 3).map((u) => u.name.toLowerCase()))}, et les catégories les plus fournies ${list(topCats.slice(0, 4))}.` : '',
      I.known >= 5 ? `${cap(nb(I.sun, 'établissement'))} sur ${fr(I.known)} aux horaires connus ${I.sun > 1 ? 'ouvrent' : 'ouvre'} le dimanche.` : '',
      near.length ? `Communes voisines : ${list(near.slice(0, 4).map((x) => x.city))}.` : '',
    ].filter(Boolean).join(' '),
  ].filter(Boolean);

  const blocks: Block[] = [];
  if (unis.length > 1) {
    blocks.push({ h: `${c.city} par domaine`, items: unis.map((u) => ({ href: `/ville/${c.city_slug}?univers=${u.slug}`, label: u.name, note: nb(u.n, 'fiche') })) });
  }
  if (cats.length > 1) {
    blocks.push({ h: `Toutes les catégories ${place}`, items: cats.slice(0, 48).map((k) => ({ href: `${categoryUrlBySlug(k.category)}?ville=${c.city_slug}`, label: categoryName(k.category), note: fr(k.n) })) });
  }
  blocks.push(...hourBlocks(I, place, false, seed), ...extraBlocks(I, { streets: true, place }));

  const faq: Faq[] = [];
  if (topCats.length) {
    faq.push({
      q: pick([`Quels commerces et services trouve-t-on ${place} ?`, `Quels professionnels sont installés ${place} ?`, `Quelles sont les activités les plus présentes ${place} ?`], seed, 1),
      a: `L'annuaire compte ${nb(c.n, 'fiche')} ${place}, réparties dans ${nb(cats.length, 'catégorie')}. Les plus représentées sont ${list(topCats)}. Chaque catégorie peut être consultée pour ${c.city} seule, depuis les raccourcis en haut de page.`,
    });
  }
  if (I.known >= 3) {
    faq.push({
      q: pick([`Quels établissements sont ouverts le dimanche ${place} ?`, `Des commerces sont-ils ouverts le dimanche ${place} ?`], seed, 2),
      a: I.sun
        ? `D'après les horaires renseignés sur ${nb(I.known, 'fiche')}, ${nb(I.sun, 'établissement')} ${I.sun > 1 ? 'ouvrent' : 'ouvre'} le dimanche, dont ${names(I.sunList, 6, false)}. Les horaires varient pendant les vacances et les jours fériés : vérifiez la fiche avant de vous déplacer.`
        : `Aucun des ${nb(I.known, 'établissement')} aux horaires connus n'ouvre le dimanche.`,
      link: { href: `/recherche?ville=${c.city_slug}&ouvert=1`, label: `Ouverts maintenant ${place}` },
    });
  }
  if (I.early.length) faq.push({ q: pick([`Que trouver d'ouvert tôt le matin ${place} ?`, `Quels commerces ouvrent avant 8h ${place} ?`], seed, 6), a: `${cap(nb(I.early.length, 'établissement'))} ${I.early.length > 1 ? 'ouvrent' : 'ouvre'} avant 8h en semaine, notamment ${names(I.early, 6, false)}.` });
  if (I.late.length) faq.push({ q: pick([`Que trouver d'ouvert tard le soir ${place} ?`, `Quels établissements ferment à 21h ou plus tard ${place} ?`], seed, 7), a: `${cap(nb(I.late.length, 'établissement'))} ${I.late.length > 1 ? 'ferment' : 'ferme'} à 21h ou plus tard, notamment ${names(I.late, 6, false)}.` });
  if (I.streets.length >= 3) {
    faq.push({
      q: pick([`Quelles rues de ${c.city} concentrent le plus de commerces et services ?`, `Où se concentrent les commerces ${place} ?`], seed, 8),
      a: `D'après les adresses des fiches, les voies qui reviennent le plus souvent sont ${streetList(I, 6)}.`,
    });
  }
  if (near.length) {
    faq.push({
      q: pick([`Comment trouver un professionnel près de ${c.city} ?`, `Quelles communes voisines consulter autour de ${c.city} ?`], seed, 3),
      a: `Élargissez votre recherche aux communes voisines : ${list(near.slice(0, 6).map((x) => `${x.city} (${nb(x.c, 'fiche')})`))}.`,
    });
  }
  faq.push(proFaq(seed, place));

  return {
    intro,
    factsTitle: `${c.city} en chiffres`,
    facts: facts(I, { categories: cats.length }),
    blocks,
    faq,
    links: near.map((x) => ({ href: `/ville/${x.city_slug}`, label: x.city })),
  };
}

/** Données structurées FAQPage (schema.org). */
export const faqGraph = (url: string, faq: Faq[]) => (faq.length ? [{
  '@type': 'FAQPage', '@id': `${url}#faq`, url,
  mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}] : []);
