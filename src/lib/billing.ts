// Facturation : chaque paiement Stripe réussi (souscription, renouvellement, changement de formule) devient une
// facture officielle dans Axonaut, plateforme agréée qui la numérote, l'envoie et la transmet en facture électronique.
// Les paiements sont d'abord enregistrés localement : sans clé Axonaut ou en cas d'erreur, ils restent « en attente »
// et sont renvoyés depuis Admin > Facturation ou par `npm run billing:retry`.
import { all, get, run } from './db.ts';
import { ENV, SITE, PLANS, axonautEnabled, type PlanKey, type Interval } from '../config.ts';
import * as ax from './axonaut.ts';
import { notifyAdmins } from './mail.ts';

export interface BillingRow {
  id: number; stripe_invoice_id: string; stripe_customer: string; stripe_subscription: string; stripe_charge: string;
  fiche_id: number | null; user_id: number | null; plan: string; interval: string; amount_ttc_cents: number; vat_rate: number;
  period_start: string | null; period_end: string | null; paid_at: string; customer_json: string; status: string; error: string;
  attempts: number; axonaut_invoice_id: number | null; axonaut_number: string; axonaut_url: string; created_at: string;
}

const day = (ts?: number | null) => (ts ? new Date(ts * 1000).toISOString().slice(0, 10) : null);
const round2 = (n: number) => Math.round(n * 100) / 100;
export const amountHt = (ttcCents: number, vat: number) => round2(ttcCents / 100 / (1 + vat / 100));

/** Formule et périodicité d'après le prix Stripe facturé. */
function planOfPrice(priceId: string): { plan: PlanKey; interval: Interval } | null {
  for (const plan of Object.keys(PLANS) as PlanKey[]) {
    for (const interval of ['month', 'year'] as Interval[]) if (priceId && ENV.stripePrice(plan, interval) === priceId) return { plan, interval };
  }
  return null;
}

/** Webhook invoice.paid : enregistre le paiement (idempotent) puis tente la création de la facture Axonaut. */
export async function recordStripeInvoice(inv: any) {
  if (!inv?.id || get('SELECT 1 FROM billing_invoices WHERE stripe_invoice_id = ?', inv.id)) return;
  const line = inv.lines?.data?.find((l: any) => l.amount > 0) ?? inv.lines?.data?.[0];
  const subId: string = inv.subscription ?? inv.parent?.subscription_details?.subscription ?? line?.subscription ?? '';
  const meta = inv.subscription_details?.metadata ?? inv.parent?.subscription_details?.metadata ?? line?.metadata ?? {};
  const priceId: string = line?.price?.id ?? line?.pricing?.price_details?.price ?? '';
  const pi = planOfPrice(priceId) ?? { plan: meta.plan === 'premium' ? 'premium' : 'pro', interval: line?.price?.recurring?.interval === 'year' ? 'year' : 'month' };

  // Fiche concernée : métadonnée de l'abonnement, sinon abonnement ou client Stripe enregistrés sur la fiche.
  const fiche = get<{ id: number; owner_id: number | null }>(
    `SELECT id, owner_id FROM fiches WHERE id = ? OR (stripe_subscription <> '' AND stripe_subscription = ?) OR (stripe_customer <> '' AND stripe_customer = ?) LIMIT 1`,
    Number(meta.fiche_id) || -1, subId, String(inv.customer ?? ''),
  );
  const customer = {
    name: inv.customer_name ?? '', email: inv.customer_email ?? '',
    address: inv.customer_address ?? null,
    tax_ids: (inv.customer_tax_ids ?? []).map((t: any) => t.value).filter(Boolean),
  };
  const amount = Number(inv.amount_paid ?? 0);
  run(
    `INSERT INTO billing_invoices (stripe_invoice_id, stripe_customer, stripe_subscription, stripe_charge, fiche_id, user_id, plan, interval,
       amount_ttc_cents, vat_rate, period_start, period_end, paid_at, customer_json, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    inv.id, String(inv.customer ?? ''), subId, String(inv.charge ?? ''), fiche?.id ?? null, fiche?.owner_id ?? null, pi.plan, pi.interval,
    amount, SITE.billing.vatRate, day(line?.period?.start), day(line?.period?.end),
    day(inv.status_transitions?.paid_at) ?? new Date().toISOString().slice(0, 10), JSON.stringify(customer),
    amount > 0 ? 'pending' : 'skipped',
  );
  const row = get<BillingRow>('SELECT * FROM billing_invoices WHERE stripe_invoice_id = ?', inv.id)!;
  if (row.status === 'pending' && axonautEnabled()) await syncToAxonaut(row.id);
}

/** Coordonnées de facturation : profil du pro, sinon celles saisies au paiement Stripe, sinon la fiche. */
function billingIdentity(row: BillingRow) {
  const u = row.user_id ? get<any>('SELECT * FROM users WHERE id = ?', row.user_id) : null;
  const f = row.fiche_id ? get<any>('SELECT name, street, postcode, city, siret FROM fiches WHERE id = ?', row.fiche_id) : null;
  const c = JSON.parse(row.customer_json || '{}');
  const addr = c.address ?? {};
  const street = u?.billing_street || [addr.line1, addr.line2].filter(Boolean).join(', ') || f?.street || '';
  return {
    internalId: u ? `annuaire-user-${u.id}` : `annuaire-stripe-${row.stripe_customer}`,
    name: u?.billing_name || c.name || f?.name || u?.name || 'Client annuaire',
    street,
    zip: u?.billing_zip || addr.postal_code || f?.postcode || '',
    city: u?.billing_city || addr.city || f?.city || '',
    country: u?.billing_country || (addr.country === 'FR' || !addr.country ? 'France' : addr.country),
    siret: u?.billing_siret || f?.siret || '',
    vat: u?.billing_vat || c.tax_ids?.[0] || '',
    email: u?.email || c.email || '',
    contactName: u?.name || c.name || '',
    userId: u?.id ?? null,
    axonautCompanyId: u?.axonaut_company_id ?? null,
    ficheName: f?.name ?? '',
  };
}

/** Crée (ou retrouve) le client, le produit, la facture et le règlement dans Axonaut. */
export async function syncToAxonaut(id: number): Promise<{ ok: boolean; error?: string }> {
  const row = get<BillingRow>('SELECT * FROM billing_invoices WHERE id = ?', id);
  if (!row || row.status === 'sent' || row.status === 'skipped' || row.status === 'refunded') return { ok: true };
  run("UPDATE billing_invoices SET attempts = attempts + 1, updated_at = datetime('now') WHERE id = ?", id);
  try {
    const who = billingIdentity(row);
    if (!who.street || !who.zip || !who.city) throw new Error('Adresse de facturation incomplète : à renseigner par le pro (Paramètres) ou dans la fiche client.');

    let companyId = who.axonautCompanyId as number | null;
    if (!companyId) {
      companyId = (await ax.findCompany(who.internalId))?.id ?? (await ax.createCompany(who)).id;
      if (who.userId) run('UPDATE users SET axonaut_company_id = ? WHERE id = ?', companyId, who.userId);
    }

    const plan = PLANS[(row.plan as PlanKey) || 'pro'];
    const per = row.interval === 'year' ? 'annuel' : 'mensuel';
    const ht = amountHt(row.amount_ttc_cents, row.vat_rate);
    const label = `${SITE.fullName} : formule ${plan.name} (abonnement ${per})`;
    const product = await ax.findOrCreateProduct({
      internalId: `annuaire-${plan.key}-${row.interval}`, code: `ANN-${plan.key.toUpperCase()}-${row.interval === 'year' ? 'AN' : 'MOIS'}`,
      name: label, priceHt: ht, vatRate: row.vat_rate, description: plan.perks.join(' · '),
    });
    const period = row.period_start && row.period_end
      ? `Période du ${new Date(row.period_start).toLocaleDateString('fr-FR')} au ${new Date(row.period_end).toLocaleDateString('fr-FR')}` : '';
    const invoice = await ax.createInvoice({
      companyId, date: new Date().toISOString().slice(0, 10), serviceStart: row.period_start ?? undefined, serviceEnd: row.period_end ?? undefined,
      orderNumber: row.stripe_invoice_id, productId: product.id, label,
      description: [who.ficheName && `Fiche « ${who.ficheName} »`, period].filter(Boolean).join(' · '),
      priceHt: ht, vatRate: row.vat_rate,
      mandatoryMentions: SITE.billing.mandatoryMentions, paymentTerms: SITE.billing.paymentTerms,
    });
    await ax.addCardPayment(invoice.id, row.amount_ttc_cents / 100, row.stripe_charge || row.stripe_invoice_id, row.paid_at);
    run(
      `UPDATE billing_invoices SET status = 'sent', error = '', axonaut_invoice_id = ?, axonaut_number = ?, axonaut_url = ?, updated_at = datetime('now') WHERE id = ?`,
      invoice.id, invoice.number ?? '', invoice.customer_portal_url ?? invoice.public_path ?? '', id,
    );
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message.slice(0, 500);
    run("UPDATE billing_invoices SET status = 'error', error = ?, updated_at = datetime('now') WHERE id = ?", msg, id);
    if (row.attempts === 0) await notifyAdmins('Facture Axonaut non créée', `Paiement Stripe ${row.stripe_invoice_id} : ${msg}\n\n${ENV.siteUrl}/admin/facturation`);
    return { ok: false, error: msg };
  }
}

/** Renvoie toutes les factures en attente ou en erreur (dans l'ordre des paiements : Axonaut impose des dates croissantes). */
export async function retryAll() {
  const rows = all<{ id: number }>("SELECT id FROM billing_invoices WHERE status IN ('pending', 'error') ORDER BY paid_at, id");
  // Sans clé, rien n'est tenté : les paiements restent « en attente » (pas de fausse erreur ni d'alerte).
  if (!axonautEnabled()) return { total: rows.length, ok: 0, noKey: true };
  let ok = 0;
  for (const r of rows) if ((await syncToAxonaut(r.id)).ok) ok++;
  return { total: rows.length, ok };
}

/** Remboursement Stripe : marqué ici, l'avoir est à émettre dans Axonaut (pas d'API d'avoir). */
export async function markRefunded(charge: any) {
  const row = get<BillingRow>("SELECT * FROM billing_invoices WHERE stripe_charge = ? OR stripe_invoice_id = ?", String(charge?.id ?? ''), String(charge?.invoice ?? ''));
  if (!row) return;
  run("UPDATE billing_invoices SET status = 'refunded', updated_at = datetime('now') WHERE id = ?", row.id);
  await notifyAdmins('Remboursement : avoir à émettre dans Axonaut',
    `Le paiement ${row.stripe_invoice_id} (${(row.amount_ttc_cents / 100).toFixed(2)} € TTC) a été remboursé dans Stripe.\nFacture Axonaut : ${row.axonaut_number || 'non créée'}.\nÉmettez l'avoir correspondant dans Axonaut.\n\n${ENV.siteUrl}/admin/facturation`);
}

export const invoicesOfUser = (userId: number) =>
  all<BillingRow & { fiche_name: string | null }>(
    `SELECT b.*, f.name AS fiche_name FROM billing_invoices b LEFT JOIN fiches f ON f.id = b.fiche_id
     WHERE b.user_id = ? AND b.status IN ('sent', 'pending', 'error', 'refunded') ORDER BY b.paid_at DESC, b.id DESC`, userId);
