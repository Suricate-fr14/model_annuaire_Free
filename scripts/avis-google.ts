// Met à jour les avis Google des fiches (DataForSEO) : fiches jamais récupérées ou mises à jour il y a plus de 30 jours (fiches Pro et Premium).
// À planifier une fois par jour (seules les fiches dues sont interrogées, donc facturées).
// Usage : npm run -s avis:google                 met à jour les fiches dues
//         npm run -s avis:google -- --forcer     toutes les fiches suivies
//         npm run -s avis:google -- --fiche=12   une seule fiche
import { db, run } from '../src/lib/db.ts';
import { reviewsEnabled, dueForRefresh, postReviewsTask, collectReviewsTask, readyTaskIds, getGoogleReviews } from '../src/lib/googleReviews.ts';

db();
if (!reviewsEnabled()) { console.error('DATAFORSEO_LOGIN et DATAFORSEO_PASSWORD manquants dans le .env.'); process.exit(1); }
const args = process.argv.slice(2);
const only = Number(args.find((a) => a.startsWith('--fiche='))?.slice(8)) || 0;
const rows = dueForRefresh(args.includes('--forcer') || only > 0).filter((r) => !only || r.fiche_id === only);
if (!rows.length) { console.log('Aucune fiche à mettre à jour.'); process.exit(0); }

const pending = new Set<number>();
// Une tâche restée sans résultat lors d'un passage précédent est relancée.
for (const r of rows) {
  try {
    await postReviewsTask(r.fiche_id);
    pending.add(r.fiche_id);
  } catch (e) {
    run('UPDATE google_reviews SET status = ? WHERE fiche_id = ?', `Erreur : ${(e as Error).message}`, r.fiche_id);
    console.log(`Fiche ${r.fiche_id} : ${(e as Error).message}`);
  }
}

// Attente des résultats (15 minutes au plus ; les tâches restantes seront relevées au prochain passage).
const end = Date.now() + 15 * 60_000;
while (pending.size && Date.now() < end) {
  await new Promise((res) => setTimeout(res, 20_000));
  const ready = await readyTaskIds().catch(() => new Set<string>());
  for (const id of [...pending]) {
    try {
      if (await collectReviewsTask(id, ready)) {
        pending.delete(id);
        const g = getGoogleReviews(id);
        console.log(`Fiche ${id} : ${g?.status === 'ok' ? `${g.rating ?? '—'} / 5, ${g.count} avis, ${g.reviews.length} affichés` : g?.status}`);
      }
    } catch (e) {
      console.log(`Fiche ${id} : ${(e as Error).message}`);
    }
  }
}
if (pending.size) console.log(`${pending.size} fiche(s) sans résultat après 15 minutes : relancées au prochain passage.`);
