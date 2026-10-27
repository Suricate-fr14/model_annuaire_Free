import type { APIRoute } from 'astro';
import { emailSamples } from '../../../lib/emailSamples';
import { renderMail } from '../../../lib/emailLayout';
import { get } from '../../../lib/db';

// Aperçu HTML d'un modèle (?m=clé) ou d'un email envoyé (?id=…), pour Admin > Emails.
export const GET: APIRoute = ({ url }) => {
  const id = Number(url.searchParams.get('id'));
  let html = '';
  if (id) html = get<{ html: string }>('SELECT html FROM outbox WHERE id = ?', id)?.html ?? '';
  else {
    const s = emailSamples().find((x) => x.key === url.searchParams.get('m'));
    if (s) html = renderMail(s.content).html;
  }
  if (!html) return new Response('Aperçu indisponible.', { status: 404 });
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; frame-ancestors 'self'; base-uri 'none'", 'X-Frame-Options': 'SAMEORIGIN' } });
};
