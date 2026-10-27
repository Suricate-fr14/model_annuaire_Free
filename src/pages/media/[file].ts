import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { uploadFilePath, mimeOf } from '../../lib/uploads';

// Sert les images envoyées par les utilisateurs (logos, galeries).
export const GET: APIRoute = ({ params }) => {
  const path = uploadFilePath(params.file ?? '');
  if (!path) return new Response('Introuvable', { status: 404 });
  return new Response(readFileSync(path), {
    headers: { 'Content-Type': mimeOf(path), 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
};
