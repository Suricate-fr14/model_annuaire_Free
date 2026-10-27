// Complétude d'une fiche : ce qui manque pour qu'elle soit vraiment utile aux visiteurs (et mieux classée).
// Les éléments réservés à Pro et Premium ne comptent que pour les fiches qui en bénéficient.
import type { Fiche } from './fiches.ts';

export interface Completeness { score: number; missing: string[] }

export function completeness(f: Fiche): Completeness {
  const items: [ok: boolean, label: string, when?: boolean][] = [
    [Boolean(f.logo), 'un logo ou une photo principale'],
    [Boolean(f.hours), "vos horaires d'ouverture"],
    [Boolean(f.phone), 'votre numéro de téléphone'],
    [f.features.length > 0, 'vos services (paiement, accessibilité, parking…)'],
    [Object.values(f.socials ?? {}).some(Boolean), 'vos réseaux sociaux'],
    [Boolean(f.founded || f.area_served || f.credentials), "votre année de création, votre zone d'intervention ou vos labels"],
    [f.description.trim().length >= 300, 'une présentation détaillée (300 caractères au moins)', f.certified],
    [f.photos.length >= 3, 'au moins 3 photos', f.certified],
    [Boolean(f.banner), 'une bannière en haut de la fiche', f.certified],
    [Boolean(f.website), 'le lien vers votre site internet', f.certified],
    [f.videos.length > 0, 'une vidéo YouTube', f.premium],
  ];
  const counted = items.filter(([, , when]) => when !== false);
  const done = counted.filter(([ok]) => ok).length;
  return { score: Math.round((done / counted.length) * 100), missing: counted.filter(([ok]) => !ok).map(([, label]) => label) };
}
