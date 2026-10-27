// Bilan mensuel par email aux pros (fiches Pro et Premium). À planifier le 1er de chaque mois.
// Usage : npm run -s bilan:mensuel                        envoie le bilan du mois écoulé
//         npm run -s bilan:mensuel -- --apercu            affiche les emails sans les envoyer
//         npm run -s bilan:mensuel -- --mois=2026-10      choisit le mois ; --force renvoie même si déjà envoyé
import { db } from '../src/lib/db.ts';
import { sendMonthlyReports, lastMonth } from '../src/lib/report.ts';

db();
const args = process.argv.slice(2);
const month = args.find((a) => a.startsWith('--mois='))?.slice(7) ?? lastMonth();
if (!/^\d{4}-\d{2}$/.test(month)) { console.error('Mois invalide (format AAAA-MM).'); process.exit(1); }
const r = await sendMonthlyReports(month, { dryRun: args.includes('--apercu'), force: args.includes('--force') });
if (!args.includes('--apercu')) console.log(`Bilan ${month} : ${r.sent} email(s) envoyé(s), ${r.skipped} déjà envoyé(s).`);
