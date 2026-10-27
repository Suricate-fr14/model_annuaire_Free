import type { APIRoute } from 'astro';
import { countClick, type ClickKind } from '../../lib/fiches';
import { rateLimited, clientIp } from '../../lib/auth';
import { countSponsorClick } from '../../lib/sponsors';

const KINDS = new Set<ClickKind>(['phone', 'web', 'route', 'phone_locked']);

// Reçoit les clics (navigator.sendBeacon) : appel, site internet, itinéraire. Un clic par visiteur/fiche/type et par heure.
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const [id, kind] = (await request.text()).split(':');
  // Clic sur une mise en avant sponsorisée : « s:<id de la sponsorisation> »
  if (id === 's' && Number(kind) > 0) {
    if (!rateLimited(`sponsor:${clientIp(request, clientAddress)}:${kind}`, 1, 3600e3)) countSponsorClick(Number(kind));
    return new Response(null, { status: 204 });
  }
  const n = Number(id);
  if (n > 0 && KINDS.has(kind as ClickKind) && !rateLimited(`click:${clientIp(request, clientAddress)}:${n}:${kind}`, 1, 3600e3)) {
    countClick(n, kind as ClickKind);
  }
  return new Response(null, { status: 204 });
};
