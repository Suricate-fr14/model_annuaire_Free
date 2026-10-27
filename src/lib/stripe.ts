// Abonnement Pro via Stripe (API REST, sans SDK). Sans clés configurées : mode démo (paiement simulé).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { run, get } from './db.ts';
import { ENV, stripeEnabled, PLANS, type PlanKey, type Interval } from '../config.ts';
import { getFiche } from './fiches.ts';
import { send, notifyAdmins } from './mail.ts';
import { formulaMail, type FormulaEvent } from './emails.ts';
import { recordStripeInvoice, markRefunded } from './billing.ts';

async function stripe(path: string, params: Record<string, string> = {}, method = 'POST') {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${ENV.stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe ${res.status}`);
  return data;
}

/** URL vers laquelle rediriger le client pour souscrire l'abonnement d'une fiche. */
export async function checkoutUrl(fiche: { id: number; stripe_customer: string }, email: string, plan: PlanKey, interval: Interval) {
  if (!stripeEnabled()) return `/paiement/demo?fiche=${fiche.id}&formule=${plan}&periode=${interval}`;
  const price = ENV.stripePrice(plan, interval);
  if (!price) throw new Error(`Prix Stripe manquant : STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`);
  const params: Record<string, string> = {
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    success_url: `${ENV.siteUrl}/paiement/succes?fiche=${fiche.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${ENV.siteUrl}/compte/fiches/${fiche.id}/abonnement?annule=1`,
    client_reference_id: String(fiche.id),
    'metadata[fiche_id]': String(fiche.id),
    'subscription_data[metadata][fiche_id]': String(fiche.id),
    'metadata[plan]': plan,
    'metadata[interval]': interval,
    'subscription_data[metadata][plan]': plan,
    allow_promotion_codes: 'true',
    // Carte uniquement : le règlement est déclaré « carte » dans Axonaut (pas de Klarna, PayPal…).
    'payment_method_types[0]': 'card',
    locale: 'fr',
    // Coordonnées nécessaires à une facture entre professionnels (émise ensuite dans Axonaut).
    billing_address_collection: 'required',
    'tax_id_collection[enabled]': 'true',
  };
  if (fiche.stripe_customer && fiche.stripe_customer !== 'demo') {
    params.customer = fiche.stripe_customer;
    params['customer_update[address]'] = 'auto';
    params['customer_update[name]'] = 'auto';
  } else params.customer_email = email;
  const session = await stripe('checkout/sessions', params);
  return session.url as string;
}

/** Paiement confirmé d'une session Checkout (page de remerciement, événement purchase), ou null. */
export async function checkoutSummary(sessionId: string, ficheId: number) {
  if (!stripeEnabled() || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  try {
    const s = await stripe(`checkout/sessions/${sessionId}`, {}, 'GET');
    if (Number(s.metadata?.fiche_id) !== ficheId || s.status !== 'complete') return null;
    return {
      id: s.id as string,
      totalTtc: (s.amount_total ?? 0) / 100,
      plan: (s.metadata?.plan === 'premium' ? 'premium' : 'pro') as PlanKey,
      interval: (s.metadata?.interval === 'month' ? 'month' : 'year') as Interval,
    };
  } catch {
    return null;
  }
}

/** Portail client Stripe (changer de carte, factures, résiliation). */
export async function portalUrl(fiche: { id: number; stripe_customer: string }) {
  if (!stripeEnabled() || !fiche.stripe_customer) return `/paiement/demo?fiche=${fiche.id}&gerer=1`;
  const params: Record<string, string> = {
    customer: fiche.stripe_customer,
    return_url: `${ENV.siteUrl}/compte/fiches/${fiche.id}/abonnement`,
  };
  if (ENV.stripePortalConfig) params.configuration = ENV.stripePortalConfig;
  const s = await stripe('billing_portal/sessions', params);
  return s.url as string;
}

const STATUS: Record<string, 'active' | 'past_due' | 'canceled'> = {
  active: 'active', trialing: 'active', past_due: 'past_due', unpaid: 'past_due',
  canceled: 'canceled', incomplete_expired: 'canceled', incomplete: 'canceled', paused: 'canceled',
};

/** Formule déduite du prix souscrit (fiable même après un changement de formule dans le portail Stripe). */
function planOfSubscription(sub: any): PlanKey {
  const priceId = sub.items?.data?.[0]?.price?.id;
  for (const key of Object.keys(PLANS) as PlanKey[]) {
    if (priceId && (priceId === ENV.stripePrice(key, 'month') || priceId === ENV.stripePrice(key, 'year'))) return key;
  }
  return sub.metadata?.plan === 'premium' ? 'premium' : 'pro';
}

async function applySubscription(sub: any) {
  const ficheId = Number(sub.metadata?.fiche_id);
  if (!ficheId) return;
  const plan = planOfSubscription(sub);
  const interval = sub.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'year' : 'month';
  const status = STATUS[sub.status] ?? 'canceled';
  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  const until = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
  // Formule payée ; la formule effective tient compte d'une éventuelle formule offerte (lib/formula.ts).
  run(
    `UPDATE fiches SET paid_status = ?, paid_until = ?, paid_plan = ?, pro_interval = ?, stripe_subscription = ?, stripe_customer = ?, updated_at = datetime('now') WHERE id = ?`,
    sub.cancel_at_period_end && status === 'active' ? 'canceled' : status, until, plan, interval, sub.id, String(sub.customer ?? ''), ficheId,
  );
  await (await import('./formula.ts')).applyFormula(ficheId);
  clearWanted(ficheId);
}

const clearWanted = (id: number) =>
  run("UPDATE fiches SET wanted_plan = '', wanted_interval = '' WHERE id = ? AND pro_status = 'active'", id);

// --- Notifications de changement de formule (propriétaire + administrateurs) ---

type Snap = { status: string; plan: string } | null;

export async function notifyChange(ficheId: number, before: Snap) {
  const f = getFiche(ficheId);
  if (!f || !before) return;
  if (before.status === f.pro_status && before.plan === f.plan) return;
  const wasPaid = before.status === 'active' || before.status === 'past_due';
  // Formule offerte en cours (et pas d'abonnement payé actif) : l'email le dit.
  const gift = Boolean(f.gift_plan) && (!f.gift_until || f.gift_until > new Date().toISOString())
    && !(f.paid_status === 'active' || f.paid_status === 'past_due');
  let e: FormulaEvent;
  if (f.pro_status === 'active' && !wasPaid) e = { kind: 'activated', plan: f.plan, gift, giftUntil: f.gift_until };
  else if (f.pro_status === 'active' && before.plan !== f.plan) e = { kind: 'changed', from: before.plan, plan: f.plan };
  else if (f.pro_status === 'canceled') e = { kind: 'canceled', plan: f.plan, until: f.pro_until };
  else if (f.pro_status === 'past_due') e = { kind: 'past_due', plan: f.plan };
  else if (f.pro_status === 'none') e = { kind: 'ended', plan: before.plan, wasGift: !f.stripe_subscription };
  else return;
  const owner = f.owner_id ? get<{ email: string; name: string }>('SELECT email, name FROM users WHERE id = ?', f.owner_id) : null;
  const mail = formulaMail(f, e, owner?.name);
  if (owner) await send(owner.email, mail);
  await notifyAdmins(mail.subject, `« ${f.name} » : ${mail.content.title}.\n\nAdmin : ${ENV.siteUrl}/admin/fiches/${f.id}`);
}


/** Vérifie la signature Stripe-Signature (HMAC SHA-256, tolérance 5 min). */
export function verifySignature(payload: string, header: string | null) {
  if (!header || !ENV.stripeWebhookSecret) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac('sha256', ENV.stripeWebhookSecret).update(`${t}.${payload}`).digest('hex');
  const candidates = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  return candidates.some((c) => c.length === expected.length && timingSafeEqual(Buffer.from(c), Buffer.from(expected)));
}

export async function handleEvent(event: any) {
  if (get('SELECT 1 FROM stripe_events WHERE id = ?', event.id)) return; // déjà traité
  run('INSERT INTO stripe_events (id, type) VALUES (?, ?)', event.id, event.type);
  const obj = event.data?.object;
  if (event.type === 'checkout.session.completed' && obj?.subscription) {
    await applySubscription(await stripe(`subscriptions/${obj.subscription}`, {}, 'GET'));
  } else if (event.type.startsWith('customer.subscription.')) {
    await applySubscription(obj);
  } else if (event.type === 'invoice.paid') {
    await recordStripeInvoice(obj);
  } else if (event.type === 'charge.refunded') {
    await markRefunded(obj);
  }
}

// --- Mode démo : simule l'abonnement sans paiement ---

export async function demoActivate(ficheId: number, plan: PlanKey, interval: Interval) {
  const until = new Date(Date.now() + (interval === 'year' ? 365 : 30) * 864e5).toISOString();
  run("UPDATE fiches SET paid_status = 'active', paid_until = ?, paid_plan = ?, pro_interval = ?, stripe_customer = 'demo', updated_at = datetime('now') WHERE id = ?", until, plan, interval, ficheId);
  await (await import('./formula.ts')).applyFormula(ficheId);
  clearWanted(ficheId);
}
export async function demoCancel(ficheId: number) {
  run("UPDATE fiches SET paid_status = 'canceled', updated_at = datetime('now') WHERE id = ?", ficheId);
  await (await import('./formula.ts')).applyFormula(ficheId);
}
export async function demoEndNow(ficheId: number) {
  run("UPDATE fiches SET paid_status = 'none', paid_until = NULL, paid_plan = '', pro_interval = '', updated_at = datetime('now') WHERE id = ?", ficheId);
  await (await import('./formula.ts')).applyFormula(ficheId);
}
