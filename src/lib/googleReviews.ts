// Avis Google des fiches, récupérés avec l'API Google Reviews de DataForSEO (tâches asynchrones : task_post puis
// task_get). L'admin renseigne l'établissement (CID, place_id, lien Google Maps ou nom) ; `npm run -s avis:google`
// met les avis à jour (tâche planifiée). Les photos des auteurs sont copiées en local (aucune requête vers Google
// depuis les pages). Ces avis sont affichés sur la fiche mais pas déclarés à Google en données structurées : les
// règles de Google interdisent de marquer des avis collectés sur un autre site (risque d'action manuelle).
import { createHash } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ENV } from '../config.ts';
import { get, run, all, UPLOADS_DIR } from './db.ts';
import { getFiche, CERTIFIED_SQL } from './fiches.ts';
import { loadSharp, removeImage } from './uploads.ts';

// DATAFORSEO_API_URL : https://sandbox.dataforseo.com pour des essais sans frais (données fictives).
const API = `${ENV.dataforseoUrl}/v3/business_data/google/reviews`;
/** Avis demandés à chaque mise à jour (facturés par tranche de 10). */
const DEPTH = 20;
/** Avis affichés : les plus récents avec un commentaire, quelle que soit leur note. */
export const SHOWN = 8;
/** Délai entre deux mises à jour automatiques d'une même fiche. */
const REFRESH_DAYS = 30;

export interface GoogleReview { id: string; name: string; avatar: string; rating: number; text: string; date: string; url: string; answer: string }
export interface GoogleReviews {
  fiche_id: number; query: string; place_id: string; cid: string; rating: number | null; count: number;
  reviews: GoogleReview[]; status: string; fetched_at: string | null;
}

export const reviewsEnabled = () => Boolean(ENV.dataforseoLogin && ENV.dataforseoPassword);

export function getGoogleReviews(ficheId: number): GoogleReviews | null {
  const r = get<any>('SELECT * FROM google_reviews WHERE fiche_id = ?', ficheId);
  if (!r) return null;
  let reviews: GoogleReview[] = [];
  try { reviews = JSON.parse(r.reviews); } catch { /* JSON abîmé : aucun avis */ }
  return { ...r, reviews };
}

/** Identifiant saisi : CID (chiffres), place_id, lien Google Maps (CID ou place_id extrait) ou nom de l'établissement. */
export function parseGoogleQuery(raw: string): { cid?: string; place_id?: string; keyword?: string } | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{6,25}$/.test(s)) return { cid: s };
  if (/^ChIJ[\w-]{10,}$/.test(s)) return { place_id: s };
  // Plus Code (« 4QFV+H4 Bellengreville ») : une position, pas un établissement.
  if (/^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/i.test(s)) return null;
  if (/^https?:\/\//i.test(s)) {
    let u = s;
    try { u = decodeURIComponent(s); } catch { /* lien laissé tel quel */ }
    const cid = u.match(/[?&]cid=(\d+)/)?.[1];
    if (cid) return { cid };
    const pid = u.match(/place_?id[=:](ChIJ[\w-]+)/i)?.[1];
    if (pid) return { place_id: pid };
    // Lien de fiche Google Maps : « !1s0x…:0x… » ; la seconde partie, en décimal, est le CID.
    const ftid = u.match(/0x[0-9a-f]+:0x([0-9a-f]+)/i)?.[1];
    if (ftid) return { cid: BigInt(`0x${ftid}`).toString() };
    return null;
  }
  return { keyword: s.slice(0, 200) };
}

async function api(path: string, body?: unknown) {
  const auth = Buffer.from(`${ENV.dataforseoLogin}:${ENV.dataforseoPassword}`).toString('base64');
  const res = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const json: any = await res.json().catch(() => null);
  if (!json) throw new Error(`DataForSEO : réponse illisible (HTTP ${res.status})`);
  if (json.status_code !== 20000) throw new Error(`DataForSEO : ${json.status_message ?? `HTTP ${res.status}`}`);
  return json.tasks?.[0] ?? null;
}

/** Enregistre l'établissement à suivre (vide : supprime les avis de la fiche). */
export function setGoogleQuery(ficheId: number, query: string) {
  const old = getGoogleReviews(ficheId);
  if (!query.trim()) {
    old?.reviews.forEach((r) => r.avatar && removeImage(r.avatar));
    run('DELETE FROM google_reviews WHERE fiche_id = ?', ficheId);
    return;
  }
  if (old && old.query === query.trim()) return;
  old?.reviews.forEach((r) => r.avatar && removeImage(r.avatar));
  run(`INSERT INTO google_reviews (fiche_id, query) VALUES (?, ?)
    ON CONFLICT(fiche_id) DO UPDATE SET query = excluded.query, place_id = '', cid = '', rating = NULL, count = 0, reviews = '[]', task_id = '', status = '', fetched_at = NULL`,
  ficheId, query.trim());
}

/** Lance la récupération des avis d'une fiche (tâche DataForSEO). */
export async function postReviewsTask(ficheId: number): Promise<string> {
  const g = getGoogleReviews(ficheId);
  const f = getFiche(ficheId);
  if (!g || !f) throw new Error('Fiche sans établissement Google renseigné.');
  const q = parseGoogleQuery(g.query);
  if (!q) throw new Error('Identifiant Google non reconnu : collez le CID, le place_id ou le lien de la fiche Google Maps.');
  const location = f.lat != null && f.lng != null
    ? { location_coordinate: `${f.lat.toFixed(7)},${f.lng.toFixed(7)},2000` }
    : { location_name: 'France' };
  const task = await api('/task_post', [{
    ...(q.keyword ? { keyword: `${q.keyword}` } : q.cid ? { cid: q.cid } : { place_id: q.place_id }),
    ...location, language_code: 'fr', depth: DEPTH, sort_by: 'newest', tag: String(ficheId),
  }]);
  if (!task || task.status_code !== 20100) throw new Error(`DataForSEO : ${task?.status_message ?? 'tâche refusée'}`);
  run("UPDATE google_reviews SET task_id = ?, status = 'pending' WHERE fiche_id = ?", task.id, ficheId);
  return task.id;
}

/** Identifiants des tâches terminées, pas encore récupérées. */
export async function readyTaskIds(): Promise<Set<string>> {
  const task = await api('/tasks_ready');
  return new Set((task?.result ?? []).map((r: any) => String(r?.id ?? '')));
}

/** Récupère le résultat d'une tâche terminée : true si traitée (avis enregistrés ou erreur notée), false si en cours. */
export async function collectReviewsTask(ficheId: number, ready: Set<string>): Promise<boolean> {
  const g = getGoogleReviews(ficheId);
  if (!g?.task_id) return true;
  if (!ready.has(g.task_id)) return false;
  const task = await api(`/task_get/${g.task_id}`);
  if (!task) return false;
  if (task.status_code !== 20000) {
    run("UPDATE google_reviews SET task_id = '', status = ? WHERE fiche_id = ?", /no search results/i.test(task.status_message ?? '')
      ? 'Établissement introuvable sur Google : collez le lien complet de sa fiche Google Maps'
      : `Erreur : ${task.status_message ?? task.status_code}`, ficheId);
    return true;
  }
  const result = task.result?.[0];
  if (!result) {
    run("UPDATE google_reviews SET task_id = '', status = ?, fetched_at = datetime('now') WHERE fiche_id = ?", 'Établissement introuvable sur Google', ficheId);
    return true;
  }
  const items: any[] = (result.items ?? []).filter((i: any) => i && (i.review_text ?? '').trim());
  const reviews: GoogleReview[] = [];
  for (const i of items.slice(0, SHOWN)) {
    reviews.push({
      id: String(i.review_id ?? ''),
      name: String(i.profile_name ?? 'Client Google').slice(0, 80),
      avatar: await saveAvatar(i.profile_image_url),
      rating: Number(i.rating?.value ?? 0),
      text: String(i.review_text).trim().slice(0, 1200),
      date: i.timestamp ? new Date(String(i.timestamp).replace(' +00:00', 'Z').replace(' ', 'T')).toISOString() : '',
      url: /^https:\/\//.test(i.review_url ?? '') ? i.review_url : '',
      answer: String(i.owner_answer ?? '').trim().slice(0, 1200),
    });
  }
  // Photos des avis précédents qui ne servent plus.
  const kept = new Set(reviews.map((r) => r.avatar));
  g.reviews.forEach((r) => r.avatar && !kept.has(r.avatar) && removeImage(r.avatar));
  run(`UPDATE google_reviews SET task_id = '', status = 'ok', fetched_at = datetime('now'), place_id = ?, cid = ?, rating = ?, count = ?, reviews = ?
    WHERE fiche_id = ?`,
  String(result.place_id ?? ''), String(result.cid ?? ''), result.rating?.value ?? null, Number(result.rating?.votes_count ?? result.reviews_count ?? 0),
  JSON.stringify(reviews), ficheId);
  return true;
}

/** Copie locale (WebP 96 px) de la photo d'un auteur ; '' si indisponible. */
async function saveAvatar(url: unknown): Promise<string> {
  if (typeof url !== 'string' || !/^https:\/\/[\w.-]+\.googleusercontent\.com\//.test(url)) return '';
  const name = `g-${createHash('sha1').update(url).digest('hex').slice(0, 20)}.webp`;
  const file = join(UPLOADS_DIR, name);
  if (existsSync(file)) return `/media/${name}`;
  try {
    const sharp = await loadSharp();
    if (!sharp) return '';
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return '';
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(file, await sharp(buf).resize(96, 96, { fit: 'cover' }).webp({ quality: 80 }).toBuffer());
    return `/media/${name}`;
  } catch {
    return '';
  }
}

/** Met à jour une fiche de bout en bout (envoi de la tâche puis attente du résultat, 10 min au plus). */
export async function refreshReviews(ficheId: number, maxWaitMs = 10 * 60_000) {
  await postReviewsTask(ficheId);
  const end = Date.now() + maxWaitMs;
  while (Date.now() < end) {
    await new Promise((r) => setTimeout(r, 15_000));
    if (await collectReviewsTask(ficheId, await readyTaskIds())) return;
  }
  run("UPDATE google_reviews SET status = 'pending' WHERE fiche_id = ?", ficheId);
}

/** Fiches Pro et Premium à mettre à jour : jamais récupérées, en attente, ou plus anciennes que REFRESH_DAYS. */
export const dueForRefresh = (force = false) => all<{ fiche_id: number; task_id: string }>(
  `SELECT g.fiche_id, g.task_id FROM google_reviews g JOIN fiches f ON f.id = g.fiche_id
   WHERE f.status = 'published' AND g.query <> '' AND ${CERTIFIED_SQL}
   ${force ? '' : `AND (g.fetched_at IS NULL OR g.task_id <> '' OR g.fetched_at < datetime('now', '-${REFRESH_DAYS} days'))`}`,
);

// --- Affichage ---

export function ratingLabel(r: number) {
  if (r >= 4.5) return 'Excellent';
  if (r >= 4) return 'Très bien';
  if (r >= 3.5) return 'Bien';
  if (r >= 3) return 'Correct';
  return 'Avis Google';
}

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
export function timeAgo(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 864e5);
  if (!iso || Number.isNaN(days)) return '';
  if (days < 7) return rtf.format(-days, 'day');
  if (days < 30) return rtf.format(-Math.round(days / 7), 'week');
  if (days < 365) return rtf.format(-Math.round(days / 30), 'month');
  return rtf.format(-Math.round(days / 365), 'year');
}

/** Lien « Laisser un avis » (place_id) et lien vers tous les avis (CID). */
export const writeReviewUrl = (g: GoogleReviews) => (g.place_id ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(g.place_id)}` : '');
export const allReviewsUrl = (g: GoogleReviews) =>
  g.cid ? `https://www.google.com/maps?cid=${encodeURIComponent(g.cid)}` : g.place_id ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(g.place_id)}` : '';
