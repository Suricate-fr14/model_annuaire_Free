// Données structurées schema.org (JSON-LD). Les entités communes (éditeur, site) ont un @id stable :
// chaque page y fait référence au lieu de les répéter, et Google relie le tout en un seul graphe.
import { SITE, ENV, PLANS, CITY, type Plan } from '../config.ts';
import type { Fiche } from './fiches.ts';
import { hoursToSchema } from './hours.ts';
import { categoryName } from './taxonomy.ts';
import { phoneIntl, regionOfPostcode } from './text.ts';
import { credentialList } from './features.ts';
import { settings } from './settings.ts';

// Services des fiches repris dans les données structurées (amenityFeature, paymentAccepted).
const AMENITIES: Record<string, string> = {
  terrasse: 'Terrasse', wifi: 'Wi-Fi', parking: 'Parking', accessible: 'Accessible en fauteuil roulant', clim: 'Climatisation', animaux: 'Animaux acceptés',
};
const PAYMENTS: Record<string, string> = { cb: 'Carte bancaire', 'sans-contact': 'Paiement sans contact', cheques: 'Chèques' };
const FOOD = new Set(['Restaurant', 'FastFoodRestaurant', 'BarOrPub', 'CafeOrCoffeeShop', 'Bakery', 'FoodEstablishment', 'IceCreamShop']);

export const ORG_ID = () => `${ENV.siteUrl}/#organization`;
export const SITE_ID = () => `${ENV.siteUrl}/#website`;
const abs = (path: string) => (/^https?:\/\//.test(path) ? path : `${ENV.siteUrl}${path}`);

/** Éditeur (site parent) et site : présents sur toutes les pages. */
export function siteGraph() {
  return [
    {
      '@type': 'Organization',
      '@id': ORG_ID(),
      name: SITE.parent.name,
      url: SITE.parent.url,
      logo: { '@type': 'ImageObject', url: abs(SITE.parent.logo), width: 664, height: 283 },
      // Éditeur légal du site (mentions légales).
      parentOrganization: {
        '@type': 'Organization',
        name: SITE.legal.company,
        legalName: SITE.legal.company,
        vatID: SITE.legal.vat,
        identifier: { '@type': 'PropertyValue', propertyID: 'SIRET', value: SITE.legal.siret.replace(/\s/g, '') },
        address: legalAddress(),
      },
    },
    {
      '@type': 'WebSite',
      '@id': SITE_ID(),
      name: SITE.fullName,
      alternateName: SITE.name,
      url: `${ENV.siteUrl}/`,
      description: SITE.description,
      inLanguage: 'fr-FR',
      publisher: { '@id': ORG_ID() },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${ENV.siteUrl}/recherche?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}

/** Page sans balisage propre : WebPage générique (Base l'ajoute quand la page n'en déclare pas). */
export const PAGE_TYPES = new Set(['WebPage', 'ItemPage', 'CollectionPage', 'AboutPage', 'FAQPage', 'SearchResultsPage', 'ContactPage']);
export function webPage(o: { url: string; name: string; description: string; type?: string }) {
  return {
    '@type': o.type ?? 'WebPage',
    '@id': `${o.url}#webpage`,
    url: o.url,
    name: o.name,
    description: o.description,
    inLanguage: 'fr-FR',
    isPartOf: { '@id': SITE_ID() },
  };
}

// « 7 Rue …, 14000 Ville, Département » → PostalAddress
function legalAddress() {
  const [street, cityLine] = SITE.legal.address.split(',').map((s) => s.trim());
  const m = cityLine?.match(/^(\d{5})\s+(.+)$/);
  return { '@type': 'PostalAddress', streetAddress: street, ...(m && { postalCode: m[1], addressLocality: m[2] }), addressCountry: 'FR' };
}

// --- Fiches ---

// Type schema.org le plus précis pour chaque catégorie (sous-types de LocalBusiness ou Organization).
// Catégorie absente : LocalBusiness (ou ProfessionalService pour un indépendant).
const TYPES: Record<string, string> = {
  // Bâtiment, maison
  plombiers: 'Plumber', electriciens: 'Electrician', chauffagistes: 'HVACBusiness', couvreurs: 'RoofingContractor',
  peintres: 'HousePainter', serruriers: 'Locksmith', macons: 'GeneralContractor', menuisiers: 'HomeAndConstructionBusiness',
  carreleurs: 'HomeAndConstructionBusiness', renovation: 'GeneralContractor', architectes: 'ProfessionalService',
  'architectes-interieur': 'ProfessionalService', decoration: 'FurnitureStore', paysagistes: 'HomeAndConstructionBusiness',
  cuisinistes: 'HomeGoodsStore', piscines: 'HomeAndConstructionBusiness', demenageurs: 'MovingCompany',
  nettoyage: 'HomeAndConstructionBusiness', bricolage: 'HardwareStore', jardineries: 'GardenStore', pressing: 'DryCleaningOrLaundry',
  // Immobilier
  'agences-immobilieres': 'RealEstateAgent', 'chasseurs-immobiliers': 'RealEstateAgent', 'gestion-locative': 'RealEstateAgent',
  syndics: 'RealEstateAgent', diagnostiqueurs: 'ProfessionalService', promoteurs: 'GeneralContractor',
  // Auto, transports
  garages: 'AutoRepair', carrosseries: 'AutoBodyShop', concessionnaires: 'AutoDealer', 'controle-technique': 'AutoRepair',
  'auto-ecoles': 'DrivingSchool', 'location-vehicules': 'AutoRental', 'taxis-vtc': 'LocalBusiness', velos: 'BikeStore',
  // Santé
  medecins: 'Physician', dentistes: 'Dentist', kinesitherapeutes: 'Physiotherapy', osteopathes: 'MedicalBusiness',
  psychologues: 'MedicalBusiness', infirmiers: 'MedicalBusiness', pharmacies: 'Pharmacy', opticiens: 'Optician',
  naturopathes: 'MedicalBusiness', dieteticiens: 'MedicalBusiness', 'laboratoires-analyses': 'DiagnosticLab', cliniques: 'MedicalClinic',
  // Beauté, sport
  coiffeurs: 'HairSalon', barbiers: 'HairSalon', instituts: 'BeautySalon', esthetique: 'BeautySalon', spas: 'DaySpa',
  tatoueurs: 'TattooParlor', 'coachs-sportifs': 'SportsActivityLocation', 'salles-de-sport': 'ExerciseGym',
  'clubs-sportifs': 'SportsClub', 'yoga-pilates': 'ExerciseGym', danse: 'SportsActivityLocation', 'arts-martiaux': 'SportsClub',
  // Gastronomie
  restaurants: 'Restaurant', 'fast-food': 'FastFoodRestaurant', 'bars-cafes': 'BarOrPub', traiteurs: 'FoodEstablishment',
  boulangeries: 'Bakery', boucheries: 'Store', cavistes: 'LiquorStore', 'epiceries-fines': 'GroceryStore',
  producteurs: 'FoodEstablishment', chocolatiers: 'Store', glaciers: 'IceCreamShop', primeurs: 'GroceryStore',
  // Commerces
  mode: 'ClothingStore', bijouteries: 'JewelryStore', fleuristes: 'Florist', librairies: 'BookStore', 'high-tech': 'ElectronicsStore',
  jouets: 'ToyStore', animaleries: 'PetStore', supermarches: 'GroceryStore', 'tabac-presse': 'Store', 'sport-boutiques': 'SportingGoodsStore',
  cadeaux: 'Store', cosmetiques: 'Store', bazars: 'Store', 'depot-vente': 'Store', cordonniers: 'LocalBusiness',
  // Tourisme
  hotels: 'Hotel', gites: 'LodgingBusiness', campings: 'Campground', 'locations-saisonnieres': 'LodgingBusiness',
  'agences-de-voyages': 'TravelAgency', 'offices-tourisme': 'TouristInformationCenter',
  // Droit, finance
  avocats: 'Attorney', notaires: 'Notary', 'commissaires-justice': 'LegalService', 'experts-comptables': 'AccountingService',
  banques: 'BankOrCreditUnion', assurances: 'InsuranceAgency', patrimoine: 'FinancialService',
  // Formation, culture, sorties
  ecoles: 'School', 'organismes-formation': 'EducationalOrganization', 'soutien-scolaire': 'EducationalOrganization',
  langues: 'EducationalOrganization', 'cours-musique': 'EducationalOrganization', galeries: 'ArtGallery',
  'lieux-culturels': 'PerformingArtsTheater', 'salles-reception': 'EventVenue', creches: 'ChildCare',
  'residences-seniors': 'LodgingBusiness', veterinaires: 'VeterinaryCare', toiletteurs: 'LocalBusiness',
  'pensions-animaux': 'LocalBusiness', associations: 'NGO', ong: 'NGO', collectivites: 'GovernmentOrganization',
  administrations: 'GovernmentOffice', ambassades: 'GovernmentOffice', 'pompes-funebres': 'LocalBusiness',
  'parcs-loisirs': 'AmusementPark', 'escape-games': 'EntertainmentBusiness', 'karting-bowling': 'BowlingAlley',
  discotheques: 'NightClub', 'agences-web': 'ProfessionalService', 'agences-communication': 'ProfessionalService',
  'agences-seo': 'ProfessionalService', 'depannage-informatique': 'ComputerStore', imprimeries: 'ProfessionalService',
  photographes: 'ProfessionalService', coworking: 'LocalBusiness', interim: 'EmploymentAgency', 'rh-recrutement': 'EmploymentAgency',
};

// Types qui ne descendent pas de LocalBusiness (organisations, lieux publics) : ils sont doublés de LocalBusiness,
// seul type qui accepte à la fois horaires, adresse et téléphone, et que Google lit pour les établissements.
const NOT_LOCAL = new Set(['NGO', 'GovernmentOrganization', 'School', 'EducationalOrganization', 'DrivingSchool', 'PerformingArtsTheater', 'EventVenue']);

export const businessType = (f: Pick<Fiche, 'category' | 'kind'>): string | string[] => {
  const t = TYPES[f.category] ?? (f.kind === 'person' ? 'ProfessionalService' : 'LocalBusiness');
  return NOT_LOCAL.has(t) ? ['LocalBusiness', t] : t;
};

/** Fiche : la page (WebPage) et l'établissement qu'elle décrit. */
export function ficheGraph(f: Fiche, opts: { title: string; description: string; showWebsite: boolean; photos: string[]; banner?: string }) {
  const page = `${ENV.siteUrl}/${f.slug}`;
  const id = `${page}#business`;
  const images = [f.logo, opts.banner, ...opts.photos].filter(Boolean).map((p) => abs(p!));
  const hours = hoursToSchema(f.hours);
  // Profils sur d'autres sites (le site internet est déjà dans « url »).
  const sameAs = Object.values(f.socials ?? {}).filter(Boolean) as string[];
  const type = businessType(f);
  const food = [type].flat().some((t) => FOOD.has(t));
  const amenities = (f.features ?? []).filter((k) => AMENITIES[k]).map((k) => ({ '@type': 'LocationFeatureSpecification', name: AMENITIES[k], value: true }));
  const payments = (f.features ?? []).filter((k) => PAYMENTS[k]).map((k) => PAYMENTS[k]);
  const cuisines = f.short_desc.match(/· cuisine ([^·]+)/)?.[1].split(/,\s*/).map((c) => c.trim()).filter(Boolean) ?? [];
  const region = regionOfPostcode(f.postcode ?? '');
  const credentials = credentialList(f.credentials ?? '');
  const areas = (f.area_served ?? '').split(/[,;]/).map((a) => a.trim()).filter(Boolean);
  const address = {
    '@type': 'PostalAddress',
    ...(f.street && { streetAddress: f.street }),
    ...(f.postcode && { postalCode: f.postcode }),
    addressLocality: f.city || CITY.name,
    ...(region && { addressRegion: region }),
    addressCountry: 'FR',
  };
  return [
    {
      '@type': 'ItemPage',
      '@id': `${page}#webpage`,
      url: page,
      name: opts.title,
      description: opts.description,
      inLanguage: 'fr-FR',
      isPartOf: { '@id': SITE_ID() },
      about: { '@id': id },
      mainEntity: { '@id': id },
      ...(images[0] && { primaryImageOfPage: { '@type': 'ImageObject', url: images[0] } }),
      ...(f.published_at && { datePublished: toIso(f.published_at) }),
      dateModified: toIso(f.updated_at),
    },
    {
      '@type': type,
      '@id': id,
      name: f.name,
      description: f.short_desc,
      url: opts.showWebsite && f.website ? f.website : page,
      mainEntityOfPage: { '@id': `${page}#webpage` },
      ...(images.length && { image: images, logo: f.logo ? abs(f.logo) : undefined }),
      // Téléphone et email publiés seulement avec une formule Pro ou Premium (comme sur la fiche).
      // L'email n'est jamais publié (anti-aspiration, inutile pour Google) ; le téléphone sauf réglage contraire (Admin > SEO).
      ...(f.certified && f.phone && settings().schema_phone !== 'off' && { telephone: phoneIntl(f.phone) }),
      address,
      ...(f.lat != null && f.lng != null && {
        geo: { '@type': 'GeoCoordinates', latitude: f.lat, longitude: f.lng },
        hasMap: `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`,
      }),
      ...(hours?.length && { openingHoursSpecification: hours }),
      ...(f.siret && { identifier: { '@type': 'PropertyValue', propertyID: 'SIRET', value: f.siret } }),
      ...(sameAs.length && { sameAs }),
      // Prix « à partir de » (Pro et Premium, saisi par le professionnel).
      ...(f.certified && f.price_from && { priceRange: `À partir de ${f.price_from} €`, currenciesAccepted: 'EUR' }),
      ...(payments.length && { paymentAccepted: payments.join(', ') }),
      ...(amenities.length && { amenityFeature: amenities }),
      ...(food && cuisines.length && { servesCuisine: cuisines }),
      ...(food && f.features?.includes('reservation') && { acceptsReservations: true }),
      knowsAbout: categoryName(f.category),
      areaServed: [{ '@type': 'City', name: f.city || CITY.name }, ...areas.map((name) => ({ '@type': 'Place', name }))],
      ...(f.founded && { foundingDate: f.founded }),
      ...(f.languages?.length && { knowsLanguage: ['fr', ...f.languages] }),
      ...(credentials.length && {
        hasCredential: credentials.map((name) => ({ '@type': 'EducationalOccupationalCredential', credentialCategory: 'certification', name })),
      }),
    },
  ];
}

// SQLite stocke « AAAA-MM-JJ HH:MM:SS » en UTC.
const toIso = (d: string) => (d.includes('T') ? d : `${d.replace(' ', 'T')}Z`);

// --- Pages de liste (univers, catégorie, ville, annuaire) ---

/** Lien vers une fiche, pour une ItemList. */
export const ficheItem = (f: Pick<Fiche, 'slug' | 'name'>) => ({ name: f.name, url: `/${f.slug}` });

/** Page de liste : CollectionPage + ItemList des éléments affichés (fiches ou catégories, dans l'ordre de la page). */
export function collectionGraph(o: { path: string; name: string; description: string; items: { name: string; url: string }[]; offset?: number }) {
  const url = abs(o.path);
  return [{
    '@type': 'CollectionPage',
    '@id': `${url}#webpage`,
    url,
    name: o.name,
    description: o.description,
    inLanguage: 'fr-FR',
    isPartOf: { '@id': SITE_ID() },
    ...(o.items.length && {
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: o.items.length,
        itemListElement: o.items.map((f, i) => ({
          '@type': 'ListItem', position: (o.offset ?? 0) + i + 1, url: abs(f.url), name: f.name,
        })),
      },
    }),
  }];
}

// --- Tarifs ---

const offer = (p: Plan, interval: 'month' | 'year') => {
  const ht = interval === 'month' ? p.month : p.year;
  return {
    '@type': 'Offer',
    name: `${p.name} ${interval === 'month' ? 'mensuel' : 'annuel'}`,
    price: ht,
    priceCurrency: 'EUR',
    priceSpecification: {
      '@type': 'UnitPriceSpecification', price: ht, priceCurrency: 'EUR', valueAddedTaxIncluded: false,
      billingDuration: 1, unitCode: interval === 'month' ? 'MON' : 'ANN',
    },
    url: `${ENV.siteUrl}/creer-ma-fiche?formule=${p.key}&periode=${interval}`,
    availability: 'https://schema.org/InStock',
    seller: { '@id': ORG_ID() },
  };
};

/** Tarifs : le service (formules et prix HT) et la FAQ affichée sur la page. */
export function pricingGraph(faq: [string, string][]) {
  const url = `${ENV.siteUrl}/tarifs`;
  return [
    {
      '@type': 'Service',
      '@id': `${url}#service`,
      name: `Référencement dans l'${SITE.fullName}`,
      serviceType: "Inscription dans un annuaire d'entreprises",
      description: "Fiche d'établissement gratuite, ou formules Pro et Premium : référencement Google, site internet, plan, photos et mise en avant.",
      provider: { '@id': ORG_ID() },
      areaServed: { '@type': 'AdministrativeArea', name: SITE.region },
      url,
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Formules',
        itemListElement: [
          { '@type': 'Offer', name: 'Gratuite', price: 0, priceCurrency: 'EUR', url: `${ENV.siteUrl}/creer-ma-fiche` },
          ...Object.values(PLANS).flatMap((p) => [offer(p, 'month'), offer(p, 'year')]),
        ],
      },
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      url,
      isPartOf: { '@id': SITE_ID() },
      mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ];
}
