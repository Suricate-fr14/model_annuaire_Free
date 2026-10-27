import { all, get, run } from './db.ts';
import type { Hours } from './hours.ts';
import type { Socials } from './social.ts';
import { normalize, slugify } from './text.ts';
import { categoryName, universeOfCategory, universes, universeStats } from './taxonomy.ts';
import { SITE, CITY } from '../config.ts';

export type FicheStatus = 'pending' | 'published' | 'rejected' | 'unpublished';

export interface Fiche {
  id: number;
  slug: string;
  name: string;
  kind: 'organization' | 'person';
  category: string;
  short_desc: string;
  description: string;
  street: string;
  postcode: string;
  city: string;
  city_slug: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  email: string;
  website: string;
  siret: string;
  hours: Hours | null;
  hours_note: string;
  socials: Socials;
  features: string[];
  logo: string;
  photos: string[];
  status: FicheStatus;
  reject_reason: string;
  owner_id: number | null;
  source: string;
  source_ref: string;
  pro_status: 'none' | 'active' | 'past_due' | 'canceled';
  plan: '' | 'pro' | 'premium';
  pro_interval: '' | 'month' | 'year';
  /** Formule choisie sur la page Tarifs, en attente de souscription. */
  wanted_plan: '' | 'pro' | 'premium';
  wanted_interval: '' | 'month' | 'year';
  /** Title et meta description personnalisés (vides = générés automatiquement). */
  seo_title: string;
  seo_description: string;
  /** Indexation : « auto » = indexée seulement avec une formule payante ; « index » / « noindex » = choix de l'admin. */
  index_mode: 'auto' | 'index' | 'noindex';
  clicks_phone: number;
  clicks_web: number;
  clicks_route: number;
  clicks_phone_locked: number;
  pro_until: string | null;
  stripe_customer: string;
  stripe_subscription: string;
  views: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  /** Abonnement payant en cours (badge, site web, mise en avant). */
  certified: boolean;
  /** Formule Premium en cours. */
  premium: boolean;
  /** Vidéos YouTube (identifiants), affichées avec Premium. */
  videos: string[];
  /** « J'achète des leads » : formulaire de demande de contact sur la fiche (Premium). */
  leads_enabled: boolean;
  /** Bannière (image de couverture), affichée avec Pro et Premium. */
  banner: string;
  /** Références clients (logo et nom), affichées avec Pro et Premium. */
  refs: { logo: string; name: string }[];
  /** Actualité ou offre du moment (Pro et Premium) ; news_until = date de fin AAAA-MM-JJ (vide = sans fin). */
  news_title: string;
  news_text: string;
  news_link: string;
  news_until: string;
  /** Prix « à partir de » en euros, affiché avec Pro et Premium (« 25 », « 12,50 »). */
  price_from: string;
  /** Année de création (« 1998 »), zone d'intervention, labels et certifications (séparés par des virgules). */
  founded: string;
  area_served: string;
  credentials: string;
  /** Langues parlées en plus du français (codes de lib/features : LANGUAGES). */
  languages: string[];
  /** Formule payée et formule offerte (lib/formula.ts) ; pro_status / plan / pro_until = formule effective. */
  paid_status: 'none' | 'active' | 'past_due' | 'canceled';
  paid_plan: '' | 'pro' | 'premium';
  paid_until: string | null;
  gift_plan: '' | 'pro' | 'premium';
  gift_until: string | null;
}

const json = <T>(s: string | null, fallback: T): T => {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};

/** Téléphone et email affichés sur la fiche : réservés aux formules Pro et Premium. */
export const showsContact = (f: Pick<Fiche, 'certified'>) => f.certified;
/** Formulaire de demande de contact affiché : Premium, option activée, fiche publiée avec un propriétaire. */
export const acceptsLeads = (f: Pick<Fiche, 'premium' | 'leads_enabled' | 'status' | 'owner_id'>) =>
  f.premium && f.leads_enabled && f.status === 'published' && !!f.owner_id;

/** Une fiche est indexable si elle est publiée et, en mode automatique, couverte par une formule payante. */
export const isIndexable = (f: Pick<Fiche, 'status' | 'certified' | 'index_mode'>) =>
  f.status === 'published' && (f.index_mode === 'index' || (f.index_mode !== 'noindex' && f.certified));

export const INDEX_MODES = [
  { key: 'auto', label: 'Automatique : indexée avec une formule Pro ou Premium' },
  { key: 'index', label: 'Toujours indexer' },
  { key: 'noindex', label: 'Ne pas indexer' },
] as const;
export const setIndexMode = (id: number, mode: string) => {
  if (['auto', 'index', 'noindex'].includes(mode)) run("UPDATE fiches SET index_mode = ?, updated_at = datetime('now') WHERE id = ?", mode, id);
};

/** Références clients : nombre maximal (Pro et Premium). */
export const MAX_REFS = 5;

export const isCertifiedRow = (r: { pro_status: string; pro_until: string | null }) =>
  r.pro_status === 'active' || r.pro_status === 'past_due' || (r.pro_status === 'canceled' && !!r.pro_until && r.pro_until > new Date().toISOString());

export function parseFiche(r: any): Fiche {
  return {
    ...r,
    hours: json<Hours | null>(r.hours, null),
    socials: json<Socials>(r.socials, {}),
    photos: json<string[]>(r.photos, []),
    features: json<string[]>(r.features, []),
    videos: json<string[]>(r.videos, []),
    refs: json<{ logo: string; name: string }[]>(r.refs, []),
    languages: json<string[]>(r.languages, []),
    leads_enabled: !!r.leads_enabled,
    certified: isCertifiedRow(r),
    premium: isCertifiedRow(r) && r.plan === 'premium',
  };
}

// Expression SQL équivalente à isCertifiedRow, pour trier les fiches Pro en premier.
const CERT_SQL = `(pro_status IN ('active','past_due') OR (pro_status = 'canceled' AND pro_until > strftime('%Y-%m-%dT%H:%M:%fZ','now')))`;
export const CERTIFIED_SQL = CERT_SQL;
/** Équivalent SQL de isIndexable (sitemap, filtres admin). */
export const INDEXABLE_SQL = `(status = 'published' AND (index_mode = 'index' OR (index_mode <> 'noindex' AND ${CERT_SQL})))`;
// Classement : Premium, puis Pro, puis fiches gratuites.
const RANK_SQL = `(${CERT_SQL} AND plan = 'premium') DESC, ${CERT_SQL} DESC`;

export const getFiche = (id: number) => {
  const r = get('SELECT * FROM fiches WHERE id = ?', id);
  return r ? parseFiche(r) : null;
};
export const getFicheBySlug = (slug: string) => {
  const r = get('SELECT * FROM fiches WHERE slug = ?', slug);
  return r ? parseFiche(r) : null;
};
export const fichesOfOwner = (userId: number) =>
  all('SELECT * FROM fiches WHERE owner_id = ? ORDER BY created_at DESC', userId).map(parseFiche);

/** Clé de recherche : commence par le nom normalisé (sert aussi au classement A–Z). */
export function searchKeyOf(f: Pick<Fiche, 'name' | 'category' | 'city' | 'street' | 'postcode'>) {
  const u = universeOfCategory(f.category);
  return normalize([f.name, categoryName(f.category), u?.name ?? '', f.city, f.postcode, f.street].join(' '));
}

const RESERVED = new Set([
  'admin', 'annuaire', 'api', 'compte', 'connexion', 'deconnexion', 'inscription', 'media', 'mot-de-passe-oublie',
  'paiement', 'recherche', 'reinitialiser', 'revendiquer', 'signaler', 'sitemap', 'tarifs', 'univers', 'ville', 'villes',
  'mentions-legales', 'cgu', 'confidentialite', 'sources-et-donnees', 'contact', 'robots', 'favicon', 'creer-ma-fiche',
]);

export function uniqueSlug(name: string, city: string, exceptId?: number) {
  const taken = (s: string) =>
    RESERVED.has(s) || !!get('SELECT 1 FROM fiches WHERE slug = ? AND id IS NOT ?', s, exceptId ?? null);
  const base = slugify(name);
  if (!taken(base)) return base;
  const withCity = `${base}-${slugify(city || CITY.name)}`;
  if (!taken(withCity)) return withCity;
  for (let i = 2; ; i++) if (!taken(`${withCity}-${i}`)) return `${withCity}-${i}`;
}

// --- Listes publiques ---

export interface ListOptions {
  q?: string;
  category?: string;
  universe?: string;
  city?: string;
  letter?: string;
  certifiedOnly?: boolean;
  limit?: number;
  offset?: number;
}

function whereFor(o: ListOptions) {
  const where = ["status = 'published'"];
  const params: (string | number)[] = [];
  if (o.category) { where.push('category = ?'); params.push(o.category); }
  if (o.universe) {
    const cats = universes.find((u) => u.slug === o.universe)?.categories.map((c) => c.slug) ?? [];
    where.push(`category IN (${cats.map(() => '?').join(',') || "''"})`);
    params.push(...cats);
  }
  if (o.city) { where.push('city_slug = ?'); params.push(o.city); }
  if (o.letter) {
    if (o.letter === '#') where.push("substr(search, 1, 1) NOT BETWEEN 'a' AND 'z'");
    else { where.push('substr(search, 1, 1) = ?'); params.push(o.letter.toLowerCase()); }
  }
  if (o.certifiedOnly) where.push(CERT_SQL);
  for (const term of normalize(o.q ?? '').split(/\s+/).filter(Boolean).slice(0, 6)) {
    where.push("search LIKE ? ESCAPE '\\'");
    params.push(`%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  }
  return { sql: where.join(' AND '), params };
}

export function listFiches(o: ListOptions = {}) {
  const { sql, params } = whereFor(o);
  const total = (get<{ n: number }>(`SELECT COUNT(*) AS n FROM fiches WHERE ${sql}`, ...params)?.n ?? 0);
  const rows = all(
    `SELECT * FROM fiches WHERE ${sql} ORDER BY ${RANK_SQL}, search ASC LIMIT ? OFFSET ?`,
    ...params, o.limit ?? SITE.perPage, o.offset ?? 0,
  );
  return { items: rows.map(parseFiche), total };
}

/** Tous les résultats correspondants (pour les filtres calculés en JS, ex. « ouvert maintenant »). */
export function matchAll(o: ListOptions) {
  const { sql, params } = whereFor(o);
  return all(`SELECT * FROM fiches WHERE ${sql} ORDER BY ${RANK_SQL}, search ASC LIMIT 5000`, ...params).map(parseFiche);
}

export function suggest(q: string, limit = 8) {
  return listFiches({ q, limit }).items.map((f) => ({
    name: f.name, slug: f.slug, category: categoryName(f.category), city: f.city, certified: f.certified,
  }));
}

// --- Compteurs (mis en cache 60 s) ---

let cache: { at: number; cats: Map<string, number>; cities: { city: string; city_slug: string; n: number }[]; total: number; certified: number } | null = null;

export function stats() {
  if (cache && Date.now() - cache.at < 60_000) return cache;
  // Formules offertes arrivées à échéance (lib/formula.ts) : vérifiées en arrière-plan.
  import('./formula.ts').then((m) => m.expireGifts()).catch(() => {});
  const cats = new Map<string, number>();
  for (const r of all<{ category: string; n: number }>("SELECT category, COUNT(*) AS n FROM fiches WHERE status = 'published' GROUP BY category")) {
    cats.set(r.category, r.n);
  }
  const cities = all<{ city: string; city_slug: string; n: number }>(
    "SELECT city, city_slug, COUNT(*) AS n FROM fiches WHERE status = 'published' AND city_slug <> '' GROUP BY city_slug ORDER BY n DESC",
  );
  const total = [...cats.values()].reduce((a, b) => a + b, 0);
  const certified = get<{ n: number }>(`SELECT COUNT(*) AS n FROM fiches WHERE status = 'published' AND ${CERT_SQL}`)?.n ?? 0;
  cache = { at: Date.now(), cats, cities, total, certified };
  return cache;
}
export const invalidateStats = () => { cache = null; };
export const universeCounts = () => universeStats(stats().cats);

// --- Sélections quotidiennes (déterministes pour une journée) ---

const todayKey = () => new Intl.DateTimeFormat('fr-CA', { timeZone: SITE.timezone }).format(new Date());
const seed = (salt = '') => {
  let h = 2166136261;
  for (const c of todayKey() + salt) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % 2147483647;
};
const SEEDED = (s: number) => `((id * 1103515245 + ${s}) % 2147483647)`;

export const todayLabel = () =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: SITE.timezone, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

export function dailyPicks(n = SITE.dailyCount) {
  const s = seed();
  const nCert = Math.ceil((n * 2) / 3);
  // Les fiches gratuites du jour sont prises parmi les fiches complètes (horaires + téléphone).
  const cert = all(`SELECT * FROM fiches WHERE status = 'published' AND ${CERT_SQL} ORDER BY (plan = 'premium') DESC, ${SEEDED(s)} LIMIT ?`, nCert);
  const free = all(
    `SELECT * FROM fiches WHERE status = 'published' AND NOT ${CERT_SQL} AND hours IS NOT NULL AND phone <> '' ORDER BY ${SEEDED(s)} LIMIT ?`,
    n - cert.length,
  );
  return [...cert, ...free].map(parseFiche);
}

export function universeOfDay(limit = SITE.dailyCount) {
  const eligible = universeCounts().filter((u) => u.count >= 3);
  if (!eligible.length) return null;
  const universe = eligible[seed('u') % eligible.length];
  const s = seed('u2');
  const cats = universe.categories.map((c) => c.slug);
  const items = all(
    `SELECT * FROM fiches WHERE status = 'published' AND category IN (${cats.map(() => '?').join(',')})
     ORDER BY ${RANK_SQL}, (hours IS NOT NULL) DESC, ${SEEDED(s)} LIMIT ?`,
    ...cats, limit,
  ).map(parseFiche);
  return { universe, items };
}

export const newcomers = (n = SITE.newcomersCount) =>
  all("SELECT * FROM fiches WHERE status = 'published' AND source = 'user' ORDER BY published_at DESC LIMIT ?", n).map(parseFiche);

export function nearby(f: Fiche, n = 3) {
  if (f.lat == null || f.lng == null) {
    return all("SELECT * FROM fiches WHERE status = 'published' AND category = ? AND id <> ? LIMIT ?", f.category, f.id, n).map(parseFiche);
  }
  // Approximation plane suffisante à l'échelle d'une agglomération.
  return all(
    `SELECT *, ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?) * 0.43) AS d FROM fiches
     WHERE status = 'published' AND category = ? AND id <> ? AND lat IS NOT NULL ORDER BY ${RANK_SQL}, d ASC LIMIT ?`,
    f.lat, f.lat, f.lng, f.lng, f.category, f.id, n,
  ).map(parseFiche);
}

const thisMonth = () => new Date().toISOString().slice(0, 7);
/** Compteur du mois en cours (bilan mensuel), en plus du total de la fiche. */
const countMonth = (id: number, col: 'views' | 'clicks_phone' | 'clicks_web' | 'clicks_route' | 'phone_locked') =>
  run(`INSERT INTO fiche_stats (fiche_id, month, ${col}) VALUES (?, ?, 1) ON CONFLICT(fiche_id, month) DO UPDATE SET ${col} = ${col} + 1`, id, thisMonth());

export const countView = (id: number) => {
  run('UPDATE fiches SET views = views + 1 WHERE id = ?', id);
  countMonth(id, 'views');
};

/** phone_locked : clic sur « Afficher le téléphone » d'une fiche gratuite (numéro masqué). */
export type ClickKind = 'phone' | 'web' | 'route' | 'phone_locked';
export const countClick = (id: number, kind: ClickKind) => {
  if (run(`UPDATE fiches SET clicks_${kind} = clicks_${kind} + 1 WHERE id = ? AND status = 'published'`, id).changes) {
    countMonth(id, kind === 'phone_locked' ? 'phone_locked' : `clicks_${kind}`);
  }
};

/** Actualité affichée : Pro ou Premium, titre renseigné, date de fin non dépassée. */
export const activeNews = (f: Pick<Fiche, 'certified' | 'news_title' | 'news_until'>) =>
  f.certified && !!f.news_title.trim() && (!f.news_until || f.news_until >= new Date().toISOString().slice(0, 10));

// --- Écriture ---

export type FicheInput = Omit<Fiche,
  'id' | 'slug' | 'certified' | 'views' | 'created_at' | 'updated_at' | 'published_at' | 'city_slug' |
  'status' | 'reject_reason' | 'owner_id' | 'source' | 'source_ref' | 'pro_status' | 'pro_until' | 'stripe_customer' | 'stripe_subscription' | 'plan' | 'pro_interval' | 'wanted_plan' | 'wanted_interval' | 'index_mode' |
  'clicks_phone' | 'clicks_web' | 'clicks_route' | 'clicks_phone_locked' | 'premium' | 'paid_status' | 'paid_plan' | 'paid_until' | 'gift_plan' | 'gift_until'
>;

const COLS = ['name', 'kind', 'category', 'short_desc', 'description', 'street', 'postcode', 'city', 'lat', 'lng', 'phone',
  'email', 'website', 'siret', 'hours', 'hours_note', 'socials', 'features', 'logo', 'photos', 'seo_title', 'seo_description',
  'videos', 'leads_enabled', 'banner', 'news_title', 'news_text', 'news_link', 'news_until', 'price_from',
  'founded', 'area_served', 'credentials', 'languages'] as const;

function toRow(d: FicheInput) {
  return COLS.map((c) => {
    const v = (d as any)[c];
    if (c === 'hours') return v ? JSON.stringify(v) : null;
    if (c === 'socials') return JSON.stringify(v ?? {});
    if (c === 'photos' || c === 'features' || c === 'videos' || c === 'languages') return JSON.stringify(v ?? []);
    if (c === 'leads_enabled') return v ? 1 : 0;
    return v ?? (c === 'lat' || c === 'lng' ? null : '');
  });
}

export function createFiche(d: FicheInput, opts: { ownerId: number | null; status: FicheStatus; source?: string; sourceRef?: string }) {
  const slug = uniqueSlug(d.name, d.city);
  const r = run(
    `INSERT INTO fiches (${COLS.join(', ')}, slug, city_slug, search, owner_id, status, source, source_ref, published_at)
     VALUES (${COLS.map(() => '?').join(', ')}, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ...toRow(d), slug, (d.city ? slugify(d.city) : ""), searchKeyOf(d), opts.ownerId, opts.status, opts.source ?? 'user', opts.sourceRef ?? '',
    opts.status === 'published' ? new Date().toISOString() : null,
  );
  invalidateStats();
  return { id: Number(r.lastInsertRowid), slug };
}

export function updateFiche(id: number, d: FicheInput) {
  const current = getFiche(id);
  if (!current) throw new Error('Fiche introuvable');
  const slug = current.name === d.name ? current.slug : uniqueSlug(d.name, d.city, id);
  run(
    `UPDATE fiches SET ${COLS.map((c) => `${c} = ?`).join(', ')}, slug = ?, city_slug = ?, search = ?, updated_at = datetime('now') WHERE id = ?`,
    ...toRow(d), slug, (d.city ? slugify(d.city) : ""), searchKeyOf(d), id,
  );
  invalidateStats();
  return slug;
}

export function setStatus(id: number, status: FicheStatus, reason = '') {
  run(
    `UPDATE fiches SET status = ?, reject_reason = ?, updated_at = datetime('now'),
     published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN ? ELSE published_at END WHERE id = ?`,
    status, reason, status, new Date().toISOString(), id,
  );
  invalidateStats();
}

export function deleteFiche(id: number) {
  run('DELETE FROM fiches WHERE id = ?', id);
  invalidateStats();
}
