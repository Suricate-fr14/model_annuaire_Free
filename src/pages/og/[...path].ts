import type { APIRoute } from 'astro';
import { ogImage } from '../../lib/ogImage';

// Image de partage (Open Graph) d'une page : /og/accueil.png, /og/univers/…/….png, /og/ville/….png, /og/fiche/….png
export const GET: APIRoute = async ({ params }) => {
  const path = params.path ?? '';
  if (!/^[\w/-]+\.png$/.test(path)) return new Response('Introuvable', { status: 404 });
  const png = await ogImage(path.slice(0, -4)).catch(() => null);
  if (!png) return new Response('Introuvable', { status: 404 });
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' },
  });
};
