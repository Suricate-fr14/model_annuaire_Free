// Allège les images déjà envoyées (logos, bannières, photos) : redimensionnées et recompressées dans leur format
// d'origine, sous le même nom de fichier (la base n'est pas modifiée). Une image n'est remplacée que si elle y gagne.
// Les nouvelles images sont déjà optimisées à l'envoi (src/lib/uploads.ts).
// Usage : npm run -s images:optimiser             optimise
//         npm run -s images:optimiser -- --apercu affiche le gain sans rien modifier
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import sharp from 'sharp';
import { db, all, UPLOADS_DIR } from '../src/lib/db.ts';

sharp.concurrency(1);
sharp.cache(false);
db();
const dryRun = process.argv.includes('--apercu');
const SIZES = { logo: [800, 800], banner: [2000, 1000], photo: [1600, 1600] } as const;

// Usage de chaque fichier, d'après les fiches.
const kinds = new Map<string, keyof typeof SIZES>();
for (const f of all<{ logo: string; banner: string; photos: string }>('SELECT logo, banner, photos FROM fiches')) {
  if (f.logo) kinds.set(basename(f.logo), 'logo');
  if (f.banner) kinds.set(basename(f.banner), 'banner');
  for (const p of JSON.parse(f.photos || '[]') as string[]) kinds.set(basename(p), 'photo');
}

let before = 0, after = 0, done = 0;
for (const [name, kind] of kinds) {
  const file = join(UPLOADS_DIR, name);
  if (!existsSync(file)) continue;
  const input = readFileSync(file);
  const [width, height] = SIZES[kind];
  let img = sharp(input, { failOn: 'none' }).rotate().resize({ width, height, fit: 'inside', withoutEnlargement: true });
  if (name.endsWith('.jpg')) img = img.jpeg({ quality: 80, mozjpeg: true });
  else if (name.endsWith('.png')) img = img.png({ compressionLevel: 9, adaptiveFiltering: true });
  else img = img.webp({ quality: kind === 'logo' ? 85 : 80 });
  let out: Buffer;
  try { out = await img.toBuffer(); } catch (e) { console.log(`${name} : illisible (${(e as Error).message})`); continue; }
  before += input.length;
  if (out.length < input.length * 0.9) {
    after += out.length;
    done++;
    console.log(`${name} (${kind}) : ${(input.length / 1024).toFixed(0)} Ko -> ${(out.length / 1024).toFixed(0)} Ko`);
    if (!dryRun) writeFileSync(file, out);
  } else {
    after += input.length;
  }
}
console.log(`${dryRun ? 'Aperçu : ' : ''}${done} image(s) allégée(s) sur ${kinds.size}, ${(before / 1e6).toFixed(1)} Mo -> ${(after / 1e6).toFixed(1)} Mo.`);
