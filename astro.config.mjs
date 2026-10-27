import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Le .env est aussi lu au build (SITE_URL sert à déclarer le domaine public ci-dessous).
try { process.loadEnvFile('.env'); } catch {}

const siteUrl = process.env.SITE_URL || 'http://localhost:4321';
const { hostname, protocol } = new URL(siteUrl);
const isLocal = ['localhost', '127.0.0.1'].includes(hostname);

export default defineConfig({
  site: siteUrl,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'never',
  security: {
    // Protection CSRF : les formulaires POST doivent venir du site lui-même.
    checkOrigin: true,
    // Derrière le serveur web de l'hébergeur (qui gère le HTTPS), Astro reçoit les requêtes en HTTP : on l'autorise à
    // lire X-Forwarded-Proto / X-Forwarded-Host pour le seul domaine public, sinon l'origine https:// des formulaires
    // ne correspond pas et tout POST est refusé (« Cross-site POST form submissions are forbidden »).
    allowedDomains: isLocal ? [] : [{ hostname, protocol: protocol.replace(':', '') }],
  },
  vite: {
    ssr: { external: ['node:sqlite'] },
  },
});
