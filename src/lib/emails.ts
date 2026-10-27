// Catalogue des emails envoyés aux professionnels et aux visiteurs : objet et contenu (mise en page : lib/emailLayout).
// Un email = un objectif et un bouton principal. Le ton : direct, chaleureux, sans jargon.
// Stratégie d'envoi par fiche (déclencheurs et relances) : voir le README, section « Emails ».
import { ENV, SITE, PLANS, CITY, euro } from '../config.ts';
import type { MailContent } from './emailLayout.ts';
import type { Fiche } from './fiches.ts';
import { intentLabel, withIntent, type Intent } from './intent.ts';

export interface Mail { subject: string; content: MailContent }

const site = () => ENV.siteUrl;
const hello = (name?: string) => (name?.trim() ? `Bonjour ${name.trim()},` : 'Bonjour,');
const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: SITE.timezone });
const planName = (k: string) => (k === 'premium' ? 'Premium' : 'Pro');
const proFrom = () => euro(Math.round((PLANS.pro.year / 12) * 100) / 100);
const editUrl = (id: number) => `${site()}/compte/fiches/${id}`;
const planUrl = (id: number, i?: Intent) => `${site()}${withIntent(`/compte/fiches/${id}/abonnement`, i ?? null)}`;
const ficheUrl = (slug: string) => `${site()}/${slug}`;
const ACCOUNT_REASON = `Vous recevez cet email car vous gérez une fiche sur l'${SITE.fullName}.`;
const tipsOff = () => ({ label: 'Ne plus recevoir les conseils et rappels', url: `${site()}/compte/parametres#bilan` });

/** Avantages des formules, pour les emails qui invitent à passer à la vitesse supérieure. */
const proBenefits = [
  'votre téléphone, votre email et votre site internet affichés',
  'votre fiche référencée sur Google',
  'présentation détaillée, plan d’accès, bannière et galerie photos',
];

// --- Compte ---

export const welcome = (name: string): Mail => ({
  subject: `Bienvenue sur l'${SITE.fullName}`,
  content: {
    preheader: 'Votre compte est prêt : ajoutez votre établissement en quelques minutes.',
    title: 'Votre compte est prêt',
    greeting: hello(name),
    blocks: [
      { type: 'p', text: `Merci de rejoindre l'${SITE.fullName}, l'annuaire des entreprises et commerces ${CITY.of} et alentour.` },
      { type: 'p', text: 'Votre établissement y figure peut-être déjà : recherchez-le pour le revendiquer, ou créez sa fiche. C’est gratuit et cela prend quelques minutes.' },
    ],
    cta: { label: 'Ajouter mon établissement', url: `${site()}/creer-ma-fiche` },
    reason: `Vous recevez cet email car un compte vient d'être créé avec cette adresse sur l'${SITE.fullName}.`,
  },
});

export const passwordReset = (link: string): Mail => ({
  subject: 'Réinitialisation de votre mot de passe',
  content: {
    preheader: 'Ce lien est valable une heure.',
    title: 'Choisissez un nouveau mot de passe',
    greeting: hello(),
    blocks: [
      { type: 'p', text: 'Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable une heure.' },
    ],
    cta: { label: 'Choisir un nouveau mot de passe', url: link },
    reason: "Vous n'êtes pas à l'origine de cette demande ? Ignorez cet email : votre mot de passe reste inchangé.",
  },
});

// --- Fiche : création, validation, revendication ---

export const ficheReceived = (name: string, f: { id: number; name: string }): Mail => ({
  subject: `Votre fiche « ${f.name} » est en cours de validation`,
  content: {
    preheader: 'Notre équipe la vérifie, généralement sous 24 h ouvrées.',
    title: 'Fiche bien reçue',
    greeting: hello(name),
    blocks: [
      { type: 'p', text: `Merci ! Votre fiche « ${f.name} » est enregistrée. Notre équipe la vérifie, généralement sous 24 heures ouvrées, et vous prévient dès sa mise en ligne.` },
      { type: 'p', text: 'En attendant, vous pouvez la compléter : logo, horaires, services et réseaux sociaux la rendent plus utile et plus visible.' },
    ],
    cta: { label: 'Compléter ma fiche', url: editUrl(f.id) },
    reason: ACCOUNT_REASON,
  },
});

export const fichePublished = (name: string, f: Fiche, wanted: Intent): Mail => ({
  subject: `Votre fiche « ${f.name} » est en ligne`,
  content: {
    preheader: wanted ? `Dernière étape : activez la formule ${intentLabel(wanted)}.` : 'Elle est visible dès maintenant dans l’annuaire.',
    title: 'Votre fiche est en ligne',
    greeting: hello(name),
    blocks: [
      { type: 'p', text: `Bonne nouvelle : « ${f.name} » a été validée et figure maintenant dans l'annuaire.` },
      ...(wanted
        ? [{ type: 'note' as const, text: `Dernière étape : activez la formule ${intentLabel(wanted)} que vous avez choisie pour afficher vos coordonnées et être référencé sur Google.` }]
        : f.certified ? [] : [{ type: 'list' as const, title: `Avec la formule Pro, dès ${proFrom()} HT par mois :`, items: proBenefits }]),
    ],
    cta: wanted ? { label: `Activer ${intentLabel(wanted)}`, url: planUrl(f.id, wanted) } : f.certified ? { label: 'Compléter ma fiche', url: editUrl(f.id) } : { label: 'Découvrir les formules', url: planUrl(f.id) },
    secondary: { label: 'Voir ma fiche en ligne', url: ficheUrl(f.slug) },
    reason: ACCOUNT_REASON,
  },
});

export const ficheRejected = (name: string, f: { id: number; name: string }, reason: string): Mail => ({
  subject: `Votre fiche « ${f.name} » est à corriger`,
  content: {
    preheader: reason,
    title: 'Votre fiche n’a pas pu être validée',
    greeting: hello(name),
    blocks: [
      { type: 'p', text: `Nous n'avons pas pu mettre en ligne « ${f.name} » pour la raison suivante :` },
      { type: 'quote', text: reason },
      { type: 'p', text: 'Corrigez-la puis enregistrez-la : elle repassera automatiquement en validation.' },
    ],
    cta: { label: 'Corriger ma fiche', url: editUrl(f.id) },
    reason: `Une question ? Répondez simplement à cet email. ${ACCOUNT_REASON}`,
  },
});

export const claimApproved = (name: string, c: { fiche_id: number; name: string }, wanted: Intent): Mail => ({
  subject: `Vous gérez désormais « ${c.name} »`,
  content: {
    preheader: 'Votre demande est acceptée : la fiche est à vous.',
    title: 'La fiche est à vous',
    greeting: hello(name),
    blocks: [
      { type: 'p', text: `Votre demande est acceptée : vous gérez maintenant la fiche « ${c.name} ». Les informations que vous y saisissez font foi et ne sont plus modifiées par les mises à jour automatiques.` },
      { type: 'list', title: 'Pour bien démarrer :', items: ['vérifiez vos horaires et votre adresse', 'ajoutez votre logo et vos services', 'rédigez une description courte et précise'] },
      ...(wanted ? [{ type: 'note' as const, text: `Vous avez choisi la formule ${intentLabel(wanted)} : activez-la pour afficher vos coordonnées et être référencé sur Google.` }] : []),
    ],
    cta: wanted ? { label: `Activer ${intentLabel(wanted)}`, url: planUrl(c.fiche_id, wanted) } : { label: 'Modifier ma fiche', url: editUrl(c.fiche_id) },
    secondary: wanted ? { label: 'Modifier ma fiche', url: editUrl(c.fiche_id) } : undefined,
    reason: ACCOUNT_REASON,
  },
});

export const claimRejected = (name: string, c: { name: string }): Mail => ({
  subject: `Votre demande pour « ${c.name} »`,
  content: {
    title: 'Un justificatif est nécessaire',
    greeting: hello(name),
    blocks: [
      { type: 'p', text: `Nous n'avons pas pu vérifier votre lien avec « ${c.name} ».` },
      { type: 'p', text: 'Répondez à cet email avec un justificatif (extrait Kbis, avis Sirene, facture à l’adresse de l’établissement…) : nous examinerons à nouveau votre demande.' },
    ],
    reason: `Vous recevez cet email suite à votre demande de revendication sur l'${SITE.fullName}.`,
  },
});

// --- Formule (abonnement ou formule offerte) ---

export type FormulaEvent =
  | { kind: 'activated'; plan: string; gift: boolean; giftUntil: string | null }
  | { kind: 'changed'; from: string; plan: string }
  | { kind: 'canceled'; plan: string; until: string | null }
  | { kind: 'past_due'; plan: string }
  | { kind: 'ended'; plan: string; wasGift: boolean };

export function formulaMail(f: Fiche, e: FormulaEvent, name = ''): Mail {
  const manage = planUrl(f.id);
  switch (e.kind) {
    case 'activated': return {
      subject: e.gift ? `Formule ${planName(e.plan)} offerte pour « ${f.name} »` : `Formule ${planName(e.plan)} activée sur « ${f.name} »`,
      content: {
        preheader: 'Ajoutez dès maintenant votre site, votre présentation et vos photos.',
        title: e.gift ? `Nous vous offrons la formule ${planName(e.plan)}` : `Bienvenue en formule ${planName(e.plan)}`,
        greeting: hello(name),
        blocks: [
          { type: 'p', text: e.gift
            ? `La formule ${planName(e.plan)} est active sur « ${f.name} », ${e.giftUntil ? `jusqu'au ${date(e.giftUntil)}` : 'sans limite de durée'}. C'est un cadeau de l'équipe de l'annuaire, sans engagement ni paiement.`
            : `Votre formule ${planName(e.plan)} est active sur « ${f.name} ». Merci pour votre confiance !` },
          { type: 'list', title: 'Pour en tirer le meilleur :', items: [
            'ajoutez le lien vers votre site internet',
            'rédigez une présentation détaillée de votre activité',
            'publiez vos plus belles photos et une bannière',
            ...(e.plan === 'premium' ? ['ajoutez vos vidéos et activez les demandes de devis'] : []),
          ] },
        ],
        cta: { label: 'Compléter ma fiche', url: editUrl(f.id) },
        reason: ACCOUNT_REASON,
      },
    };
    case 'changed': return {
      subject: `« ${f.name} » passe en ${planName(e.plan)}`,
      content: {
        title: `Votre fiche passe en ${planName(e.plan)}`,
        greeting: hello(name),
        blocks: [{ type: 'facts', rows: [['Fiche', f.name], ['Ancienne formule', planName(e.from)], ['Nouvelle formule', planName(e.plan)]] }],
        cta: { label: 'Gérer ma formule', url: manage },
        reason: ACCOUNT_REASON,
      },
    };
    case 'canceled': return {
      subject: `Résiliation enregistrée pour « ${f.name} »`,
      content: {
        title: 'Votre résiliation est enregistrée',
        greeting: hello(name),
        blocks: [
          { type: 'p', text: `Votre formule ${planName(e.plan)} reste active jusqu'au ${e.until ? date(e.until) : 'terme de la période en cours'}. Votre fiche restera ensuite en ligne gratuitement ; votre site, votre présentation détaillée et vos photos seront conservés mais masqués.` },
          { type: 'p', text: 'Vous changez d’avis ? Vous pouvez reprendre votre formule à tout moment, sans rien ressaisir.' },
        ],
        cta: { label: 'Reprendre ma formule', url: manage },
        reason: ACCOUNT_REASON,
      },
    };
    case 'past_due': return {
      subject: `Paiement refusé pour « ${f.name} »`,
      content: {
        preheader: 'Mettez à jour votre moyen de paiement pour garder vos avantages.',
        title: 'Votre dernier paiement n’a pas abouti',
        greeting: hello(name),
        blocks: [
          { type: 'note', tone: 'warn', text: `Le paiement de votre formule ${planName(e.plan)} pour « ${f.name} » a été refusé.` },
          { type: 'p', text: 'Mettez à jour votre carte pour conserver l’affichage de vos coordonnées, de votre site et de vos photos. Cela prend une minute.' },
        ],
        cta: { label: 'Mettre à jour mon paiement', url: manage },
        reason: ACCOUNT_REASON,
      },
    };
    case 'ended': return {
      subject: `Fin de votre formule sur « ${f.name} »`,
      content: {
        title: e.wasGift ? 'Votre formule offerte est terminée' : 'Votre formule est terminée',
        greeting: hello(name),
        blocks: [
          { type: 'p', text: `« ${f.name} » est désormais une fiche gratuite : elle reste en ligne, mais votre téléphone, votre site et vos photos ne sont plus affichés et elle n'est plus référencée sur Google.` },
          { type: 'p', text: 'Tout est conservé : en reprenant une formule, votre fiche retrouve immédiatement son contenu.' },
        ],
        cta: { label: 'Reprendre une formule', url: manage },
        reason: ACCOUNT_REASON,
      },
    };
  }
}

// --- Demandes de contact (Premium) ---

export interface LeadInfo { name: string; email: string; phone: string; postcode: string; request: string; timing: string; message: string }
const leadFacts = (l: LeadInfo, phoneDisplay: (p: string) => string): [string, string][] => [
  ['Demande', l.request], ['Délai', l.timing], ['Nom', l.name], ['Téléphone', phoneDisplay(l.phone)], ['Email', l.email],
  ...(l.postcode ? [['Code postal', l.postcode] as [string, string]] : []),
];

export const leadReceived = (l: LeadInfo, ficheName: string, phoneDisplay: (p: string) => string): Mail => ({
  subject: `Votre demande à ${ficheName}`,
  content: {
    preheader: 'Elle sera transmise après une rapide vérification.',
    title: 'Demande bien reçue',
    greeting: hello(l.name),
    blocks: [
      { type: 'p', text: `Nous avons bien reçu votre demande pour « ${ficheName} ». Après une rapide vérification par notre équipe (généralement sous 24 heures ouvrées), elle lui sera transmise et le professionnel vous recontactera directement.` },
      { type: 'facts', rows: leadFacts(l, phoneDisplay) },
      { type: 'quote', text: l.message },
    ],
    reason: `Vous recevez cet email car vous avez envoyé une demande depuis l'${SITE.fullName}.`,
  },
});

export const leadToOwner = (ownerName: string, l: LeadInfo, ficheName: string, phoneDisplay: (p: string) => string): Mail => ({
  subject: `Nouvelle demande : ${l.request} pour ${ficheName}`,
  content: {
    preheader: `${l.name} · ${l.timing} · répondez directement à cet email.`,
    title: 'Un client vous a contacté',
    greeting: hello(ownerName),
    blocks: [
      { type: 'note', tone: 'ok', text: `Nouvelle demande vérifiée par notre équipe pour « ${ficheName} ». Répondez directement à cet email pour écrire au client, ou appelez-le : les premiers à répondre sont souvent retenus.` },
      { type: 'facts', rows: leadFacts(l, phoneDisplay) },
      { type: 'quote', text: l.message },
    ],
    cta: { label: `Appeler ${l.name}`, url: `tel:${l.phone.replace(/[^\d+]/g, '')}` },
    secondary: { label: 'Toutes mes demandes', url: `${site()}/compte/demandes` },
    reason: ACCOUNT_REASON,
  },
});

export const leadSent = (name: string, ficheName: string, slug: string): Mail => ({
  subject: `Votre demande a été transmise à ${ficheName}`,
  content: {
    title: 'Votre demande est transmise',
    greeting: hello(name),
    blocks: [{ type: 'p', text: `Votre demande a été transmise à « ${ficheName} », qui va vous recontacter directement.` }],
    cta: { label: 'Voir la fiche', url: ficheUrl(slug) },
    reason: `Vous recevez cet email car vous avez envoyé une demande depuis l'${SITE.fullName}.`,
  },
});

// --- Relances automatiques (lib/lifecycle.ts) ---

export const completeReminder = (name: string, f: Fiche, score: number, missing: string[]): Mail => ({
  subject: `« ${f.name} » est complète à ${score} %`,
  content: {
    preheader: 'Quelques minutes suffisent pour la rendre plus visible.',
    title: `Votre fiche est complète à ${score} %`,
    greeting: hello(name),
    blocks: [
      { type: 'p', text: 'Les visiteurs choisissent les fiches les plus complètes : horaires, photos et services rassurent et donnent envie de vous contacter. Il vous manque :' },
      { type: 'list', items: missing.slice(0, 5) },
    ],
    cta: { label: 'Compléter ma fiche', url: editUrl(f.id) },
    reason: ACCOUNT_REASON,
    unsubscribe: tipsOff(),
  },
});

export const intentReminder = (name: string, f: Fiche, wanted: NonNullable<Intent>): Mail => ({
  subject: `Votre formule ${intentLabel(wanted)} n'est pas encore active`,
  content: {
    preheader: 'Il ne reste qu’une étape pour afficher vos coordonnées.',
    title: 'Il ne reste qu’une étape',
    greeting: hello(name),
    blocks: [
      { type: 'p', text: `Vous aviez choisi la formule ${intentLabel(wanted)} pour « ${f.name} », mais le paiement n'a pas été finalisé. Votre fiche est en ligne, mais sans vos coordonnées.` },
      { type: 'list', title: `Avec ${PLANS[wanted.plan].name} :`, items: wanted.plan === 'premium' ? [...proBenefits, 'votre fiche en tête de liste et les demandes de devis'] : proBenefits },
    ],
    cta: { label: `Activer ${intentLabel(wanted)}`, url: planUrl(f.id, wanted) },
    reason: ACCOUNT_REASON,
    unsubscribe: tipsOff(),
  },
});

export const giftEnding = (name: string, f: Fiche, until: string): Mail => ({
  subject: `Votre formule ${planName(f.gift_plan)} offerte se termine le ${date(until)}`,
  content: {
    preheader: 'Prolongez-la pour garder vos coordonnées, votre site et vos photos.',
    title: 'Votre formule offerte se termine bientôt',
    greeting: hello(name),
    blocks: [
      { type: 'p', text: `La formule ${planName(f.gift_plan)} offerte sur « ${f.name} » prend fin le ${date(until)}. Ensuite, votre fiche restera en ligne gratuitement, mais votre téléphone, votre site et vos photos ne seront plus affichés.` },
      { type: 'p', text: 'Pour garder ces avantages sans interruption, choisissez votre formule dès maintenant : tout votre contenu est conservé.' },
    ],
    cta: { label: 'Garder ma formule', url: planUrl(f.id, { plan: f.gift_plan === 'premium' ? 'premium' : 'pro', interval: 'year' }) },
    reason: ACCOUNT_REASON,
  },
});

export const newsExpired = (name: string, f: Fiche): Mail => ({
  subject: `Votre actualité « ${f.news_title} » est terminée`,
  content: {
    preheader: 'Publiez la suivante pour garder une fiche vivante.',
    title: 'Votre actualité est terminée',
    greeting: hello(name),
    blocks: [
      { type: 'p', text: `L'actualité « ${f.news_title} » n'est plus affichée sur votre fiche depuis le ${date(f.news_until)}.` },
      { type: 'p', text: 'Une offre du moment, un nouveau produit, un événement : une fiche qui bouge donne envie de revenir. Publiez la suivante en une minute.' },
    ],
    cta: { label: 'Publier une actualité', url: `${editUrl(f.id)}#s-pro` },
    reason: ACCOUNT_REASON,
    unsubscribe: tipsOff(),
  },
});
