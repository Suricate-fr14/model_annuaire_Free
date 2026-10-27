// Configure Stripe automatiquement à partir de la seule clé secrète :
// produits Pro et Premium, 4 prix récurrents TTC, webhook et portail client, puis écrit les identifiants dans .env.
// Usage : renseigner STRIPE_SECRET_KEY (et SITE_URL) dans .env, puis `npm run stripe:setup`.
// Relançable sans risque : ce qui existe déjà est réutilisé (prix retrouvés par lookup_key, webhook par URL).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { SITE, PLANS, ENV, type PlanKey, type Interval } from '../src/config.ts';

const KEY = ENV.stripeKey;
const SITE_URL = ENV.siteUrl;
const ENV_FILE = '.env';
const EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'charge.refunded',
];

if (!KEY.startsWith('sk_')) {
  console.error('STRIPE_SECRET_KEY absente ou invalide dans .env (elle commence par sk_test_ ou sk_live_).');
  process.exit(1);
}
const live = KEY.startsWith('sk_live_');
if (!SITE_URL.startsWith('https://')) {
  console.warn(`Attention : SITE_URL = ${SITE_URL}. Stripe ne peut pas joindre cette adresse ; le webhook ne fonctionnera`);
  console.warn("qu'avec l'URL publique du site (SITE_URL). En local, utiliser `stripe listen`.\n");
}

async function stripe(path: string, params: Record<string, string | string[]> = {}, method = 'POST') {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) for (const x of [v].flat()) body.append(k, x);
  const url = `https://api.stripe.com/v1/${path}${method === 'GET' && body.size ? `?${body}` : ''}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : body,
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data?.error?.message ?? `Stripe ${res.status}`), { status: res.status });
  return data;
}

const out: Record<string, string> = {};
const ttc = (ht: number) => Math.round(ht * (1 + SITE.billing.vatRate / 100) * 100);

// 1. Produits et prix
for (const plan of Object.keys(PLANS) as PlanKey[]) {
  const productId = `annuaire_${plan}`;
  try {
    await stripe(`products/${productId}`, {}, 'GET');
  } catch (e: any) {
    if (e.status !== 404) throw e;
    await stripe('products', { id: productId, name: `Fiche ${PLANS[plan].name} – ${SITE.fullName}` });
    console.log(`Produit créé : ${PLANS[plan].name}`);
  }
  for (const interval of ['month', 'year'] as Interval[]) {
    const lookup = `annuaire_${plan}_${interval}`;
    const amount = ttc(PLANS[plan][interval]);
    const found = (await stripe('prices', { 'lookup_keys[]': lookup, active: 'true' }, 'GET')).data[0];
    let price = found;
    if (!found || found.unit_amount !== amount) {
      price = await stripe('prices', {
        product: productId,
        currency: 'eur',
        unit_amount: String(amount),
        tax_behavior: 'inclusive',
        'recurring[interval]': interval,
        lookup_key: lookup,
        transfer_lookup_key: 'true',
      });
      console.log(`Prix créé : ${PLANS[plan].name} ${interval === 'year' ? 'annuel' : 'mensuel'} ${(amount / 100).toFixed(2)} € TTC`);
    }
    out[`STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`] = price.id;
  }
}

// 2. Webhook (le secret n'est lisible qu'à la création : sans secret connu, l'ancien point est recréé)
const hookUrl = `${SITE_URL}/api/stripe/webhook`;
const hooks = (await stripe('webhook_endpoints', { limit: '100' }, 'GET')).data as any[];
const existing = hooks.find((h) => h.url === hookUrl);
if (existing && ENV.stripeWebhookSecret) {
  await stripe(`webhook_endpoints/${existing.id}`, { 'enabled_events[]': EVENTS });
  console.log('Webhook existant mis à jour (secret inchangé).');
} else {
  if (existing) await stripe(`webhook_endpoints/${existing.id}`, {}, 'DELETE');
  const hook = await stripe('webhook_endpoints', { url: hookUrl, 'enabled_events[]': EVENTS, description: SITE.fullName });
  out.STRIPE_WEBHOOK_SECRET = hook.secret;
  console.log(`Webhook créé : ${hookUrl}`);
}

// 3. Portail client : carte bancaire, changement de formule avec prorata, résiliation en fin de période
const portal: Record<string, string> = {
  'business_profile[privacy_policy_url]': `${SITE_URL}/confidentialite`,
  'business_profile[terms_of_service_url]': `${SITE_URL}/cgu`,
  'features[payment_method_update][enabled]': 'true',
  'features[invoice_history][enabled]': 'false', // la facture officielle est celle d'Axonaut
  'features[customer_update][enabled]': 'false', // coordonnées modifiées dans Mon compte > Paramètres
  'features[subscription_cancel][enabled]': 'true',
  'features[subscription_cancel][mode]': 'at_period_end',
  'features[subscription_update][enabled]': 'true',
  'features[subscription_update][default_allowed_updates][0]': 'price',
  'features[subscription_update][proration_behavior]': 'create_prorations',
};
(Object.keys(PLANS) as PlanKey[]).forEach((plan, i) => {
  portal[`features[subscription_update][products][${i}][product]`] = `annuaire_${plan}`;
  portal[`features[subscription_update][products][${i}][prices][0]`] = out[`STRIPE_PRICE_${plan.toUpperCase()}_MONTH`];
  portal[`features[subscription_update][products][${i}][prices][1]`] = out[`STRIPE_PRICE_${plan.toUpperCase()}_YEAR`];
});
const currentPortal = ENV.stripePortalConfig;
let portalId = '';
if (currentPortal) {
  try {
    portalId = (await stripe(`billing_portal/configurations/${currentPortal}`, portal)).id;
    console.log('Portail client mis à jour.');
  } catch (e: any) {
    if (e.status !== 404) throw e;
  }
}
if (!portalId) {
  portalId = (await stripe('billing_portal/configurations', portal)).id;
  console.log('Portail client créé.');
}
out.STRIPE_PORTAL_CONFIG = portalId;

// 4. Écriture dans .env
let text = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
for (const [k, v] of Object.entries(out)) {
  const re = new RegExp(`^${k}=.*$`, 'm');
  text = re.test(text) ? text.replace(re, `${k}=${v}`) : `${text.replace(/\n?$/, '\n')}${k}=${v}\n`;
}
writeFileSync(ENV_FILE, text);

console.log(`\nStripe configuré en mode ${live ? 'LIVE' : 'TEST'}. Valeurs écrites dans ${ENV_FILE} :`);
for (const [k, v] of Object.entries(out)) console.log(`  ${k}=${k === 'STRIPE_WEBHOOK_SECRET' ? `${v.slice(0, 10)}…` : v}`);
console.log("\nReste à faire : redémarrer l'application.");
if (live) console.log('Et dans Stripe > Paramètres > Emails clients : désactiver l\'envoi des factures (la facture officielle est celle d\'Axonaut).');
