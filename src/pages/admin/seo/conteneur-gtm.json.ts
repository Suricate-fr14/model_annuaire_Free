import type { APIRoute } from 'astro';
import { settings } from '../../../lib/settings';
import { gtmContainer } from '../../../lib/analytics';

// Conteneur GTM du plan de taggage (accès réservé aux administrateurs par le middleware).
export const GET: APIRoute = () => {
  const { ga4_id, gtm_id } = settings();
  if (!ga4_id) return new Response('Renseignez d’abord l’ID de mesure GA4 dans Admin > SEO.', { status: 400 });
  return new Response(JSON.stringify(gtmContainer(ga4_id, gtm_id), null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="conteneur-gtm-annuaire.json"',
    },
  });
};
