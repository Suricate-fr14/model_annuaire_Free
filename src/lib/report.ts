// Bilan mensuel envoyé aux pros (fiches Pro et Premium) : vues, appels, itinéraires, clics, demandes de devis,
// comparés au mois précédent, avec des conseils pour améliorer la fiche.
import { all, get, run } from './db.ts';
import { ENV, PLANS, euro } from '../config.ts';
import { activePromos, promoLabel } from './promos.ts';
import { parseFiche, activeNews, type Fiche } from './fiches.ts';
import { sendMail } from './mail.ts';
import { renderMail, type MailBlock, type MailContent } from './emailLayout.ts';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
/** « de septembre 2026 », « d'octobre 2026 » (élision devant avril, août, octobre). */
const ofMonth = (m: string) => (/^[aeiouyàâéèêô]/i.test(monthLabel(m)) ? `d'${monthLabel(m)}` : `de ${monthLabel(m)}`);

export const previousMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
};
/** Mois écoulé (celui du bilan envoyé le 1er). */
export const lastMonth = () => previousMonth(new Date().toISOString().slice(0, 7));

type Counts = { views: number; clicks_phone: number; clicks_web: number; clicks_route: number; phone_locked: number; leads: number };

function counts(ficheId: number, month: string): Counts {
  const s = get<Counts>('SELECT views, clicks_phone, clicks_web, clicks_route, phone_locked, 0 AS leads FROM fiche_stats WHERE fiche_id = ? AND month = ?', ficheId, month)
    ?? { views: 0, clicks_phone: 0, clicks_web: 0, clicks_route: 0, phone_locked: 0, leads: 0 };
  s.leads = get<{ n: number }>("SELECT COUNT(*) n FROM leads WHERE fiche_id = ? AND status = 'sent' AND substr(decided_at, 1, 7) = ?", ficheId, month)?.n ?? 0;
  return s;
}

/** Évolution par rapport au mois précédent : « +12 % », « -5 % », « = » ; vide si pas de référence. */
const trend = (now: number, before: number) =>
  before === 0 ? '' : now === before ? '=' : `${now > before ? '+' : ''}${Math.round(((now - before) / before) * 100)} %`;

function ficheBlocks(f: Fiche, month: string): { blocks: MailBlock[]; total: number } {
  const c = counts(f.id, month);
  const p = counts(f.id, previousMonth(month));
  const row = (label: string, now: number, before: number) => ({ label, value: String(now), trend: trend(now, before) });
  const rows = [
    row('Vues de la fiche', c.views, p.views),
    row('Appels', c.clicks_phone, p.clicks_phone),
    row('Itinéraires', c.clicks_route, p.clicks_route),
    row('Clics vers votre site', c.clicks_web, p.clicks_web),
    ...(f.premium ? [row('Demandes de devis transmises', c.leads, p.leads)] : []),
  ];
  const blocks: MailBlock[] = [{ type: 'stats', title: `${f.name} · formule ${f.premium ? 'Premium' : 'Pro'}`, rows }];
  if (f.premium && !f.leads_enabled) blocks.push({ type: 'note', tone: 'warn', text: 'Le formulaire de demande de devis est désactivé sur votre fiche : cochez « J’achète des leads » pour recevoir des demandes.' });
  const tips = [
    !f.banner && 'ajoutez une bannière en haut de votre fiche',
    !activeNews(f) && 'publiez une actualité ou une offre du moment',
    f.photos.length < 3 && 'ajoutez des photos (3 au moins)',
    !f.description.trim() && 'rédigez votre présentation détaillée',
    f.premium && !f.videos.length && 'ajoutez une vidéo YouTube',
  ].filter(Boolean) as string[];
  if (tips.length) {
    blocks.push({ type: 'list', title: 'Pour gagner en visibilité ce mois-ci :', items: tips.slice(0, 3) });
    blocks.push({ type: 'button', label: 'Améliorer ma fiche', url: `${ENV.siteUrl}/compte/fiches/${f.id}`, secondary: true });
  }
  return { blocks, total: c.views + c.clicks_phone + c.clicks_route + c.clicks_web + c.leads };
}

/** Fiche gratuite : vues et personnes ayant voulu afficher le numéro masqué, avec l'offre Pro. Null si aucune activité. */
function freeBlocks(f: Fiche, month: string): { blocks: MailBlock[]; locked: number; id: number } | null {
  const c = counts(f.id, month);
  if (!c.views && !c.phone_locked) return null;
  const promos = activePromos('pro').map((p) => `Offre en cours : ${promoLabel(p)} avec le code ${p.code}.`).join(' ');
  return {
    id: f.id,
    locked: c.phone_locked,
    blocks: [
      { type: 'stats', title: `${f.name} · fiche gratuite`, rows: [
        { label: 'Vues de la fiche', value: String(c.views) },
        { label: 'Clics sur « Afficher le téléphone »', value: String(c.phone_locked) },
      ] },
      { type: 'note', text: c.phone_locked
        ? `${c.phone_locked} ${c.phone_locked > 1 ? 'personnes ont' : 'personne a'} voulu vous appeler, mais votre numéro reste masqué sur une fiche gratuite.`
        : 'Sur une fiche gratuite, votre téléphone, votre email et votre site ne sont pas affichés.' },
      { type: 'p', text: `Avec la formule Pro, dès ${euro(Math.round((PLANS.pro.year / 12) * 100) / 100)} HT par mois, vos coordonnées et votre site s'affichent et votre fiche est référencée sur Google.${promos ? ` ${promos}` : ''}` },
      { type: 'button', label: 'Afficher mes coordonnées', url: `${ENV.siteUrl}/compte/fiches/${f.id}/abonnement` },
    ],
  };
}

/** Destinataires : comptes actifs, bilan non désactivé, au moins une fiche publiée. */
export function reportRecipients() {
  const users = all<{ id: number; email: string; name: string }>('SELECT id, email, name FROM users WHERE disabled = 0 AND monthly_report = 1');
  return users
    .map((u) => ({ ...u, fiches: all("SELECT * FROM fiches WHERE owner_id = ? AND status = 'published'", u.id).map(parseFiche) }))
    .filter((u) => u.fiches.length);
}

/** Bilan d'un compte, ou null si rien à envoyer (fiches gratuites sans activité). */
export function buildReport(u: { name: string; fiches: Fiche[] }, month: string): { subject: string; content: MailContent } | null {
  const paid = u.fiches.filter((f) => f.certified).map((f) => ficheBlocks(f, month));
  const free = u.fiches.filter((f) => !f.certified).map((f) => freeBlocks(f, month)).filter((b) => b !== null);
  if (!paid.length && !free.length) return null;
  const locked = free.reduce((n, b) => n + b.locked, 0);
  const inMonth = ofMonth(month).replace(/^de /, 'en ').replace(/^d'/, 'en ');
  const subject = !paid.length && locked
    ? `${locked} ${locked > 1 ? 'personnes ont' : 'personne a'} voulu vous appeler ${inMonth}`
    : `Votre bilan ${ofMonth(month)} sur l'annuaire`;
  const views = paid.length ? u.fiches.filter((f) => f.certified).reduce((n, f) => n + counts(f.id, month).views, 0) : 0;
  return {
    subject,
    content: {
      preheader: paid.length ? `${views} vues ${inMonth}, vos appels, itinéraires et clics, et nos conseils.` : 'Ce que votre fiche gratuite vous a apporté ce mois-ci.',
      title: `Votre bilan ${ofMonth(month)}`,
      greeting: u.name?.trim() ? `Bonjour ${u.name.trim()},` : 'Bonjour,',
      blocks: [
        { type: 'p', text: `Voici l'activité de vos fiches ${inMonth}${paid.length ? `, comparée à ${monthLabel(previousMonth(month))}` : ''}.` },
        ...paid.flatMap((b) => b.blocks),
        ...free.flatMap((b) => b.blocks),
      ],
      secondary: { label: 'Voir toutes mes fiches', url: `${ENV.siteUrl}/compte` },
      reason: 'Vous recevez ce bilan chaque mois car vous gérez une fiche sur l’annuaire.',
      unsubscribe: { label: 'Ne plus recevoir le bilan mensuel', url: `${ENV.siteUrl}/compte/parametres#bilan` },
    },
  };
}

/** Envoie le bilan du mois à chaque pro concerné (une seule fois par mois et par compte). */
export async function sendMonthlyReports(month = lastMonth(), opts: { dryRun?: boolean; force?: boolean } = {}) {
  let sent = 0, skipped = 0;
  for (const u of reportRecipients()) {
    if (!opts.force && !opts.dryRun && get('SELECT 1 FROM monthly_reports WHERE user_id = ? AND month = ?', u.id, month)) { skipped++; continue; }
    const report = buildReport(u, month);
    if (!report) continue;
    const { subject, content } = report;
    if (opts.dryRun) { console.log(`--- ${u.email}\n${subject}\n\n${renderMail(content).text}\n`); continue; }
    await sendMail(u.email, subject, content);
    run('INSERT OR REPLACE INTO monthly_reports (user_id, month) VALUES (?, ?)', u.id, month);
    sent++;
  }
  return { sent, skipped };
}
