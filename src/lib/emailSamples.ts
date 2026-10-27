// Exemples de chaque email (Admin > Emails > Modèles), construits avec une vraie fiche publiée de l'annuaire.
import { all } from './db.ts';
import { parseFiche, type Fiche } from './fiches.ts';
import { buildReport } from './report.ts';
import { completeness } from './completeness.ts';
import { phoneDisplay } from './text.ts';
import * as E from './emails.ts';
import type { MailContent } from './emailLayout.ts';

export interface Sample { key: string; group: string; when: string; subject: string; content: MailContent }

export function emailSamples(): Sample[] {
  const rows = all<any>("SELECT * FROM fiches WHERE status = 'published' ORDER BY (pro_status = 'active') DESC, id LIMIT 2").map(parseFiche);
  if (!rows.length) return [];
  const f: Fiche = rows[0];
  const free: Fiche = { ...(rows[1] ?? f), certified: false, premium: false };
  const name = 'Camille';
  const lead: E.LeadInfo = { name: 'Julien Morel', email: 'julien.morel@example.com', phone: '0612345678', postcode: '14000', request: 'Demande de devis', timing: 'Dans le mois', message: 'Bonjour, je souhaiterais un devis pour une prestation le samedi 14 novembre. Merci !' };
  const until = new Date(Date.now() + 6 * 864e5).toISOString();
  const c = completeness(f);
  const s = (key: string, group: string, when: string, m: E.Mail): Sample => ({ key, group, when, subject: m.subject, content: m.content });
  const month = new Date(Date.now() - 20 * 864e5).toISOString().slice(0, 7);
  const report = buildReport({ name, fiches: [{ ...f, certified: true, premium: true }, free] }, month);
  return [
    s('welcome', 'Compte', 'Création de compte', E.welcome(name)),
    s('reset', 'Compte', 'Mot de passe oublié', E.passwordReset('https://exemple/reinitialiser?token=…')),
    s('received', 'Fiche', 'Fiche créée par un pro (en attente de validation)', E.ficheReceived(name, f)),
    s('published', 'Fiche', 'Fiche validée par l’admin (avec formule choisie)', E.fichePublished(name, free, { plan: 'pro', interval: 'year' })),
    s('rejected', 'Fiche', 'Fiche refusée par l’admin', E.ficheRejected(name, f, 'Adresse incomplète : précisez le numéro et la rue.')),
    s('claim-ok', 'Fiche', 'Revendication acceptée', E.claimApproved(name, { fiche_id: f.id, name: f.name }, null)),
    s('claim-ko', 'Fiche', 'Revendication refusée', E.claimRejected(name, f)),
    s('formula-on', 'Formule', 'Abonnement activé', E.formulaMail(f, { kind: 'activated', plan: 'pro', gift: false, giftUntil: null }, name)),
    s('formula-gift', 'Formule', 'Formule offerte par l’admin', E.formulaMail(f, { kind: 'activated', plan: 'premium', gift: true, giftUntil: until }, name)),
    s('formula-change', 'Formule', 'Changement de formule', E.formulaMail(f, { kind: 'changed', from: 'pro', plan: 'premium' }, name)),
    s('formula-cancel', 'Formule', 'Résiliation', E.formulaMail(f, { kind: 'canceled', plan: 'pro', until }, name)),
    s('formula-pastdue', 'Formule', 'Paiement refusé', E.formulaMail(f, { kind: 'past_due', plan: 'pro' }, name)),
    s('formula-end', 'Formule', 'Fin de formule', E.formulaMail(f, { kind: 'ended', plan: 'pro', wasGift: false }, name)),
    s('lead-received', 'Demandes de devis', 'Accusé de réception au client', E.leadReceived(lead, f.name, phoneDisplay)),
    s('lead-owner', 'Demandes de devis', 'Demande transmise au pro (Premium)', E.leadToOwner(name, lead, f.name, phoneDisplay)),
    s('lead-sent', 'Demandes de devis', 'Confirmation de transmission au client', E.leadSent(lead.name, f.name, f.slug)),
    ...(report ? [s('report', 'Bilan', 'Bilan mensuel (le 1er du mois)', { subject: report.subject, content: report.content })] : []),
    s('complete', 'Relances', 'J+3 après mise en ligne, fiche complète à moins de 80 %', E.completeReminder(name, f, Math.min(c.score, 55), c.missing.length ? c.missing : ['vos horaires d’ouverture', 'au moins 3 photos'])),
    s('intent', 'Relances', 'J+2, formule choisie mais non payée', E.intentReminder(name, free, { plan: 'premium', interval: 'year' })),
    s('gift', 'Relances', 'J-7 avant la fin d’une formule offerte', E.giftEnding(name, { ...f, gift_plan: 'premium' }, until)),
    s('news', 'Relances', 'Actualité terminée depuis moins de 7 jours', E.newsExpired(name, { ...f, news_title: f.news_title || '-10 % en octobre', news_until: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10) })),
  ];
}
