// Offres promotionnelles affichées sur le site (Admin > Facturation) : une offre par code, pour une formule ou toutes,
// avec un pourcentage et une date de fin. Le code lui-même est créé dans Stripe (npm run stripe:promo).
import { get, run } from './db.ts';
import { PLANS, type PlanKey } from '../config.ts';

export interface Promo { code: string; plan: '' | PlanKey; percent: number; until: string; text: string }

const today = () => new Date().toISOString().slice(0, 10);

export function getPromos(): Promo[] {
  const raw = get<{ value: string }>("SELECT value FROM settings WHERE key = 'promos'")?.value;
  if (raw) { try { return JSON.parse(raw); } catch { return []; } }
  // Ancien réglage unique (promo_code / promo_text)
  const code = get<{ value: string }>("SELECT value FROM settings WHERE key = 'promo_code'")?.value;
  const text = get<{ value: string }>("SELECT value FROM settings WHERE key = 'promo_text'")?.value ?? '';
  return code ? [{ code, plan: '', percent: 0, until: '', text }] : [];
}

export function savePromos(list: Promo[]) {
  run("INSERT INTO settings (key, value) VALUES ('promos', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", JSON.stringify(list));
  run("DELETE FROM settings WHERE key IN ('promo_code', 'promo_text')");
}

/** Offres en cours (date de fin non dépassée), éventuellement pour une formule (les offres « toutes formules » comprises). */
export const activePromos = (plan?: PlanKey) =>
  getPromos().filter((p) => (!p.until || p.until >= today()) && (!plan || !p.plan || p.plan === plan));

const dateFr = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** « -20 % sur Pro jusqu'au 30 novembre 2026 » (ou le texte saisi). */
export const promoLabel = (p: Promo) =>
  p.text || [p.percent ? `-${p.percent} %` : 'Réduction', p.plan ? `sur ${PLANS[p.plan].name}` : 'sur les formules Pro et Premium', p.until && `jusqu'au ${dateFr(p.until)}`].filter(Boolean).join(' ');
