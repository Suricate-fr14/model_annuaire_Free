import type { APIRoute } from 'astro';
import { suggest } from '../../lib/fiches';

export const GET: APIRoute = ({ url }) => {
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
  const items = q.length >= 2 ? suggest(q, 7) : [];
  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  });
};
