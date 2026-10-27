// Renvoie vers Axonaut les paiements Stripe en attente ou en erreur (ex. après avoir renseigné AXONAUT_API_KEY).
// Usage : npm run billing:retry   (peut être planifié, par exemple chaque nuit)
import { db } from '../src/lib/db.ts';
import { retryAll } from '../src/lib/billing.ts';

db();
const r = await retryAll();
if ('noKey' in r && r.noKey) {
  console.log(`AXONAUT_API_KEY absente : ${r.total} paiement(s) restent en attente.`);
} else {
  console.log(`${r.ok} facture(s) créée(s) dans Axonaut sur ${r.total} en attente.`);
  if (r.ok < r.total) process.exitCode = 1;
}
