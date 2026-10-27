import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { getFiche, showsContact } from '../../lib/fiches';
import { rateLimited, clientIp } from '../../lib/auth';
import { phoneDisplay, phoneHref } from '../../lib/text';
import { run } from '../../lib/db';
import { ENV } from '../../config';

// Coordonnées d'une fiche Pro ou Premium, révélées au clic (elles ne sont pas dans le code des pages) :
// demande venant du site uniquement, robots déclarés refusés, 30 affichages par heure et par visiteur au plus.
// Les refus sont comptés par jour et par IP hachée (Admin > Tableau de bord).
const BOT = /bot|crawl|spider|slurp|scrap|headless|curl|wget|python|axios|httpclient|java\/|go-http|okhttp|php/i;
const LIMIT = 30;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const deny = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
  // Même site : le navigateur l'indique (Sec-Fetch-Site) ; à défaut, l'en-tête Origin doit être celui du site.
  const site = request.headers.get('sec-fetch-site');
  const origin = request.headers.get('origin');
  if (site ? site !== 'same-origin' : origin !== new URL(ENV.siteUrl).origin) return deny(403);
  if (BOT.test(request.headers.get('user-agent') ?? '')) return deny(403);

  const [id, kind] = (await request.text()).split(':');
  if (kind !== 'phone' && kind !== 'email') return deny(400);
  const ip = clientIp(request, clientAddress);
  if (rateLimited(`contact:${ip}`, LIMIT, 3600e3)) {
    const hash = createHash('sha256').update(`${ip}:${ENV.siteUrl}`).digest('hex').slice(0, 16);
    run(`INSERT INTO contact_blocks (ip_hash, day, hits) VALUES (?, date('now'), 1)
      ON CONFLICT(ip_hash, day) DO UPDATE SET hits = hits + 1, last_at = datetime('now')`, hash);
    return deny(429);
  }
  const f = getFiche(Number(id));
  if (!f || f.status !== 'published' || !showsContact(f)) return deny(404);
  const value = kind === 'phone' ? f.phone : f.email;
  if (!value) return deny(404);
  return Response.json(
    kind === 'phone' ? { text: phoneDisplay(value), href: phoneHref(value) } : { text: value, href: `mailto:${value}` },
    { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } },
  );
};
