// Images de partage (Open Graph, 1200 × 630) des pages sans photo : accueil, annuaire, domaines, catégories, villes,
// fiches sans image. Le texte est déduit de l'adresse de la page (jamais d'un paramètre libre) puis dessiné avec sharp
// et la police Inter (assets/fonts). Servies par /og/….png (src/pages/og/[...path].ts), gardées en mémoire.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SITE, ENV, CITY } from '../config.ts';
import { stats, universeCounts, getFicheBySlug } from './fiches.ts';
import { categoryInfo } from './taxonomy.ts';
import { loadSharp } from './uploads.ts';

export interface OgText { eyebrow: string; title: string; subtitle: string }

const fr = (n: number) => n.toLocaleString('fr-FR');
const plural = (n: number, one: string, many: string) => `${fr(n)} ${n > 1 ? many : one}`;

/** Chemin de l'image de partage d'une page (null : page sans image dédiée). */
export function ogPathFor(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return '/og/accueil.png';
  if (/^\/(annuaire|villes|univers|tarifs)$/.test(p) || /^\/univers\/[\w-]+(\/[\w-]+)?$/.test(p) || /^\/ville\/[\w-]+$/.test(p)) {
    return `/og${p}.png`;
  }
  return null;
}

/** Image de partage d'une fiche sans photo. */
export const ogPathForFiche = (slug: string) => `/og/fiche/${slug}.png`;

/** Texte de l'image pour un chemin /og/… (sans « /og/ » ni « .png ») ; null si la page n'existe pas. */
export function ogText(path: string): OgText | null {
  const s = stats();
  const parts = path.split('/').filter(Boolean);
  const [a, b, c] = parts;
  const brand = SITE.fullName;
  if (parts.length === 1 && a === 'accueil') {
    return { eyebrow: 'Annuaire local', title: `Les entreprises, commerces et professionnels ${CITY.of}`, subtitle: `${plural(s.total, 'adresse', 'adresses')} · ${CITY.area}` };
  }
  if (parts.length === 1 && a === 'annuaire') {
    return { eyebrow: 'Sommaire', title: `Annuaire des entreprises de ${SITE.region}`, subtitle: `${plural(s.total, 'adresse', 'adresses')} par catégorie, par commune et de A à Z` };
  }
  if (parts.length === 1 && a === 'villes') {
    return { eyebrow: 'Par commune', title: `Annuaire par ville : ${CITY.area}`, subtitle: `${plural(s.cities.length, 'commune', 'communes')} · ${plural(s.total, 'adresse', 'adresses')}` };
  }
  if (parts.length === 1 && a === 'tarifs') {
    return { eyebrow: 'Professionnels', title: 'Formules Pro et Premium', subtitle: `Rendez votre entreprise visible ${CITY.of} et alentour` };
  }
  if (a === 'univers') {
    if (!b) return { eyebrow: 'Domaines d\'activité', title: `Tous les domaines d'activité ${CITY.of}`, subtitle: plural(s.total, 'adresse', 'adresses') };
    const u = universeCounts().find((x) => x.slug === b);
    if (!u) return null;
    if (!c) {
      const cats = u.categories.filter((x) => x.count > 0).length;
      return { eyebrow: 'Domaine d\'activité', title: `${u.name} à ${CITY.name}`, subtitle: `${plural(u.count, 'professionnel', 'professionnels')} · ${plural(cats, 'catégorie', 'catégories')}` };
    }
    const cat = u.categories.find((x) => x.slug === c);
    if (!cat || parts.length > 3) return null;
    return { eyebrow: u.name, title: `${cat.name} à ${CITY.area}`, subtitle: `${plural(cat.count, 'adresse', 'adresses')} avec horaires, coordonnées et itinéraire` };
  }
  if (a === 'ville' && b && parts.length === 2) {
    const city = s.cities.find((x) => x.city_slug === b);
    if (!city) return null;
    return { eyebrow: 'Commune', title: `Entreprises et commerces à ${city.city}`, subtitle: `${plural(city.n, 'adresse', 'adresses')} avec horaires, coordonnées et itinéraire` };
  }
  if (a === 'fiche' && b && parts.length === 2) {
    const f = getFicheBySlug(b);
    if (!f || f.status !== 'published') return null;
    const cat = categoryInfo(f.category)?.category.name ?? '';
    return { eyebrow: cat || brand, title: f.name, subtitle: [f.city, f.short_desc].filter(Boolean).join(' · ') };
  }
  return null;
}

// --- Dessin ---

const W = 1200, H = 630, PAD = 80;
const COLORS = { bg: '#f5f0e8', text: '#1c1830', muted: '#6a6478', accent: '#2321ac', accent2: '#3d63f2' };
const font = (file: string) => {
  const p = resolve(process.cwd(), 'assets/fonts', file);
  return existsSync(p) ? p : undefined;
};
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

async function textImage(sharp: any, text: string, opts: { size: number; bold?: boolean; color: string; width: number; spacing?: number }) {
  const fontfile = font(opts.bold ? 'Inter-Bold.ttf' : 'Inter-Medium.ttf');
  const family = fontfile ? `Inter ${opts.bold ? 'Bold' : 'Medium'}` : `sans-serif ${opts.bold ? 'Bold' : ''}`;
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${opts.color}">${esc(text)}</span>`,
      font: `${family} ${opts.size}`, ...(fontfile && { fontfile }),
      width: opts.width, rgba: true, wrap: 'word', spacing: opts.spacing ?? 0,
    },
  }).png().toBuffer({ resolveWithObject: true });
  return { data, width: info.width as number, height: info.height as number };
}

export async function renderOg(t: OgText): Promise<Buffer | null> {
  const sharp = await loadSharp();
  if (!sharp) return null;
  const inner = W - PAD * 2;
  // Titre : la plus grande taille qui tient sur trois lignes au plus.
  let title = await textImage(sharp, clip(t.title, 110), { size: 72, bold: true, color: COLORS.text, width: inner });
  for (const size of [64, 56, 48]) {
    if (title.height <= 270) break;
    title = await textImage(sharp, clip(t.title, 110), { size, bold: true, color: COLORS.text, width: inner });
  }
  const eyebrow = await textImage(sharp, clip(t.eyebrow, 60).toUpperCase(), { size: 26, bold: true, color: COLORS.accent2, width: inner });
  const subtitle = t.subtitle ? await textImage(sharp, clip(t.subtitle, 120), { size: 32, color: COLORS.muted, width: inner }) : null;
  const brand = await textImage(sharp, SITE.fullName, { size: 30, bold: true, color: COLORS.accent, width: 700 });
  const domain = await textImage(sharp, new URL(ENV.siteUrl).hostname.replace(/^www\./, ''), { size: 24, color: '#ffffff', width: 600 });

  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="g1" cx="8%" cy="0%" r="70%"><stop offset="0" stop-color="${COLORS.accent}" stop-opacity=".16"/><stop offset="1" stop-color="${COLORS.accent}" stop-opacity="0"/></radialGradient>
      <radialGradient id="g2" cx="100%" cy="10%" r="60%"><stop offset="0" stop-color="${COLORS.accent2}" stop-opacity=".14"/><stop offset="1" stop-color="${COLORS.accent2}" stop-opacity="0"/></radialGradient>
      <linearGradient id="band" x1="0" x2="1"><stop offset="0" stop-color="${COLORS.accent}"/><stop offset="1" stop-color="${COLORS.accent2}"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="${COLORS.bg}"/>
    <rect width="${W}" height="${H}" fill="url(#g1)"/>
    <rect width="${W}" height="${H}" fill="url(#g2)"/>
    <rect y="${H - 64}" width="${W}" height="64" fill="url(#band)"/>
  </svg>`);

  const layers: any[] = [];
  const icon = resolve(process.cwd(), 'public/icon-192.png');
  let brandLeft = PAD;
  if (existsSync(icon)) {
    const mask = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="#fff"/></svg>');
    const ic = await sharp(readFileSync(icon)).resize(64, 64).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    layers.push({ input: ic, left: PAD, top: 56 });
    brandLeft = PAD + 64 + 20;
  }
  layers.push({ input: brand.data, left: brandLeft, top: 56 + Math.round((64 - brand.height) / 2) });

  // Bloc texte centré verticalement entre l'en-tête (y = 140) et le bandeau (y = H - 64).
  const gap = 22;
  const blockH = eyebrow.height + gap + title.height + (subtitle ? gap + subtitle.height : 0);
  let y = Math.max(150, Math.round(140 + (H - 64 - 140 - blockH) / 2));
  layers.push({ input: eyebrow.data, left: PAD, top: y });
  y += eyebrow.height + gap;
  layers.push({ input: title.data, left: PAD, top: y });
  y += title.height + gap;
  if (subtitle && y + subtitle.height <= H - 80) layers.push({ input: subtitle.data, left: PAD, top: y });
  layers.push({ input: domain.data, left: W - PAD - domain.width, top: H - 64 + Math.round((64 - domain.height) / 2) });

  return sharp(bg).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

// Cache mémoire : la clé est le texte (une image change dès que son texte change, nombre d'adresses compris).
const cache = new Map<string, Buffer>();
export async function ogImage(path: string): Promise<Buffer | null> {
  const t = ogText(path);
  if (!t) return null;
  const key = JSON.stringify(t);
  const hit = cache.get(key);
  if (hit) return hit;
  const png = await renderOg(t);
  if (!png) return null;
  if (cache.size >= 300) cache.delete(cache.keys().next().value!);
  cache.set(key, png);
  return png;
}
