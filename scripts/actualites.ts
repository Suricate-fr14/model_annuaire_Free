// Diagnostic des actualités de l'accueil : pour chaque source, flux trouvés, articles lus, retenus et écartés.
// Met aussi à jour le cache en base : l'accueil affiche aussitôt les articles.
// Usage : npm run -s actualites
import { DEFAULT_NEWS_SOURCES, feedsOf, parseItems, isGloomy, refreshNews } from '../src/lib/newsFeed.ts';
import { settings } from '../src/lib/settings.ts';

const list = (settings().news_feed_url || DEFAULT_NEWS_SOURCES.join('\n')).split(/\s+/).filter(Boolean);
let kept = 0;
for (const src of list) {
  console.log(`\n=== ${src}`);
  try {
    const feeds = await feedsOf(src);
    if (!feeds.length) { console.log('  Aucun flux trouvé.'); continue; }
    for (const f of feeds) {
      const items = parseItems(f.body);
      const ok = items.filter((i) => !isGloomy(i));
      kept += ok.length;
      console.log(`  Flux ${f.url} : ${items.length} articles, ${ok.length} retenus`);
      for (const i of items.slice(0, 15)) console.log(`    ${isGloomy(i) ? '✗' : '✓'} ${i.date.slice(0, 16)}  ${i.title}`);
    }
  } catch (e) {
    console.log(`  Erreur : ${(e as Error).message}`);
  }
}
console.log(`\nTotal retenu : ${kept} (il en faut au moins 4 pour afficher le bloc).`);
const c = await refreshNews();
console.log(`Cache de l'accueil mis à jour : ${c?.items.length ?? 0} articles.`);
