// Formule choisie sur la page Tarifs, transmise d'étape en étape (?formule=pro&periode=year)
// jusqu'au paiement, y compris après l'inscription, la création ou la revendication de fiche.
import { PLANS, isPlanKey, type PlanKey, type Interval } from '../config.ts';

export type Intent = { plan: PlanKey; interval: Interval } | null;

export function readIntent(url: URL): Intent {
  const plan = url.searchParams.get('formule');
  if (!isPlanKey(plan)) return null;
  return { plan, interval: url.searchParams.get('periode') === 'month' ? 'month' : 'year' };
}

export const intentFrom = (plan: string | null | undefined, interval: string | null | undefined): Intent =>
  isPlanKey(plan) ? { plan, interval: interval === 'month' ? 'month' : 'year' } : null;

export const withIntent = (href: string, i: Intent) =>
  i ? `${href}${href.includes('?') ? '&' : '?'}formule=${i.plan}&periode=${i.interval}` : href;

export const intentLabel = (i: NonNullable<Intent>) => `${PLANS[i.plan].name} ${i.interval === 'year' ? 'annuel' : 'mensuel'}`;
