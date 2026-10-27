// Variables SEO façon Yoast (%%nom%%, %%ville%%…) : remplacement pur, utilisable côté serveur et dans le navigateur.

export type SeoVars = Record<string, string>;

export interface VarDef { key: string; label: string }

/** Variables disponibles sur toutes les pages. */
export const GLOBAL_VARS: VarDef[] = [
  { key: 'site', label: "Nom du site" },
  { key: 'sep', label: 'Séparateur ( | )' },
  { key: 'region', label: 'Zone couverte (ville et département)' },
  { key: 'annee', label: 'Année en cours' },
  { key: 'mois', label: 'Mois en cours' },
];

/** Variables propres à chaque type de page. */
export const TYPE_VARS: Record<string, VarDef[]> = {
  fiche: [
    { key: 'nom', label: "Nom de l'établissement" },
    { key: 'categorie', label: 'Catégorie' },
    { key: 'categorie_min', label: 'Catégorie en minuscules' },
    { key: 'univers', label: 'Univers' },
    { key: 'ville', label: 'Ville' },
    { key: 'code_postal', label: 'Code postal' },
    { key: 'description', label: 'Description courte' },
  ],
  categorie: [
    { key: 'categorie', label: 'Catégorie' },
    { key: 'categorie_min', label: 'Catégorie en minuscules' },
    { key: 'univers', label: 'Univers' },
    { key: 'univers_description', label: "Description de l'univers" },
    { key: 'ville', label: 'Ville filtrée (sinon la zone couverte)' },
    { key: 'nombre', label: 'Nombre de fiches' },
    { key: 'page', label: 'Numéro de page « (page 2) »' },
  ],
  univers: [
    { key: 'univers', label: 'Univers' },
    { key: 'univers_description', label: "Description de l'univers" },
    { key: 'nombre', label: 'Nombre de professionnels' },
  ],
  ville: [
    { key: 'ville', label: 'Ville' },
    { key: 'nombre', label: 'Nombre de fiches' },
    { key: 'page', label: 'Numéro de page « (page 2) »' },
  ],
};

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Valeurs des variables globales. */
export function globalVars(siteName: string, region: string, now = new Date()): SeoVars {
  return { site: siteName, sep: '|', region, annee: String(now.getFullYear()), mois: `${MONTHS[now.getMonth()]} ${now.getFullYear()}` };
}

const SEPS = /^[\s|·:,\-–—]+|[\s|·:,\-–—]+$/g;

/**
 * Remplace les %%variables%% (inconnues ou vides : supprimées), puis nettoie le résultat :
 * espaces multiples, séparateurs doublés ou orphelins en début et en fin.
 */
export function fillTemplate(tpl: string, vars: SeoVars, maxLength = 0) {
  let s = tpl.replace(/%%([a-z_]+)%%/g, (_, k: string) => vars[k] ?? '');
  s = s
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.)])/g, '$1')
    .replace(/ [|·](?: [|·])+ /g, (m) => ` ${m.trim()[0]} `)
    .replace(SEPS, '')
    .trim();
  if (maxLength && s.length > maxLength) {
    const cut = s.slice(0, maxLength - 1);
    s = `${cut.slice(0, cut.lastIndexOf(' ') > maxLength * 0.6 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s,.;:]+$/, '')}…`;
  }
  return s;
}

export const hasVars = (s: string) => /%%[a-z_]+%%/.test(s);
