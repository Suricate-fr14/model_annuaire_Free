// Crée un code promo Stripe utilisable sur la page de paiement (les sessions Checkout acceptent les codes).
// Usage : npm run stripe:promo -- --code=PROMO20 --pourcent=20 --formule=pro --fin=2026-11-30
//   --pourcent  réduction en %
//   --formule   pro, premium ou toutes (défaut : toutes)
//   --fin       dernier jour où le code peut être utilisé (facultatif)
//   --mois      durée de la réduction en mois ; 0 (défaut) = première échéance seulement (1er mois, ou 1re année en annuel)
//   --max       nombre maximal d'utilisations (facultatif)
// Réservé aux nouveaux clients.
import { ENV } from '../src/config.ts';

const arg = (k: string, d = '') => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const code = arg('code', 'PROMO20').toUpperCase();
const percent = Number(arg('pourcent', '0'));
const months = Number(arg('mois', '0'));
const max = Number(arg('max', '0'));
const end = arg('fin');
const plan = arg('formule', 'toutes');
const products = plan === 'pro' ? ['annuaire_pro'] : plan === 'premium' ? ['annuaire_premium'] : ['annuaire_pro', 'annuaire_premium'];

if (!ENV.stripeKey.startsWith('sk_')) { console.error('STRIPE_SECRET_KEY absente du .env.'); process.exit(1); }
if (!/^[A-Z0-9_-]{3,30}$/.test(code) || !(percent > 0 && percent <= 100) || months < 0 || max < 0 || !['pro', 'premium', 'toutes'].includes(plan)
  || (end && !/^\d{4}-\d{2}-\d{2}$/.test(end))) { console.error('Paramètres invalides (voir l’en-tête du script).'); process.exit(1); }

async function stripe(path: string, params: Record<string, string> = {}, method = 'POST') {
  const body = new URLSearchParams(params);
  const res = await fetch(`https://api.stripe.com/v1/${path}${method === 'GET' ? `?${body}` : ''}`, {
    // Version d'API fixée : format des coupons et codes promo connu (il a évolué dans les versions récentes).
    method, headers: { Authorization: `Bearer ${ENV.stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2024-06-20' },
    body: method === 'GET' ? undefined : body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe ${res.status}`);
  return data;
}

const existing = (await stripe('promotion_codes', { code, limit: '1' }, 'GET')).data[0];
if (existing) {
  console.log(`Le code ${code} existe déjà dans Stripe (${existing.active ? 'actif' : 'inactif'}, utilisé ${existing.times_redeemed} fois). Rien n'a été créé.`);
  process.exit(0);
}
const coupon = await stripe('coupons', {
  name: `${code} : -${percent} %${plan === 'toutes' ? '' : ` ${plan}`}${months ? ` pendant ${months} mois` : ''}`,
  percent_off: String(percent),
  ...(months ? { duration: 'repeating', duration_in_months: String(months) } : { duration: 'once' }),
  ...Object.fromEntries(products.map((p, i) => [`applies_to[products][${i}]`, p])),
});
const promo = await stripe('promotion_codes', {
  coupon: coupon.id, code, ...(max && { max_redemptions: String(max) }),
  'restrictions[first_time_transaction]': 'true',
  ...(end && { expires_at: String(Math.floor(new Date(`${end}T23:59:59`).getTime() / 1000)) }),
});
console.log(`Code ${promo.code} créé : -${percent} % sur ${plan === 'toutes' ? 'Pro et Premium' : plan === 'pro' ? 'Pro' : 'Premium'}, ${months ? `pendant ${months} mois` : 'sur la première échéance'}${max ? `, ${max} utilisations max` : ''}${end ? `, utilisable jusqu'au ${end} inclus` : ''}, nouveaux clients uniquement.`);
console.log("Pour l'afficher sur le site : Admin > Facturation > Offres promotionnelles.");
