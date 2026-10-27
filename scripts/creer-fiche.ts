// Crée (ou met à jour, si elle existe déjà) une fiche complète à partir d'un fichier JSON, la publie,
// la rattache à un compte et peut lui offrir une formule Pro ou Premium.
//
// Usage (faire une sauvegarde avant : npm run -s db:backup) :
//   npm run db:fiche -- scripts/fiches/les-conquerants-ifs.json               aperçu, rien n'est modifié
//   npm run db:fiche -- scripts/fiches/les-conquerants-ifs.json --appliquer   enregistre
// Option : --id 123 pour viser une fiche existante précise (si plusieurs fiches correspondent).
//
// Format du JSON : { match?: { city_slugs: [...], name_like }, owner_email?, plan?: 'pro' | 'premium', days?, rename?, fiche: { ...champs } }
// Une fiche existante garde son nom (donc son adresse web) sauf si « rename » vaut true.
// Le compte du propriétaire doit exister (inscription sur le site). Coordonnées GPS : géocodées depuis l'adresse si absentes.
import { readFileSync } from 'node:fs';
import { all, get, run, tx } from '../src/lib/db.ts';
import { createFiche, updateFiche, getFiche, type FicheInput } from '../src/lib/fiches.ts';
import { categoryExists } from '../src/lib/taxonomy.ts';
import { geocode } from '../src/lib/geo.ts';
import { giveFormula } from '../src/lib/formula.ts';

const args = process.argv.slice(2);
const file = args.find((a) => a.endsWith('.json'));
const apply = args.includes('--appliquer');
const forcedId = Number(args[args.indexOf('--id') + 1]) || 0;
if (!file) { console.error('Indiquez le fichier JSON de la fiche.'); process.exit(1); }

const spec = JSON.parse(readFileSync(file, 'utf8'));
const f = spec.fiche;
if (!categoryExists(f.category)) { console.error(`Catégorie inconnue : ${f.category}`); process.exit(1); }

const owner = spec.owner_email ? get<{ id: number; email: string }>('SELECT id, email FROM users WHERE email = ? COLLATE NOCASE', spec.owner_email) : null;
if (spec.owner_email && !owner) {
  console.error(`Aucun compte pour ${spec.owner_email} : créez-le d'abord (page /inscription), puis relancez.`);
  process.exit(1);
}

// Fiche existante (import OpenStreetMap, par exemple) : mise à jour plutôt que doublon.
let existing = forcedId ? [{ id: forcedId, name: getFiche(forcedId)?.name ?? '?', status: '' }] : [];
if (!forcedId && spec.match) {
  existing = all<{ id: number; name: string; status: string }>(
    `SELECT id, name, status FROM fiches WHERE city_slug IN (${spec.match.city_slugs.map(() => '?').join(',')}) AND name LIKE ? ORDER BY id`,
    ...spec.match.city_slugs, spec.match.name_like);
}
if (existing.length > 1) {
  console.error('Plusieurs fiches correspondent, relancez avec --id :');
  for (const e of existing) console.error(`  --id ${e.id}  ${e.name} (${e.status})`);
  process.exit(1);
}

if (f.lat == null || f.lng == null) {
  const g = await geocode(`${f.street} ${f.postcode} ${f.city}`);
  if (g) { f.lat = g.lat; f.lng = g.lng; } else console.warn('Géocodage impossible : coordonnées GPS actuelles conservées, ou fiche sans carte si elle est nouvelle.');
}

const input: FicheInput = {
  logo: '', photos: [], videos: [], banner: '', socials: {}, features: [], hours_note: '', email: '', siret: '',
  seo_title: '', seo_description: '', leads_enabled: false, news_title: '', news_text: '', news_link: '', news_until: '', price_from: '',
  founded: '', area_served: '', credentials: '', languages: [],
  ...f,
} as FicheInput;

const target = existing[0];
if (target && !spec.rename) input.name = target.name;
console.log(target ? `Mise à jour de la fiche #${target.id} (${target.name})` : 'Création d\'une nouvelle fiche');
console.log(`  ${input.name} · ${input.category} · ${input.street}, ${input.postcode} ${input.city} · GPS ${input.lat ?? '—'}, ${input.lng ?? '—'}`);
console.log(`  Propriétaire : ${owner?.email ?? 'aucun'} · Formule : ${spec.plan || 'aucune'}${spec.plan ? ` offerte ${spec.days ? `${spec.days} jours` : 'sans limite'}` : ''}`);
if (!apply) { console.log('\nAperçu seulement. Pour enregistrer : ajoutez --appliquer (après npm run -s db:backup).'); process.exit(0); }

const result = tx(() => {
  let id: number, slug: string;
  if (target) {
    id = target.id;
    // Conserve logo, photos, vidéos et bannière déjà présents si le JSON n'en fournit pas.
    const cur = getFiche(id)!;
    for (const k of ['logo', 'banner'] as const) if (!f[k]) (input as any)[k] = cur[k];
    for (const k of ['photos', 'videos'] as const) if (!f[k]?.length) (input as any)[k] = cur[k];
    if (input.lat == null || input.lng == null) { input.lat = cur.lat; input.lng = cur.lng; }
    slug = updateFiche(id, input);
    run("UPDATE fiches SET status = 'published', reject_reason = '', published_at = COALESCE(published_at, ?) WHERE id = ?", new Date().toISOString(), id);
  } else {
    ({ id, slug } = createFiche(input, { ownerId: null, status: 'published', source: 'admin' }));
  }
  if (owner) run('UPDATE fiches SET owner_id = ? WHERE id = ?', owner.id, id);
  return { id, slug };
});
// Formule offerte (lib/formula.ts) : « days » = durée en jours, 0 ou absent avec « plan » = sans limite.
if (spec.plan === 'pro' || spec.plan === 'premium') {
  await giveFormula(result.id, spec.plan, spec.days ? new Date(Date.now() + spec.days * 864e5).toISOString() : null);
}
console.log(`\nEnregistré : fiche #${result.id} → /${result.slug}`);
