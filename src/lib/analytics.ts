// Plan de taggage : événements poussés dans le dataLayer de Google Tag Manager (voir Admin > SEO).
// Aucune donnée personnelle (email, nom, téléphone du visiteur) n'est envoyée.
import type { AstroCookies } from 'astro';
import { SITE } from '../config.ts';

export type TrackEvent = { event: string } & Record<string, string | number | boolean | object | undefined>;

const COOKIE = 'ev';

/** Événement à envoyer sur la page suivante (actions serveur suivies d'une redirection : inscription, création de fiche…). */
export function queueEvent(cookies: AstroCookies, event: string, params: Record<string, string | number | boolean> = {}) {
  const list = readQueue(cookies, false);
  list.push({ event, ...params });
  cookies.set(COOKIE, JSON.stringify(list.slice(-5)), { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 300 });
}

function readQueue(cookies: AstroCookies, consume: boolean): TrackEvent[] {
  const raw = cookies.get(COOKIE)?.value;
  if (!raw) return [];
  if (consume) cookies.delete(COOKIE, { path: '/' });
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((e) => e && typeof e.event === 'string') : [];
  } catch {
    return [];
  }
}

export const readEvents = (cookies: AstroCookies) => readQueue(cookies, true);

/** Type de page (dimension page_type) déduit du chemin quand la page ne le précise pas. */
export function pageTypeOf(path: string) {
  if (path === '/') return 'accueil';
  const first = path.split('/')[1];
  const map: Record<string, string> = {
    annuaire: 'annuaire', univers: path.split('/').length > 3 ? 'categorie' : 'univers', ville: 'ville', villes: 'villes',
    recherche: 'recherche', tarifs: 'tarifs', 'creer-ma-fiche': 'creer_fiche', compte: 'compte', paiement: 'paiement',
    connexion: 'connexion', inscription: 'inscription', revendiquer: 'revendication', signaler: 'signalement',
  };
  return map[first] ?? (['cgu', 'confidentialite', 'mentions-legales', 'sources-et-donnees'].includes(first) ? 'information' : 'autre');
}

const FICHE = ['fiche_id', 'fiche_name', 'fiche_category', 'fiche_universe', 'fiche_city', 'fiche_plan'];

/** Plan de taggage : événements envoyés par le site (documentés dans Admin > SEO et exportés en conteneur GTM). */
export const EVENTS: { name: string; when: string; params: string[]; key?: boolean; ecommerce?: boolean }[] = [
  { name: 'view_fiche', when: "Affichage d'une fiche publiée", params: FICHE },
  { name: 'click_phone', when: 'Clic sur le téléphone d’une fiche', params: FICHE, key: true },
  { name: 'click_website', when: 'Clic vers le site internet d’une fiche', params: [...FICHE, 'link_url'], key: true },
  { name: 'click_directions', when: 'Clic sur « Itinéraire »', params: FICHE, key: true },
  { name: 'click_email', when: 'Clic sur l’email d’une fiche', params: FICHE, key: true },
  { name: 'click_social', when: 'Clic sur un réseau social d’une fiche', params: [...FICHE, 'network', 'link_url'] },
  { name: 'share', when: 'Clic sur « Partager » une fiche', params: FICHE },
  { name: 'play_video', when: 'Lecture d’une vidéo d’une fiche Premium', params: FICHE },
  { name: 'lead_cta', when: 'Clic sur « Demander un devis » en haut d’une fiche', params: FICHE },
  { name: 'generate_lead', when: 'Demande de contact envoyée depuis une fiche Premium', params: ['fiche_id', 'lead_type'], key: true },
  { name: 'click_phone_locked', when: 'Clic sur « Afficher le téléphone » d’une fiche gratuite (numéro masqué)', params: FICHE },
  { name: 'click_news', when: 'Clic sur le lien de l’actualité d’une fiche', params: [...FICHE, 'link_url'] },
  { name: 'click_sponsored', when: 'Clic sur une fiche mise en avant (encadré « Sponsorisé »)', params: ['link_url'] },
  { name: 'search', when: 'Page de résultats de recherche (page 1)', params: ['search_term', 'search_city', 'search_universe', 'search_open_now', 'results_count'] },
  { name: 'select_plan', when: 'Choix d’une formule (Tarifs, Créer ma fiche)', params: ['plan', 'link_url'] },
  { name: 'sign_up', when: 'Création de compte', params: ['method'], key: true },
  { name: 'login', when: 'Connexion', params: ['method'] },
  { name: 'create_fiche', when: 'Fiche créée par un professionnel (en attente de validation)', params: ['fiche_city', 'wanted_plan'], key: true },
  { name: 'claim_fiche', when: 'Demande de revendication envoyée', params: ['fiche_id', 'wanted_plan'], key: true },
  { name: 'report_error', when: 'Signalement d’une erreur sur une fiche', params: ['fiche_id', 'report_reason'] },
  { name: 'begin_checkout', when: 'Clic sur « Souscrire » (avant le paiement Stripe)', params: ['plan', 'plan_interval'], ecommerce: true },
  { name: 'purchase', when: 'Retour de Stripe après un paiement confirmé (une fois par paiement)', params: ['plan', 'plan_interval'], key: true, ecommerce: true },
];

/** Paramètres présents sur tous les événements (contexte de page). */
export const CONTEXT_PARAMS = ['page_type', 'user_status'];

/**
 * Conteneur Google Tag Manager prêt à importer (Admin > Importer un conteneur > Fusionner) :
 * balise Google GA4, une balise d'événement GA4 et un déclencheur par événement, une variable par paramètre.
 */
export function gtmContainer(ga4Id: string, gtmId: string) {
  const ids = { accountId: '0', containerId: '0' };
  const p = (key: string, value: string, type = 'TEMPLATE') => ({ type, key, value });
  const table = (key: string, params: string[]) => ({
    type: 'LIST', key,
    list: params.map((name) => ({ type: 'MAP', map: [p('parameter', name), p('parameterValue', `{{DLV - ${name}}}`)] })),
  });
  const allParams = [...new Set([...CONTEXT_PARAMS, ...EVENTS.flatMap((e) => e.params)])];
  const variable = allParams.map((name, i) => ({
    ...ids, variableId: String(100 + i), name: `DLV - ${name}`, type: 'v',
    parameter: [p('dataLayerVersion', '2', 'INTEGER'), p('setDefaultValue', 'false', 'BOOLEAN'), p('name', name)],
  }));
  const trigger = EVENTS.map((e, i) => ({
    ...ids, triggerId: String(10 + i), name: `Événement - ${e.name}`, type: 'CUSTOM_EVENT',
    customEventFilter: [{ type: 'EQUALS', parameter: [p('arg0', '{{_event}}'), p('arg1', e.name)] }],
  }));
  const tag = [
    {
      ...ids, tagId: '1', name: 'GA4 - Balise Google', type: 'googtag',
      parameter: [p('tagId', ga4Id), {
        ...table('configSettingsTable', CONTEXT_PARAMS),
        // Durée des cookies _ga limitée à 13 mois (recommandation CNIL ; 2 ans par défaut chez Google).
        list: [...table('configSettingsTable', CONTEXT_PARAMS).list,
          { type: 'MAP', map: [p('parameter', 'cookie_expires'), p('parameterValue', String(395 * 86400))] }],
      }],
      firingTriggerId: ['2147479553'], tagFiringOption: 'ONCE_PER_EVENT',
    },
    ...EVENTS.map((e, i) => ({
      ...ids, tagId: String(10 + i), name: `GA4 - ${e.name}`, type: 'gaawe',
      parameter: [
        p('eventName', e.name),
        p('measurementIdOverride', ga4Id),
        p('sendEcommerceData', e.ecommerce ? 'true' : 'false', 'BOOLEAN'),
        ...(e.ecommerce ? [p('getEcommerceDataFrom', 'dataLayer')] : []),
        table('eventSettingsTable', [...CONTEXT_PARAMS, ...e.params]),
      ],
      firingTriggerId: [String(10 + i)], tagFiringOption: 'ONCE_PER_EVENT',
    })),
  ];
  return {
    exportFormatVersion: 2,
    exportTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
    containerVersion: {
      path: 'accounts/0/containers/0/versions/0', ...ids, containerVersionId: '0',
      container: { path: 'accounts/0/containers/0', ...ids, name: SITE.fullName, publicId: gtmId || 'GTM-XXXXXXX', usageContext: ['WEB'] },
      tag, trigger, variable,
      builtInVariable: [{ ...ids, type: 'EVENT', name: 'Event' }, { ...ids, type: 'PAGE_URL', name: 'Page URL' }],
    },
  };
}
