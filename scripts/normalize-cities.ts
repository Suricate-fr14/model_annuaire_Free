// Remet chaque fiche sur sa commune officielle (nom + code postal de la Base Adresse Nationale) à partir de ses
// coordonnées. Corrige les saisies libres : codes postaux en guise de ville, « CEDEX », abréviations, villes vides.
// Usage : npm run db:villes   (ajouter -- --dry pour seulement afficher les changements)
import { db, all, run, tx } from '../src/lib/db.ts';
import { searchKeyOf, invalidateStats } from '../src/lib/fiches.ts';
import { slugify, cleanCity } from '../src/lib/text.ts';
import { communeAt } from '../src/lib/geo.ts';

const dry = process.argv.includes('--dry');
db();
type Row = { id: number; name: string; category: string; street: string; postcode: string; city: string; lat: number | null; lng: number | null };
const rows = all<Row>('SELECT id, name, category, street, postcode, city, lat, lng FROM fiches');

function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); out.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out;
}

// Géocodage inverse par lots de 1000 (Géoplateforme IGN).
const official = new Map<number, { city: string; postcode: string }>();
const located = rows.filter((r) => r.lat != null && r.lng != null);
for (let i = 0; i < located.length; i += 1000) {
  const batch = located.slice(i, i + 1000);
  const fd = new FormData();
  fd.append('data', new Blob(['id,lat,lon\n' + batch.map((r) => `${r.id},${r.lat},${r.lng}`).join('\n')], { type: 'text/csv' }), 'p.csv');
  fd.append('columns', 'lat');
  fd.append('columns', 'lon');
  const res = await fetch('https://data.geopf.fr/geocodage/reverse/csv', { method: 'POST', body: fd });
  if (!res.ok) { console.warn(`Lot ignoré : HTTP ${res.status}`); continue; }
  const [head, ...data] = parseCsv(await res.text());
  const col = (n: string) => head.indexOf(n);
  for (const r of data) {
    if (r[col('result_status')] === 'ok' && r[col('result_city')]) {
      official.set(Number(r[col('id')]), { city: r[col('result_city')], postcode: r[col('result_postcode')] });
    }
  }
}

// Points trop loin d'une adresse (rocade, grands sites) : commune qui contient le point.
for (const r of located.filter((x) => !official.has(x.id))) {
  const c = await communeAt(r.lat!, r.lng!);
  if (c) official.set(r.id, c);
}

const changes: { id: number; from: string; to: string; postcode: string }[] = [];
for (const r of rows) {
  const o = official.get(r.id);
  const city = o?.city || cleanCity(r.city);
  const postcode = o?.postcode || (/^\d{5}$/.test(r.postcode) ? r.postcode : '');
  if (city !== r.city || postcode !== r.postcode) changes.push({ id: r.id, from: `${r.postcode} ${r.city}`.trim(), to: city, postcode });
}

console.log(`${rows.length} fiches, ${official.size} communes officielles trouvées, ${changes.length} à corriger.`);
for (const c of changes.slice(0, 25)) console.log(`  #${c.id} « ${c.from} » → « ${c.postcode} ${c.to} »`);
if (changes.length > 25) console.log(`  … et ${changes.length - 25} autres`);

if (!dry && changes.length) {
  tx(() => {
    for (const c of changes) {
      const r = rows.find((x) => x.id === c.id)!;
      run('UPDATE fiches SET city = ?, postcode = ?, city_slug = ?, search = ? WHERE id = ?',
        c.to, c.postcode, c.to ? slugify(c.to) : '', searchKeyOf({ ...r, city: c.to, postcode: c.postcode }), c.id);
    }
  });
  invalidateStats();
  console.log('Corrections enregistrées.');
}
