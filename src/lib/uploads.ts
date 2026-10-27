import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { UPLOADS_DIR, db } from './db.ts';
import { randomToken } from './crypto.ts';

// Images envoyées : redimensionnées et converties en WebP (sharp) pour des pages légères.
// Sans sharp (module absent ou illisible), le fichier d'origine est enregistré tel quel, 3 Mo maximum.
const MAX_IN = 10 * 1024 * 1024;
const MAX_RAW = 3 * 1024 * 1024;
const TYPES: { ext: string; mime: string; test: (b: Uint8Array) => boolean }[] = [
  { ext: 'jpg', mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'webp', mime: 'image/webp', test: (b) => String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP' },
];

export const mimeOf = (file: string) => TYPES.find((t) => file.endsWith(`.${t.ext}`))?.mime ?? 'application/octet-stream';

/** Usage de l'image : fixe la taille maximale après redimensionnement (en pixels). */
export type ImageKind = 'logo' | 'banner' | 'photo' | 'ref';
const SIZES: Record<ImageKind, { width: number; height: number; quality: number }> = {
  logo: { width: 800, height: 800, quality: 85 },
  ref: { width: 480, height: 240, quality: 85 },
  banner: { width: 2000, height: 1000, quality: 80 },
  photo: { width: 1600, height: 1600, quality: 80 },
};

let sharpMod: any;
/** Charge sharp une seule fois ; null s'il est indisponible sur le serveur. */
export async function loadSharp(): Promise<any | null> {
  if (sharpMod === undefined) {
    try {
      sharpMod = (await import('sharp')).default;
      sharpMod.concurrency(1); // hébergement mutualisé : un seul fil de calcul
      sharpMod.cache(false);
    } catch {
      sharpMod = null;
    }
  }
  return sharpMod;
}

/** Redimensionne (sans agrandir), redresse selon l'EXIF, retire les métadonnées et encode en WebP. */
export async function optimizeImage(bytes: Uint8Array, kind: ImageKind): Promise<Uint8Array | null> {
  const sharp = await loadSharp();
  if (!sharp) return null;
  const { width, height, quality } = SIZES[kind];
  const out = await sharp(bytes, { failOn: 'error', limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width, height, fit: 'inside', withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toBuffer();
  return new Uint8Array(out);
}

/** Enregistre une image envoyée (type vérifié sur les octets, pas sur l'extension). Renvoie le chemin public. */
export async function saveImage(file: unknown, kind: ImageKind = 'photo'): Promise<{ path?: string; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return {};
  if (file.size > MAX_IN) return { error: `« ${file.name} » dépasse 10 Mo.` };
  let bytes = new Uint8Array(await file.arrayBuffer());
  let type = TYPES.find((t) => t.test(bytes));
  if (!type) return { error: `« ${file.name} » n'est pas une image JPG, PNG ou WebP.` };
  try {
    const optimized = await optimizeImage(bytes, kind);
    if (optimized) { bytes = optimized; type = TYPES[2]; }
  } catch {
    return { error: `« ${file.name} » est illisible ou endommagée : enregistrez-la de nouveau puis réessayez.` };
  }
  if (type !== TYPES[2] && bytes.length > MAX_RAW) return { error: `« ${file.name} » dépasse 3 Mo.` };
  db(); // crée le dossier si besoin
  const name = `${randomToken(12)}.${type.ext}`;
  writeFileSync(join(UPLOADS_DIR, name), bytes);
  return { path: `/media/${name}` };
}

export function removeImage(publicPath: string) {
  if (!publicPath.startsWith('/media/')) return;
  const file = join(UPLOADS_DIR, basename(publicPath));
  if (existsSync(file)) unlinkSync(file);
}

export function uploadFilePath(name: string) {
  const safe = basename(name);
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(safe)) return null;
  const p = join(UPLOADS_DIR, safe);
  return existsSync(p) ? p : null;
}
