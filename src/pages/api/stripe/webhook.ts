import type { APIRoute } from 'astro';
import { verifySignature, handleEvent } from '../../../lib/stripe';

// À déclarer dans Stripe : https://VOTRE-SITE/api/stripe/webhook
// Événements : checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid, charge.refunded
export const POST: APIRoute = async ({ request }) => {
  const payload = await request.text();
  if (!verifySignature(payload, request.headers.get('stripe-signature'))) {
    return new Response('Signature invalide', { status: 400 });
  }
  try {
    await handleEvent(JSON.parse(payload));
  } catch (e) {
    console.error('Webhook Stripe', e);
    return new Response('Erreur de traitement', { status: 500 }); // Stripe réessaiera
  }
  return new Response('ok');
};
