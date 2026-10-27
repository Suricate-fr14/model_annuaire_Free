// Fichier de démarrage pour Phusion Passenger (PlanetHoster N0C, cPanel…) : fichier de démarrage « passenger/app.js ».
// Passenger charge ce fichier avec require() et ne sait pas démarrer les modules ES (.mjs) : ce dossier contient son
// propre package.json { "type": "commonjs" } pour que ce fichier reste en CommonJS, quel que soit le package.json racine.
// Le serveur HTTP est créé ici ; sous Passenger, listen() est appelé sans argument : c'est Passenger qui fournit le port.
const path = require('path');
const http = require('http');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..');
process.chdir(root);
try { process.loadEnvFile(path.join(root, '.env')); } catch {}
process.env.ASTRO_NODE_AUTOSTART = 'disabled';

import(pathToFileURL(path.join(root, 'dist', 'server', 'entry.mjs')).href)
  .then(({ handler }) => {
    // Le HTTPS est géré par le serveur web devant Passenger : si l'en-tête X-Forwarded-Proto n'est pas transmis,
    // on le rétablit d'après SITE_URL (sous Passenger, l'application n'est joignable que par le serveur web).
    let site = null;
    try { site = new URL(process.env.SITE_URL || ''); } catch {}
    const behindTls = site && site.protocol === 'https:' && typeof PhusionPassenger !== 'undefined';
    const server = http.createServer((req, res) => {
      if (behindTls && !req.headers['x-forwarded-proto']) req.headers['x-forwarded-proto'] = 'https';
      return handler(req, res);
    });
    if (typeof PhusionPassenger !== 'undefined') {
      server.listen();
    } else {
      const port = Number(process.env.PORT) || 4321;
      server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Annuaire prêt sur http://localhost:${port}`));
    }
  })
  .catch((err) => {
    console.error("Démarrage impossible (le site a-t-il été construit avec « npm run build » ?) :", err);
    process.exit(1);
  });
