// Relances automatiques par fiche (lib/lifecycle.ts) : fiche à compléter, formule choisie non payée, formule offerte
// qui se termine, actualité terminée. À planifier une fois par jour.
// Usage : npm run -s emails:relances               envoie les relances dues
//         npm run -s emails:relances -- --apercu   affiche les emails sans les envoyer
import { db } from '../src/lib/db.ts';
import { sendReminders } from '../src/lib/lifecycle.ts';

db();
const dryRun = process.argv.includes('--apercu');
const n = await sendReminders({ dryRun });
console.log(dryRun ? `Aperçu : ${n} relance(s) due(s).` : `${n} relance(s) envoyée(s).`);
