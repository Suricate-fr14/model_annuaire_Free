// Title et meta description des fiches : valeurs saisies par le pro ou l'admin (variables %%…%% acceptées),
// sinon modèle « Fiches » d'Admin > SEO.
import { categoryName, universeOfCategory } from './taxonomy.ts';
import { CITY } from '../config.ts';
import { seoFor, fillCustom, DESC_MAX } from './seoTemplates.ts';
import type { SeoVars } from './seoVars.ts';

type F = { name: string; city: string; category: string; short_desc: string; postcode?: string; seo_title?: string; seo_description?: string };

/** Valeurs des variables d'une fiche. */
export function ficheVars(f: F): SeoVars {
  const cat = f.category ? categoryName(f.category) : '';
  return {
    nom: f.name, categorie: cat, categorie_min: cat.toLowerCase(), univers: universeOfCategory(f.category)?.name ?? '',
    ville: f.city || CITY.name, code_postal: f.postcode ?? '', description: f.short_desc,
  };
}

export const defaultTitle = (f: F) => seoFor('fiche', ficheVars(f)).title;
export const defaultDescription = (f: F) => seoFor('fiche', ficheVars(f)).description;

export const ficheTitle = (f: F) => (f.seo_title?.trim() ? fillCustom(f.seo_title, ficheVars(f)) : defaultTitle(f));
export const ficheDescription = (f: F) => (f.seo_description?.trim() ? fillCustom(f.seo_description, ficheVars(f), DESC_MAX) : defaultDescription(f));
