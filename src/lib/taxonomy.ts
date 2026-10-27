import { universes, type Universe, type Category } from '../data/universes.ts';

export { universes };
export type { Universe, Category };

const index = new Map<string, { category: Category; universe: Universe }>();
for (const universe of universes) {
  for (const category of universe.categories) {
    if (index.has(category.slug)) throw new Error(`Catégorie en double : ${category.slug}`);
    index.set(category.slug, { category, universe });
  }
}

export const categoryExists = (slug: string) => index.has(slug);
export const getUniverse = (slug: string) => universes.find((u) => u.slug === slug);
export const categoryInfo = (slug: string) => index.get(slug);
export const categoryName = (slug: string) => index.get(slug)?.category.name ?? slug;
export const universeOfCategory = (slug: string) => index.get(slug)?.universe;

export const universeUrl = (u: { slug: string }) => `/univers/${u.slug}`;
export const categoryUrl = (u: { slug: string }, c: { slug: string }) => `/univers/${u.slug}/${c.slug}`;
export const categoryUrlBySlug = (slug: string) => {
  const i = index.get(slug);
  return i ? categoryUrl(i.universe, i.category) : '/univers';
};

/** Univers avec leurs compteurs, à partir d'un compteur par catégorie. */
export function universeStats(counts: Map<string, number>) {
  return universes.map((u) => {
    const categories = u.categories.map((c) => ({ ...c, count: counts.get(c.slug) ?? 0 }));
    return { ...u, categories, count: categories.reduce((n, c) => n + c.count, 0) };
  });
}
export type UniverseStat = ReturnType<typeof universeStats>[number];
