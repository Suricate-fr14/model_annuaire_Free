import { defineMiddleware } from 'astro:middleware';
import { userFromCookies } from './lib/auth';
import { readFlash } from './lib/flash';
import { readEvents } from './lib/analytics';
import { ENV } from './config';

// En-têtes de sécurité ajoutés à toutes les réponses.
const HTTPS = ENV.siteUrl.startsWith('https://');
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  // Pas d'intégration du site dans un cadre tiers, pas de <base> ni de plugin injectés. Les scripts (GTM, Stripe) ne sont
  // pas restreints ici : une liste blanche casserait les balises ajoutées dans Google Tag Manager.
  'Content-Security-Policy': "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  ...(HTTPS && { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }),
};

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  ctx.locals.user = userFromCookies(ctx.cookies);
  ctx.locals.flash = readFlash(ctx.cookies);
  // Événements en attente : lus par la première page affichée (pas par les appels API ou les images).
  ctx.locals.events = pathname.startsWith('/api/') || pathname.startsWith('/media/') ? [] : readEvents(ctx.cookies);

  if (pathname.startsWith('/compte') && !ctx.locals.user) {
    return ctx.redirect(`/connexion?next=${encodeURIComponent(pathname + ctx.url.search)}`);
  }
  if (pathname.startsWith('/admin')) {
    if (!ctx.locals.user) return ctx.redirect(`/connexion?next=${encodeURIComponent(pathname)}`);
    if (ctx.locals.user.role !== 'admin') return new Response('Accès réservé aux administrateurs.', { status: 403 });
  }

  const res = await next();
  if (pathname.startsWith('/compte') || pathname.startsWith('/admin')) {
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Robots-Tag', 'noindex');
  }
  // Une page qui définit sa propre CSP, plus stricte (aperçu des emails), la garde.
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!(k === 'Content-Security-Policy' && res.headers.has(k))) res.headers.set(k, v);
  res.headers.delete('X-Powered-By');
  return res;
});
