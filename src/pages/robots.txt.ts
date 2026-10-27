import type { APIRoute } from 'astro';
import { ENV } from '../config';

export const GET: APIRoute = () =>
  new Response(
    ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /compte', 'Disallow: /api/', 'Disallow: /recherche', 'Disallow: /paiement', '', `Sitemap: ${ENV.siteUrl}/sitemap.xml`].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
