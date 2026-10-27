// Réglages SEO et suivi d'audience modifiables dans Admin > SEO (table settings et seo_pages).
import { all, run } from './db.ts';

export const SETTING_KEYS = ['gtm_id', 'ga4_id', 'google_verification', 'bing_verification', 'news_feed_url', 'schema_phone'] as const;
/** Réglages de la page Admin > SEO. */
export const SEO_SETTING_KEYS = SETTING_KEYS;
export type SettingKey = (typeof SETTING_KEYS)[number];

/** Formats acceptés : une valeur invalide est refusée à l'enregistrement (rien d'arbitraire n'est injecté dans les pages). */
export const SETTING_FORMATS: Record<SettingKey, RegExp> = {
  gtm_id: /^GTM-[A-Z0-9]{4,12}$/,
  ga4_id: /^G-[A-Z0-9]{4,15}$/,
  google_verification: /^[A-Za-z0-9_-]{10,100}$/,
  bing_verification: /^[A-Za-z0-9]{10,64}$/,
  /** « off » : téléphone des fiches retiré des données structurées (protection maximale contre l'aspiration). */
  schema_phone: /^off$/,
  news_feed_url: /^https:\/\/[^\s"'<>]{4,300}(\nhttps:\/\/[^\s"'<>]{4,300}){0,7}$/,
};

let cache: Record<string, string> | null = null;

export function settings(): Record<SettingKey, string> {
  cache ??= Object.fromEntries(all<{ key: string; value: string }>('SELECT key, value FROM settings').map((r) => [r.key, r.value]));
  return Object.fromEntries(SETTING_KEYS.map((k) => [k, cache![k] ?? ''])) as Record<SettingKey, string>;
}

export function saveSetting(key: SettingKey, value: string) {
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
  cache = null;
}

/**
 * Extrait la valeur utile de ce qui a été collé : l'identifiant seul, ou le contenu d'une balise
 * <meta name="google-site-verification" content="…"> copiée telle quelle depuis la Search Console.
 */
export function cleanSetting(key: SettingKey, raw: string) {
  let v = raw.trim();
  const content = v.match(/content=["']([^"']+)["']/i);
  if (content) v = content[1].trim();
  if (key === 'gtm_id' || key === 'ga4_id') v = v.toUpperCase();
  if (key === 'news_feed_url') v = v.split(/[\s,;]+/).filter(Boolean).join('\n');
  return v;
}

export type SeoPage = { path: string; title: string; description: string };

let pagesCache: Map<string, SeoPage> | null = null;

export function seoPages(): Map<string, SeoPage> {
  pagesCache ??= new Map(all<SeoPage>('SELECT path, title, description FROM seo_pages').map((r) => [r.path, r]));
  return pagesCache;
}

export const seoPage = (path: string) => seoPages().get(path) ?? null;

export function saveSeoPage(path: string, title: string, description: string) {
  if (!title && !description) run('DELETE FROM seo_pages WHERE path = ?', path);
  else run(
    `INSERT INTO seo_pages (path, title, description) VALUES (?, ?, ?)
     ON CONFLICT(path) DO UPDATE SET title = excluded.title, description = excluded.description, updated_at = datetime('now')`,
    path, title, description,
  );
  pagesCache = null;
}

/** Chemin normalisé saisi dans l'admin : « https://annuaire…/tarifs/ » → « /tarifs ». */
export function normalizePath(raw: string) {
  let p = raw.trim();
  try { if (/^https?:\/\//i.test(p)) p = new URL(p).pathname; } catch {}
  p = p.split(/[?#]/)[0];
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, '');
  try { p = decodeURI(p); } catch { return ''; }
  return /^\/[\w\-./]*$/.test(p) ? p : '';
}

