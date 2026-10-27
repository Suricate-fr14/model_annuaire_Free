import type { APIRoute } from 'astro';
import { all } from '../lib/db';
import { ENV } from '../config';
import { universeCounts, stats, INDEXABLE_SQL } from '../lib/fiches';
import { universeUrl, categoryUrl } from '../lib/taxonomy';

export const GET: APIRoute = () => {
  const base = ENV.siteUrl;
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: '/' }, { loc: '/annuaire' }, { loc: '/univers' }, { loc: '/villes' }, { loc: '/tarifs' }, { loc: '/creer-ma-fiche' }, { loc: '/mentions-legales' }, { loc: '/sources-et-donnees' },
  ];
  for (const u of universeCounts()) {
    if (!u.count) continue;
    urls.push({ loc: universeUrl(u) });
    for (const c of u.categories) if (c.count) urls.push({ loc: categoryUrl(u, c) });
  }
  for (const c of stats().cities) urls.push({ loc: `/ville/${c.city_slug}` });
  for (const f of all<{ slug: string; updated_at: string }>(`SELECT slug, updated_at FROM fiches WHERE ${INDEXABLE_SQL}`)) {
    urls.push({ loc: `/${f.slug}`, lastmod: f.updated_at.slice(0, 10) });
  }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `<url><loc>${esc(base + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
