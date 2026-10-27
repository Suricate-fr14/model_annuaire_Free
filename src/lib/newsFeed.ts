// Actualités locales sur l'accueil : flux RSS 2.0 ou Atom de plusieurs sources (réglées dans Admin > SEO).
// Chaque source peut être l'adresse du flux ou simplement celle d'une page du site : le flux est alors cherché
// dans la page (<link rel="alternate" type="application/rss+xml">), puis à l'adresse WordPress « …/feed/ ».
// Les sujets déprimants (faits divers, décès, accidents, justice…) sont écartés par mots-clés.
// Cache de 30 minutes, conservé en base (table settings, clé news_cache) : un processus qui redémarre (Passenger arrête
// l'application après inactivité) sert aussitôt les derniers articles et rafraîchit le flux en arrière-plan.
import { settings } from './settings.ts';
import { ENV } from '../config.ts';
import { get as dbGet, run as dbRun } from './db.ts';

/** Sources par défaut : actualité économique et locale de la ville (à adapter dans Admin > SEO). */
export const DEFAULT_NEWS_SOURCES = [
  // Ex. : 'https://<ville>.maville.com/' (une page suffit : son flux RSS est trouvé automatiquement).
];

export interface NewsItem { title: string; link: string; date: string; excerpt: string; image: string; source: string }

/** Mots qui écartent un article (titre ou résumé). */
const GLOOMY = new RegExp(
  '\\b(' + [
    'accident\\w*', 'd[ée]c[èe]s', 'd[ée]c[ée]d[ée]\\w*', 'mort\\w*', 'meurtr\\w*', 'tu[ée]e?s?', 'bless[ée]\\w*', 'agress\\w*', 'viol\\w*',
    'vol(s)?', 'cambriol\\w*', 'incendi\\w*', 'drame\\w*', 'trag\\w*', 'noy[ée]\\w*', 'suicid\\w*', 'disparu\\w*', 'disparition',
    'proc[èe]s', 'tribunal', 'condamn\\w*', 'prison', 'garde à vue', 'interpell\\w*', 'enqu[êe]te\\w*', 'police', 'gendarm\\w*',
    'guerre', 'attentat\\w*', 'violence\\w*', 'deuil', 'obs[èe]ques', 'hommage', 'licenci\\w*', 'faillite', 'liquidation',
    'gr[èe]ve\\w*', 'blocage\\w*', 'bloqu[ée]\\w*', 'col[èe]re', 'manifest\\w*', 'mobilisation', 'pollution', 's[ée]cheresse', 'alerte', 'crise', 'chômage', 'fermeture d[ée]finitive',
  ].join('|') + ')\\b', 'i');

const decode = (s: string) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;|&#039;|&rsquo;/g, "'").replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
  .replace(/&hellip;/g, '…').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const text = (html: string) => decode(decode(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? '';
const attr = (xml: string, name: string, a: string) => xml.match(new RegExp(`<${name}\\b[^>]*\\b${a}=["']([^"']+)["']`, 'i'))?.[1] ?? '';
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s);
const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : '');

/** Articles d'un flux, sans filtre. */
export function parseItems(xml: string): NewsItem[] {
  const entries = xml.match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  return entries.map((e) => {
    const html = tag(e, 'content:encoded') || tag(e, 'content') || tag(e, 'description') || tag(e, 'summary');
    const image = attr(e, 'media:content', 'url') || attr(e, 'media:thumbnail', 'url')
      || (/image\//.test(attr(e, 'enclosure', 'type')) ? attr(e, 'enclosure', 'url') : '')
      || (decode(html).match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] ?? '');
    return {
      title: text(tag(e, 'title')),
      link: safeUrl(decode(tag(e, 'link').trim()) || attr(e, 'link', 'href')),
      date: tag(e, 'pubDate') || tag(e, 'published') || tag(e, 'updated') || tag(e, 'dc:date'),
      excerpt: cut(text(tag(e, 'description') || tag(e, 'summary') || html), 160),
      image: safeUrl(decode(image)),
      source: '',
    };
  }).filter((i) => i.title && i.link);
}

export const isGloomy = (i: Pick<NewsItem, 'title' | 'excerpt'>) => GLOOMY.test(`${i.title} ${i.excerpt}`);
/** Articles d'un flux, sujets déprimants écartés. */
export const parseFeed = (xml: string) => parseItems(xml).filter((i) => !isGloomy(i));

const UA = { 'User-Agent': `Mozilla/5.0 (compatible; Annuaire/1.0; +${ENV.siteUrl})` };
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const isFeed = (body: string) => /<(rss|feed|rdf:RDF)\b/i.test(body.slice(0, 2000));

async function get(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: UA, redirect: 'follow' });
  if (!res.ok) return '';
  // Encodage : en-tête HTTP, prologue XML ou balise meta (certains sites de presse sont encore en ISO-8859-1).
  const buf = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder('latin1').decode(buf.slice(0, 1024));
  const charset = (res.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1]
    ?? head.match(/encoding=["']([\w-]+)["']/i)?.[1] ?? head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ?? 'utf-8').toLowerCase();
  try { return new TextDecoder(charset).decode(buf); } catch { return new TextDecoder('utf-8').decode(buf); }
}

/** Flux d'une source (page ou flux) : tous ceux que la page annonce (6 au plus), retrouvés une fois puis mémorisés. */
const resolved = new Map<string, string[]>();
export async function feedsOf(source: string): Promise<{ url: string; body: string }[]> {
  const known = resolved.get(source);
  if (known) return Promise.all(known.map(async (url) => ({ url, body: await get(url).catch(() => '') })));
  const body = await get(source);
  if (isFeed(body)) { resolved.set(source, [source]); return [{ url: source, body }]; }
  const candidates: string[] = [];
  for (const m of body.matchAll(/<link\b[^>]*>/gi)) {
    const l = m[0];
    if (/rel=["']?alternate/i.test(l) && /application\/(rss|atom)\+xml/i.test(l)) {
      const href = l.match(/href=["']([^"']+)["']/i)?.[1];
      if (href) candidates.push(new URL(decode(href), source).href);
    }
  }
  // Liens vers des flux dans le corps de la page (icônes RSS).
  for (const m of body.matchAll(/href=["']([^"']+(?:rss|feed|\.xml)[^"']*)["']/gi)) {
    try { candidates.push(new URL(decode(m[1]), source).href); } catch {}
  }
  if (/wp-content|wordpress/i.test(body)) candidates.push(new URL('feed/', source.endsWith('/') ? source : `${source}/`).href);
  const tried = await Promise.all([...new Set(candidates)].filter((u) => /^https?:/.test(u)).slice(0, 15)
    .map(async (url) => ({ url, body: await get(url).catch(() => '') })));
  const found = tried.filter((t) => isFeed(t.body)).slice(0, 6);
  if (found.length) resolved.set(source, found.map((f) => f.url));
  return found;
}

export interface SourceStatus { source: string; feed: string; feeds: number; total: number; items: number }
let cache: { key: string; at: number; items: NewsItem[]; status: SourceStatus[] } | null = null;
let pending: Promise<void> | null = null;

const sources = () => (settings().news_feed_url || DEFAULT_NEWS_SOURCES.join('\n')).split(/\s+/).filter((u) => /^https:\/\//.test(u));

async function refresh(list: string[], key: string) {
  const status: SourceStatus[] = [];
  const all: NewsItem[] = [];
  await Promise.all(list.map(async (src) => {
    try {
      const feeds = await feedsOf(src);
      const raw = feeds.flatMap((f) => parseItems(f.body));
      const items = raw.filter((i) => !isGloomy(i)).map((i) => ({ ...i, source: host(i.link) || host(src) }));
      status.push({ source: src, feed: feeds.map((f) => f.url).join(' '), feeds: feeds.length, total: raw.length, items: items.length });
      all.push(...items);
    } catch {
      status.push({ source: src, feed: '', feeds: 0, total: 0, items: 0 });
    }
  }));
  const items = dedupe(all).sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  cache = { key, at: Date.now(), items: items.length ? items : cache?.key === key ? cache.items : [], status };
  try {
    dbRun("INSERT INTO settings (key, value) VALUES ('news_cache', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", JSON.stringify(cache));
  } catch {}
}

/** Dernier état enregistré en base (après un redémarrage du processus). */
function stored(key: string) {
  try {
    const v = JSON.parse(dbGet<{ value: string }>("SELECT value FROM settings WHERE key = 'news_cache'")?.value ?? 'null');
    return v?.key === key ? (v as typeof cache) : null;
  } catch {
    return null;
  }
}

/** Relit toutes les sources maintenant (commande de diagnostic, tâche cron). */
export async function refreshNews() {
  const list = sources();
  await refresh(list, list.join(' '));
  return cache;
}

async function load() {
  const list = sources();
  const key = list.join(' ');
  if (cache?.key !== key) cache = stored(key) ?? cache;
  const fresh = cache?.key === key && Date.now() - cache.at < 30 * 60_000;
  if (!fresh) {
    pending ??= refresh(list, key).finally(() => { pending = null; });
    // Cache périmé : on sert l'ancien contenu, la mise à jour se fait en arrière-plan ; premier appel : on attend un peu.
    if (cache?.key !== key) await Promise.race([pending, new Promise((r) => setTimeout(r, 8000))]);
  }
  return cache?.key === key ? cache : null;
}

/** Âge maximal d'un article affiché (au-delà, ou sans date, il est écarté). */
const MAX_AGE_DAYS = 30;

/** Un même article publié dans plusieurs flux (adresses différentes) : comparaison sur l'adresse sans paramètres et
 *  sur le titre normalisé (sans accents, ponctuation ni mention de source finale du type « (Ouest-France) »). */
function dedupe(items: NewsItem[]) {
  const seen = new Set<string>();
  const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\s*[(\[][^)\]]*[)\]]\s*$/, '').replace(/[^a-z0-9]+/g, ' ').trim();
  return items.filter((i) => {
    const keys = [i.link.split(/[?#]/)[0].replace(/\/$/, ''), `t:${norm(i.title)}`];
    if (keys.some((k) => seen.has(k))) return false;
    keys.forEach((k) => seen.add(k));
    return true;
  });
}

/** Derniers articles positifs, toutes sources mélangées (la moitié au plus par source si possible), triés par date.
 *  Seuls les articles de moins de MAX_AGE_DAYS jours sont retenus, sans doublon. */
export async function localNews(limit = 6): Promise<NewsItem[]> {
  const since = Date.now() - MAX_AGE_DAYS * 864e5;
  const items = dedupe((await load())?.items ?? []).filter((i) => (Date.parse(i.date) || 0) >= since);
  const out: NewsItem[] = [];
  const bySource = new Map<string, number>();
  for (const i of items) {
    if (out.length >= limit) break;
    if ((bySource.get(i.source) ?? 0) >= Math.ceil(limit / 2)) continue;
    bySource.set(i.source, (bySource.get(i.source) ?? 0) + 1);
    out.push(i);
  }
  // Une seule source disponible : on complète avec ses autres articles plutôt que de laisser des trous.
  for (const i of items) {
    if (out.length >= limit) break;
    if (!out.includes(i)) out.push(i);
  }
  // Sources mélangées, présentées du plus récent au plus ancien.
  return out.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
}

/** État des sources (Admin > SEO) : flux trouvé et nombre d'articles retenus. */
export async function newsStatus(): Promise<SourceStatus[]> {
  return (await load())?.status ?? [];
}
