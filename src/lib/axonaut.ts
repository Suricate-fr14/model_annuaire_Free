// Client minimal de l'API Axonaut v2 (https://axonaut.com/api/v2/doc). Authentification : en-tête userApiKey.
import { ENV } from '../config.ts';

export class AxonautError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

async function call<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  if (!ENV.axonautKey) throw new AxonautError('Clé API Axonaut absente (AXONAUT_API_KEY)');
  const res = await fetch(`${ENV.axonautUrl}${path}`, {
    method,
    headers: { userApiKey: ENV.axonautKey, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const raw = typeof data === 'object' && data ? data.error ?? data.message ?? data.detail ?? data : data;
    const detail = (typeof raw === 'string' ? raw : JSON.stringify(raw)).slice(0, 300);
    throw new AxonautError(`Axonaut ${method} ${path} : HTTP ${res.status} ${detail}`, res.status);
  }
  return data as T;
}

/** Date au format RFC 3339 exigé par Axonaut (« 2026-10-01 » → « 2026-10-01T12:00:00+00:00 » : midi évite tout décalage de jour). */
const rfc3339 = (d?: string) => (d ? `${d.slice(0, 10)}T12:00:00+00:00` : undefined);

export interface AxCompany { id: number; name: string; internal_id?: string }
export interface AxProduct { id: number; internal_id?: string }
export interface AxInvoice { id: number; number: string; public_path: string | null; customer_portal_url: string | null; total: number }

/**
 * Recherche par internal_id. Axonaut répond 404 quand rien ne correspond ; on vérifie aussi l'internal_id
 * de l'élément renvoyé pour ne jamais rattacher un autre client ou produit si le filtre était ignoré.
 */
async function findByInternalId<T extends { internal_id?: string }>(path: string, internalId: string): Promise<T | null> {
  try {
    const r = await call<unknown>(`${path}?internal_id=${encodeURIComponent(internalId)}`);
    const list = (Array.isArray(r) ? r : r ? [r] : []) as T[];
    return list.find((x) => x?.internal_id === internalId) ?? null;
  } catch (e) {
    if (e instanceof AxonautError && e.status === 404) return null;
    throw e;
  }
}

export function findCompany(internalId: string) {
  return findByInternalId<AxCompany>('/api/v2/companies', internalId);
}

export function createCompany(c: {
  name: string; street: string; zip: string; city: string; country: string; siret: string; vat: string;
  internalId: string; email: string; contactName: string;
}) {
  const [firstname, ...rest] = c.contactName.trim().split(/\s+/);
  return call<AxCompany>('/api/v2/companies', 'POST', {
    name: c.name,
    address_street: c.street,
    address_zip_code: c.zip,
    address_city: c.city,
    address_country: c.country || 'France',
    siret: c.siret || undefined,
    intracommunity_number: c.vat || undefined,
    is_customer: true,
    is_prospect: false,
    isB2C: false,
    internal_id: c.internalId,
    categories: ['Annuaire'],
    employees: [{ firstname: firstname || c.name, lastname: rest.join(' '), email: c.email, is_billing_contact: true }],
  });
}

export function updateCompany(id: number, c: { name: string; street: string; zip: string; city: string; country: string; siret: string; vat: string }) {
  return call<AxCompany>(`/api/v2/companies/${id}`, 'PATCH', {
    name: c.name, address_street: c.street, address_zip_code: c.zip, address_city: c.city, address_country: c.country || 'France',
    siret: c.siret || undefined, intracommunity_number: c.vat || undefined,
  });
}

export async function findOrCreateProduct(p: { internalId: string; code: string; name: string; priceHt: number; vatRate: number; description: string }) {
  const found = await findByInternalId<AxProduct>('/api/v2/products', p.internalId);
  if (found) return found;
  return call<AxProduct>('/api/v2/products', 'POST', {
    name: p.name, price: p.priceHt, tax_rate: p.vatRate, description: p.description,
    internal_id: p.internalId, product_code: p.code, unit: 'abonnement',
  });
}

export function createInvoice(inv: {
  companyId: number; date: string; serviceStart?: string; serviceEnd?: string; orderNumber: string;
  productId: number; label: string; description: string; priceHt: number; vatRate: number;
  mandatoryMentions: string; paymentTerms: string;
}) {
  return call<AxInvoice>('/api/v2/invoices', 'POST', {
    company_id: inv.companyId,
    date: rfc3339(inv.date),
    due_date: rfc3339(inv.date),
    service_start_date: rfc3339(inv.serviceStart),
    service_end_date: rfc3339(inv.serviceEnd),
    order_number: inv.orderNumber,
    mandatory_mentions: inv.mandatoryMentions || undefined,
    payment_terms: inv.paymentTerms,
    allow_stripe_payment: false,
    allow_gocardless_payment: false,
    allow_paypal_payment: false,
    allow_transfer_payment: false,
    products: [{ id: inv.productId, name: inv.label, description: inv.description, price: inv.priceHt, tax_rate: inv.vatRate, quantity: 1 }],
  });
}

/** Enregistre le règlement par carte (nature 4) pour que la facture apparaisse payée. */
export function addCardPayment(invoiceId: number, amountTtc: number, reference: string, date: string) {
  return call('/api/v2/payments', 'POST', { invoice_id: invoiceId, nature: 4, amount: amountTtc, reference, date: rfc3339(date) });
}

/** Vérifie la clé (appel en lecture sans effet). */
export async function ping() {
  await call('/api/v2/tax-rates');
  return true;
}
