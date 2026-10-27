// Modèles de title et meta description par type de page (Admin > SEO), avec variables %%…%%.
import { all, run } from './db.ts';
import { SITE, CITY } from '../config.ts';
import { fillTemplate, globalVars, type SeoVars } from './seoVars.ts';

export const TEMPLATE_TYPES = {
  fiche: {
    label: 'Fiches',
    title: '%%nom%% à %%ville%% · %%categorie%% %%sep%% %%site%%',
    description: '%%nom%%, %%categorie_min%% à %%ville%%. %%description%%',
  },
  categorie: {
    label: 'Catégories',
    title: '%%categorie%% à %%ville%% : %%nombre%% adresses %%page%% %%sep%% %%site%%',
    description: "%%categorie%% à %%ville%% : horaires d'ouverture, adresses et itinéraires. %%univers_description%%",
  },
  univers: {
    label: 'Univers',
    title: `%%univers%% à ${CITY.name} : %%nombre%% professionnels %%sep%% %%site%%`,
    description: `%%univers_description%% %%nombre%% professionnels à ${CITY.area} : horaires, adresses.`,
  },
  ville: {
    label: 'Villes',
    title: 'Entreprises et commerces à %%ville%% : %%nombre%% adresses %%page%% %%sep%% %%site%%',
    description: 'Annuaire des entreprises, commerces et professionnels de %%ville%% : horaires, adresses et itinéraires.',
  },
} as const;
export type TemplateType = keyof typeof TEMPLATE_TYPES;
export const TITLE_MAX = 70;
export const DESC_MAX = 160;

let cache: Map<string, string> | null = null;
const load = () => (cache ??= new Map(all<{ key: string; value: string }>("SELECT key, value FROM settings WHERE key LIKE 'tpl_%'").map((r) => [r.key, r.value])));

/** Modèle enregistré, sinon modèle par défaut. */
export const template = (type: TemplateType, field: 'title' | 'description') =>
  load().get(`tpl_${type}_${field}`)?.trim() || TEMPLATE_TYPES[type][field];
export const savedTemplate = (type: TemplateType, field: 'title' | 'description') => load().get(`tpl_${type}_${field}`) ?? '';

export function saveTemplate(type: TemplateType, field: 'title' | 'description', value: string) {
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', `tpl_${type}_${field}`, value.trim().slice(0, 400));
  cache = null;
}

export const siteVars = () => globalVars(SITE.fullName, SITE.region);

/** Title et description d'une page à partir de son type et de ses variables. */
export function seoFor(type: TemplateType, vars: SeoVars) {
  const v = { ...siteVars(), ...vars };
  return { title: fillTemplate(template(type, 'title'), v), description: fillTemplate(template(type, 'description'), v, DESC_MAX), vars: v };
}

/** Texte saisi (title ou description personnalisé) dans lequel les variables sont remplacées. */
export const fillCustom = (text: string, vars: SeoVars, max = 0) => fillTemplate(text, { ...siteVars(), ...vars }, max);
