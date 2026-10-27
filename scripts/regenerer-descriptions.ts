// Régénère l'accroche et la présentation des fiches importées (OpenStreetMap), gratuites et non revendiquées :
// catégorie, adresse, horaires d'ouverture (et téléphone en option) rédigés en phrases, différentes d'une fiche à l'autre.
//
// Usage (faire une sauvegarde avant : npm run -s db:backup) :
//   npm run db:descriptions                    aperçu, rien n'est modifié
//   npm run db:descriptions -- --appliquer     enregistre
// Options : --telephone (ajoute le numéro dans la présentation : il redevient alors visible sur les fiches gratuites)
//           --toutes    (inclut aussi les fiches non revendiquées créées dans l'admin)
import { all, run, tx } from '../src/lib/db.ts';
import { parseFiche, CERTIFIED_SQL } from '../src/lib/fiches.ts';
import { autoTexts } from '../src/lib/autoText.ts';

const args = new Set(process.argv.slice(2));
const apply = args.has('--appliquer');
const phone = args.has('--telephone');
const sources = args.has('--toutes') ? "source IN ('osm', 'admin')" : "source = 'osm'";

const rows = all(`SELECT * FROM fiches WHERE ${sources} AND owner_id IS NULL AND NOT ${CERTIFIED_SQL} ORDER BY id`).map(parseFiche);
console.log(`${rows.length} fiche(s) concernée(s) (importées, gratuites, non revendiquées)${phone ? ', avec téléphone' : ''}.\n`);

const out = rows.map((f) => ({ f, t: autoTexts(f, { phone }) }));
for (const { f, t } of out.slice(0, 5)) {
  console.log(`#${f.id} ${f.name}`);
  console.log(`  Accroche : ${t.short_desc}`);
  console.log(`  Présentation : ${t.description.replace(/\n+/g, ' / ')}\n`);
}

if (!apply) {
  console.log('Aperçu seulement. Pour enregistrer : ajoutez --appliquer (après npm run -s db:backup).');
} else {
  tx(() => {
    for (const { f, t } of out) {
      run("UPDATE fiches SET short_desc = ?, description = ?, updated_at = datetime('now') WHERE id = ?", t.short_desc, t.description, f.id);
    }
  });
  console.log(`${out.length} fiche(s) mise(s) à jour.`);
}
