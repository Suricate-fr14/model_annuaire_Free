// Paramètres UTM ajoutés aux liens vers le site d'un professionnel : dans son Google Analytics,
// la visite apparaît sous « <domaine de l'annuaire> / referral », campagne « fiche-annuaire »,
// avec l'endroit du lien (utm_content) et la fiche d'origine (utm_term).
import { ENV } from '../config.ts';

export type UtmPlace = 'bouton' | 'coordonnees' | 'actualite';

export function withUtm(url: string, place: UtmPlace, slug: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    // Un lien qui porte déjà ses propres UTM (campagne du professionnel) est laissé tel quel.
    if ([...u.searchParams.keys()].some((k) => k.startsWith('utm_'))) return url;
    const source = new URL(ENV.siteUrl).hostname.replace(/^www\./, '');
    u.searchParams.append('utm_source', source);
    u.searchParams.append('utm_medium', 'referral');
    u.searchParams.append('utm_campaign', 'fiche-annuaire');
    u.searchParams.append('utm_content', place);
    if (slug) u.searchParams.append('utm_term', slug);
    return u.toString();
  } catch {
    return url;
  }
}
