// Mises en avant sponsorisées (Admin > Mises en avant) : une fiche affichée en tête d'une catégorie et/ou d'une ville,
// sur une période. Vendues hors abonnement ; affichages et clics comptés pour le bilan au client.
import { all, get, run } from './db.ts';
import { parseFiche, type Fiche } from './fiches.ts';

export interface Sponsorship {
  id: number; fiche_id: number; category: string; city_slug: string; starts_on: string; ends_on: string;
  price_ht: number; note: string; impressions: number; clicks: number; created_at: string;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Fiches sponsorisées à afficher : sur une page catégorie (category, ville filtrée éventuelle) ou une page ville
 * (category vide). Les ciblages par ville passent avant les ciblages « toutes villes ». Compte un affichage.
 */
export function sponsorsFor(o: { category?: string; city?: string }, limit = 2): { s: Sponsorship; f: Fiche }[] {
  const rows = all<any>(
    `SELECT s.id AS sid, s.category AS s_category, s.city_slug AS s_city, f.* FROM sponsorships s JOIN fiches f ON f.id = s.fiche_id
     WHERE f.status = 'published' AND ? BETWEEN s.starts_on AND s.ends_on
       AND s.category = ? AND (${o.category ? "s.city_slug = '' OR s.city_slug = ?" : 's.city_slug = ?'})
     ORDER BY (s.city_slug <> '') DESC, RANDOM() LIMIT ?`,
    today(), o.category ?? '', o.city ?? '', limit,
  );
  const out = rows.map((r) => ({ s: get<Sponsorship>('SELECT * FROM sponsorships WHERE id = ?', r.sid)!, f: parseFiche(r) }));
  for (const { s } of out) run('UPDATE sponsorships SET impressions = impressions + 1 WHERE id = ?', s.id);
  return out;
}

export const countSponsorClick = (id: number) => run('UPDATE sponsorships SET clicks = clicks + 1 WHERE id = ?', id);

export const sponsorshipStatus = (s: Pick<Sponsorship, 'starts_on' | 'ends_on'>) =>
  s.ends_on < today() ? 'past' : s.starts_on > today() ? 'upcoming' : 'active';
