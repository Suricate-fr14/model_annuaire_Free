// Réglages globaux du site : nom, textes, formules payantes, zone géographique.

/**
 * À PERSONNALISER EN PREMIER : ville couverte par l'annuaire (voir le README, « Créer l'annuaire d'une ville »).
 * Exemple pour Caen : name 'Caen', area 'Caen et alentour', of 'de Caen', department 'Calvados', region 'Normandie',
 * center { lat: 49.1829, lng: -0.3707 }, radiusM 9000.
 */
export const CITY = {
  /** Ville principale : « à Rennes », « autour de Rennes ». */
  name: 'Votre ville',
  /** Zone couverte, après « à » : « à Rennes et alentour ». */
  area: 'Votre ville et alentour',
  /** Après « de » : « de Rennes » (« d'Angers » pour une ville commençant par une voyelle). */
  of: 'de Votre ville',
  department: 'Votre département',
  region: 'Votre région',
  /** Centre de la ville (latitude, longitude) et rayon de l'import OpenStreetMap, en mètres. Obligatoire pour l'import. */
  center: { lat: 0, lng: 0 },
  radiusM: 9000,
};

export const SITE = {
  name: 'Annuaire',
  /** Nom complet pour les titres d'onglet, emails et moteurs de recherche. */
  fullName: `Annuaire ${CITY.name}`,
  /** Site parent (logo de l'en-tête, lien de retour, éditeur) ; « about » complète « Il est édité par … ». */
  parent: { name: 'Votre site', url: 'https://www.example.com', logo: '/logo.svg', about: `le site d'information locale ${CITY.of}` },
  tagline: `L'annuaire des entreprises et commerces ${CITY.of} et du ${CITY.department}`,
  description:
    `Trouvez une entreprise, un commerce ou un professionnel à ${CITY.area} : horaires, adresse, téléphone, itinéraire et réseaux sociaux.`,
  timezone: 'Europe/Paris',
  region: `${CITY.name} et ${CITY.department}`,
  defaultCenter: CITY.center,
  contactEmail: 'contact@example.com',
  publisher: 'Votre société',

  // Mentions légales (éditeur et hébergeur)
  legal: {
    company: 'Votre société',
    form: 'SASU',
    siret: '000 000 000 00000',
    vat: 'FR00000000000',
    address: 'Adresse de votre société',
    email: 'contact@example.com',
    phone: '01 23 45 67 89',
    director: 'Nom du directeur de la publication',
    court: 'Ville du greffe',
    host: {
      name: 'PlanetHoster',
      address: '4416 Rue Louis B. Mayer, Laval, Québec H7P 0G1, Canada',
      phone: '+33 (0)1 76 60 41 43',
      url: 'https://www.planethoster.com',
    },
  },

  // Offre payante (libellés génériques ; le détail des formules est dans PLANS ci-dessous)
  pro: {
    name: 'Pro',
    /** « dès 10 € HT / mois » : calculé depuis PLANS (prix annuel de Pro ramené au mois). */
    get priceLabel() { return `dès ${euro(Math.round((PLANS.pro.year / 12) * 100) / 100)} HT / mois`; },
    certifiedLabel: 'Fiche certifiée',
    perks: [] as string[],
  },

  // Multiples de 4 : les grilles de fiches comptent 4 colonnes sur ordinateur.
  dailyCount: 8,
  newcomersCount: 8,
  perPage: 48,

  // Facturation (factures officielles émises dans Axonaut, plateforme agréée)
  billing: {
    /** Taux de TVA appliqué. Les prix Stripe sont TTC ; la facture Axonaut porte le HT et la TVA. 0 = franchise en base. */
    vatRate: 20,
    /** Mention ajoutée aux factures (ex. « TVA non applicable, art. 293 B du CGI » en franchise). */
    mandatoryMentions: '',
    paymentTerms: 'Payée par carte bancaire à la souscription (prélèvement automatique à chaque échéance).',
  },
};

// --- Formules payantes ---
// Positionnement (octobre 2026) : sous PagesJaunes+ (25 €/mois) pour l'entrée de gamme, au niveau des mises en avant
// d'annuaires locaux (Cylex Premium 11,90 €/mois, « À la une » NosReseaux ≈ 58 €/mois) pour le haut de gamme.
export type PlanKey = 'pro' | 'premium';
export type Interval = 'month' | 'year';

export interface Plan {
  key: PlanKey;
  name: string;
  tagline: string;
  month: number; // € HT
  year: number; // € HT (remise annuelle : voir annualSaving)
  photos: number;
  perks: string[];
}

export const PLANS: Record<PlanKey, Plan> = {
  pro: {
    key: 'pro',
    name: 'Pro',
    tagline: 'Pour être trouvé et contacté',
    month: 9,
    year: 99,
    photos: 6,
    perks: [
      'Téléphone et email affichés sur la fiche',
      'Fiche référencée sur Google, avec title et description personnalisés',
      'Bannière en haut de votre fiche, reprise au partage sur les réseaux sociaux',
      'Lien vers votre site internet',
      "Plan d'accès Google Maps et présentation détaillée",
      'Badge « fiche certifiée »',
      'Classement devant les fiches gratuites, dans votre catégorie et votre ville',
      'Galerie de 6 photos',
      'Bloc « Nos références clients » : jusqu’à 5 logos de clients',
      'Vos 4 derniers avis Google affichés sur la fiche',
      'Actualité ou offre du moment en haut de la fiche',
      'Statistiques : vues, appels, itinéraires et clics vers votre site, et bilan mensuel par email',
    ],
  },
  premium: {
    key: 'premium',
    name: 'Premium',
    tagline: 'Pour être vu en premier',
    month: 19,
    year: 190,
    photos: 12,
    perks: [
      'Tout ce qui est inclus dans Pro',
      'En tête de liste, devant les fiches Pro, avec visuel et accroche dans les listes',
      "Présence prioritaire dans « À découvrir aujourd'hui » et l'univers du jour",
      'Galerie de 12 photos',
      'Vos 8 derniers avis Google affichés sur la fiche',
      'Jusqu’à 4 vidéos YouTube sur la fiche',
      'Formulaire « Demander un devis » : demandes vérifiées puis transmises (option « J’achète des leads »)',
      'Assistance prioritaire par email',
    ],
  },
};

export const FREE_PHOTOS = 0;
/** Économie de l'abonnement annuel par rapport à 12 mensualités (€ HT) et équivalent en mois offerts (arrondi). */
export const annualSaving = (p: Plan) => p.month * 12 - p.year;
export const monthsOffered = (p: Plan) => Math.round(annualSaving(p) / p.month);
/** « jusqu'à 2 mois offerts » (meilleure remise annuelle des formules). */
export const annualOfferLabel = () => {
  const m = Math.max(...Object.values(PLANS).map(monthsOffered));
  const same = Object.values(PLANS).every((p) => monthsOffered(p) === m);
  return m > 0 ? `${same ? '' : 'jusqu’à '}${m} mois offert${m > 1 ? 's' : ''}` : '';
};
export const euro = (n: number) => `${n.toLocaleString('fr-FR')} €`;
export const planPrice = (p: Plan, i: Interval) => (i === 'year' ? p.year : p.month);
export const planLabel = (p: Plan, i: Interval) => `${euro(planPrice(p, i))} HT / ${i === 'year' ? 'an' : 'mois'}`;
export const isPlanKey = (s: unknown): s is PlanKey => s === 'pro' || s === 'premium';

/** Variable d'environnement : process.env en production (node --env-file), .env chargé par Vite en dev. */
export function env(key: string, fallback = ''): string {
  const fromProcess = typeof process !== 'undefined' ? process.env[key] : undefined;
  const fromVite = (import.meta as any).env?.[key];
  return (fromProcess || fromVite || fallback) as string;
}

export const ENV = {
  get siteUrl() { return env('SITE_URL', 'http://localhost:4321').replace(/\/$/, ''); },
  get stripeKey() { return env('STRIPE_SECRET_KEY'); },
  /** Prix Stripe par formule et périodicité (STRIPE_PRICE_PRO_MONTH, STRIPE_PRICE_PREMIUM_YEAR…). */
  stripePrice(plan: PlanKey, interval: Interval) { return env(`STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`); },
  get stripeWebhookSecret() { return env('STRIPE_WEBHOOK_SECRET'); },
  /** Configuration du portail client créée par `npm run stripe:setup` (vide = configuration par défaut du compte). */
  get stripePortalConfig() { return env('STRIPE_PORTAL_CONFIG'); },
  get resendKey() { return env('RESEND_API_KEY'); },
  get mailFrom() { return env('MAIL_FROM', `${SITE.fullName} <contact@example.com>`); },
  get adminEmail() { return env('ADMIN_EMAIL'); },
  get axonautKey() { return env('AXONAUT_API_KEY'); },
  /** Avis Google via DataForSEO (identifiants API du compte DataForSEO). */
  get dataforseoLogin() { return env('DATAFORSEO_LOGIN'); },
  get dataforseoPassword() { return env('DATAFORSEO_PASSWORD'); },
  get dataforseoUrl() { return env('DATAFORSEO_API_URL', 'https://api.dataforseo.com').replace(/\/$/, ''); },
  get axonautUrl() { return env('AXONAUT_API_URL', 'https://axonaut.com').replace(/\/$/, ''); },
};

export const stripeEnabled = () => Boolean(ENV.stripeKey && ENV.stripePrice('pro', 'month'));
export const axonautEnabled = () => Boolean(ENV.axonautKey);
