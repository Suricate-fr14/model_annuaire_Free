// Sauvegarde à chaud de la base SQLite (copie cohérente même site en ligne) dans data/backups/.
// Usage : npm run db:backup            (conserve les 14 dernières sauvegardes)
//         npm run db:backup -- --keep 30
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

const dbPath = process.env.DATABASE_PATH || './data/annuaire.db';
const dir = join(dirname(dbPath), 'backups');
const i = process.argv.indexOf('--keep');
const keep = Math.max(1, Number(i > 0 ? process.argv[i + 1] : 14) || 14);

mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
let out = join(dir, `annuaire-${stamp}.db`);
for (let n = 2; existsSync(out); n++) out = join(dir, `annuaire-${stamp}-${n}.db`);
const db = new DatabaseSync(dbPath);
db.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
db.close();
console.log(`Sauvegarde : ${out} (${(statSync(out).size / 1e6).toFixed(1)} Mo)`);

const old = readdirSync(dir).filter((f) => /^annuaire-\d{8}-\d{6}(-\d+)?\.db$/.test(f)).sort().slice(0, -keep);
for (const f of old) rmSync(join(dir, f));
if (old.length) console.log(`${old.length} ancienne(s) sauvegarde(s) supprimée(s).`);
