// Formule effective d'une fiche = formule payée (abonnement Stripe ou démo) + formule offerte par l'admin.
// - paid_status / paid_plan / paid_until : état de l'abonnement payé (écrit par le webhook Stripe ou le mode démo) ;
// - gift_plan / gift_until : formule offerte (Pro ou Premium), jusqu'à une date ou sans limite (gift_until vide) ;
// - pro_status / plan / pro_until : formule effective, lue par tout le site (classement, affichage, indexation).
// La formule offerte s'ajoute à la formule payée (la plus haute des deux s'applique) ; à sa fin, la fiche reprend
// automatiquement sa formule payée, ou redevient gratuite.
import { all, get, run } from './db.ts';
import { invalidateStats, isCertifiedRow } from './fiches.ts';
import { notifyChange } from './stripe.ts';

type Row = {
  pro_status: string; plan: string; pro_until: string | null;
  paid_status: string; paid_plan: string; paid_until: string | null;
  gift_plan: string; gift_until: string | null;
};
const RANK: Record<string, number> = { '': 0, pro: 1, premium: 2 };

export const giftActive = (r: { gift_plan: string; gift_until: string | null }) =>
  Boolean(r.gift_plan) && (!r.gift_until || r.gift_until > new Date().toISOString());

/** Recalcule la formule effective et notifie le propriétaire et les admins si elle change. */
export async function applyFormula(id: number) {
  const r = get<Row>('SELECT pro_status, plan, pro_until, paid_status, paid_plan, paid_until, gift_plan, gift_until FROM fiches WHERE id = ?', id);
  if (!r) return;
  const paidOn = isCertifiedRow({ pro_status: r.paid_status, pro_until: r.paid_until });
  let status = r.paid_status, plan = r.paid_plan, until = r.paid_until;
  if (giftActive(r)) {
    const paidPlan = paidOn ? r.paid_plan || 'pro' : '';
    plan = RANK[r.gift_plan] >= RANK[paidPlan] ? r.gift_plan : paidPlan;
    status = paidOn ? r.paid_status : 'active';
    until = paidOn ? r.paid_until : r.gift_until;
  }
  if (status === r.pro_status && plan === r.plan && until === r.pro_until) return;
  run("UPDATE fiches SET pro_status = ?, plan = ?, pro_until = ?, updated_at = datetime('now') WHERE id = ?", status || 'none', plan, until, id);
  invalidateStats();
  await notifyChange(id, { status: r.pro_status, plan: r.plan });
}

/** Offre une formule (Pro ou Premium), jusqu'à une date (ISO) ou sans limite (null). */
export async function giveFormula(id: number, plan: 'pro' | 'premium', until: string | null) {
  run('UPDATE fiches SET gift_plan = ?, gift_until = ? WHERE id = ?', plan, until, id);
  await applyFormula(id);
}

export async function removeGift(id: number) {
  run("UPDATE fiches SET gift_plan = '', gift_until = NULL WHERE id = ?", id);
  await applyFormula(id);
}

/** Fin des formules offertes arrivées à échéance (appelé au plus une fois par minute). */
let lastCheck = 0;
export async function expireGifts() {
  if (Date.now() - lastCheck < 60_000) return;
  lastCheck = Date.now();
  const now = new Date().toISOString();
  for (const { id } of all<{ id: number }>("SELECT id FROM fiches WHERE gift_plan <> '' AND gift_until IS NOT NULL AND gift_until <= ?", now)) {
    run("UPDATE fiches SET gift_plan = '', gift_until = NULL WHERE id = ?", id);
    await applyFormula(id);
  }
}
