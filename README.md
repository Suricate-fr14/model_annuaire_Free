# Modèle d'annuaire local

Modèle prêt à l'emploi pour créer **l'annuaire des entreprises, commerces et professionnels d'une ville** : livré
sans aucune fiche ni contenu propre à une ville.

Fiches détaillées (horaires et statut « ouvert maintenant », coordonnées, réseaux sociaux, services), création et
revendication de fiches par les professionnels, **validation de chaque fiche par l'admin**, formules payantes Pro et
Premium (Stripe), factures dans Axonaut, contenus SEO générés à partir des fiches, actualités locales sur l'accueil et
back-office complet.

**Stack** : Astro 7 en rendu serveur (adaptateur Node), SQLite natif (`node:sqlite`). Aucune autre base ni service
obligatoire : sans clés Stripe, Axonaut ou Resend, tout fonctionne en mode démo. Les établissements de la ville sont
importés d'OpenStreetMap en une commande.

## Créer l'annuaire d'une ville

1. **Nouveau dépôt** : sur GitHub, *Use this template* (ou copie de ce dépôt), par exemple `annuaire_rennes`.
2. **Ville** : `src/config.ts`, bloc `CITY` :
   - `name` (« Rennes »), `area` (« Rennes et alentour »), `of` (« de Rennes », ou « d'Angers »), `department`, `region` ;
   - `center` : latitude et longitude du centre-ville (clic droit sur la carte dans Google Maps), **obligatoire** pour l'import ;
   - `radiusM` : rayon de l'import en mètres (9 000 m couvrent une ville moyenne et ses communes voisines).
3. **Site** : même fichier, bloc `SITE` : `fullName` (titre des pages et des emails), `parent` (nom, adresse, logo et
   présentation du site associé : lien « Retour sur… » et éditeur), `contactEmail`, puis `legal` (éditeur, hébergeur,
   tribunal compétent : à vérifier pour chaque site).
4. **Logo et icônes** : remplacer `public/logo.svg` (logo du site parent, 75 × 32), `public/favicon-32.png`,
   `public/apple-touch-icon.png` (180 × 180) et `public/icon-192.png`.
5. **Contenus locaux** (recommandé pour le référencement) : `src/data/universeGuides.ts` et `src/data/categoryGuides.ts`
   contiennent des conseils valables partout en France ; y ajouter des repères vérifiés propres à la ville (marchés,
   lieux de sortie, sites à visiter, spécialités).
6. **Installation** (locale ou serveur, voir plus bas) : `.env` (copie de `.env.example` : `SITE_URL`, compte admin),
   puis `npm install && npm run setup` : import OpenStreetMap de la zone et création du compte admin.
7. **Actualités de l'accueil** : Admin > SEO > Actualités : coller l'adresse de pages d'actualité locale (presse, CCI,
   site de la ville) ; les flux sont trouvés automatiquement. Sans source, le bloc n'est pas affiché.
8. **Après le lancement** : Admin > SEO (Google Tag Manager, Search Console), Stripe (`npm run stripe:setup`), tâches
   cron (sauvegarde, facturation, bilan mensuel), `.htaccess` (voir « Mise en ligne »).

Les évolutions de l'annuaire de Caen peuvent être reportées ici : mêmes fichiers, hors `src/config.ts`, `src/data/`,
`public/` et `README.md`.

## Sommaire

1. [Installation locale](#installation-locale)
2. [Mise en ligne sur PlanetHoster N0C](#mise-en-ligne-sur-planethoster-n0c) (en SSH, ou [par FTP sans SSH](#4-bis-installation-par-ftp-sans-ssh))
3. [Mettre à jour le site](#mettre-à-jour-le-site)
4. [Sauvegardes et tâches planifiées](#sauvegardes-et-tâches-planifiées)
5. [Dépannage](#dépannage)
6. [Variables d'environnement](#variables-denvironnement)
7. [Commandes](#commandes)
8. [Fonctionnement](#fonctionnement) : parcours, formules, demandes de contact, indexation et SEO, mesure d'audience, données structurées, Stripe, Axonaut, emails, données
9. [Où modifier quoi](#où-modifier-quoi)
10. [Sécurité](#sécurité)
11. [À compléter avant le lancement](#à-compléter-avant-le-lancement)

## Installation locale

Prérequis : **Node.js 22.18 ou plus** (SQLite natif et exécution directe des scripts `.ts`), Git.

```bash
git clone https://github.com/<votre-compte>/<votre-depot>.git annuaire
cd annuaire
npm install
cp .env.example .env          # renseigner au moins ADMIN_EMAIL et ADMIN_PASSWORD (10 caractères min.)
npm run setup                 # importe les établissements (OpenStreetMap), crée l'admin et les données de démo
npm run dev                   # http://localhost:4321
```

- **Back-office** : http://localhost:4321/admin, avec `ADMIN_EMAIL` / `ADMIN_PASSWORD` du `.env`.
- **Comptes de démonstration** : `pro@example.test` (fiche Premium) et `nouveau@example.test` (fiche en attente et
  revendication en cours), mot de passe `DEMO_PASSWORD` (ou `ADMIN_PASSWORD` à défaut).
- **Mode démo** (sans clés) : paiement simulé, emails visibles dans **Admin > Emails**, paiements « en attente de facturation ».
- La base locale est le fichier `data/annuaire.db` ; les logos et photos envoyés sont dans `data/uploads/`.

## Mise en ligne sur PlanetHoster N0C

L'annuaire est une application Node.js avec sa propre base SQLite : il s'héberge **à côté** du site parent, sur un
sous-domaine (ex. `annuaire.example.com`). N0C fait tourner les applications Node.js avec
**Phusion Passenger**.

> **Pourquoi `passenger/app.js` ?** Passenger charge le fichier de démarrage avec `require()` et ne sait pas démarrer
> un projet en modules ES (`"type": "module"`). Le dossier `passenger/` contient donc un fichier de démarrage
> CommonJS (avec son propre `package.json` `{ "type": "commonjs" }`) qui charge le `.env`, construit le serveur
> à partir du build Astro et laisse Passenger fournir le port. Il rétablit aussi l'en-tête `X-Forwarded-Proto: https`
> quand `SITE_URL` est en HTTPS (sans lui, les formulaires seraient refusés, voir [Dépannage](#dépannage)).

### 1. Sous-domaine

N0C > **Domaines > Sous-domaines** : créer `annuaire.example.com` (racine du document : `annuaire.example.com`
ou le dossier proposé), puis vérifier que le certificat SSL (Let's Encrypt) est actif.

### 2. Application Node.js

N0C > **Langages > Node.js > Créer une application** :

| Champ | Valeur |
|---|---|
| Version de Node.js | **24** (22.18 minimum) |
| Mode de l'application | **Production** |
| Racine de l'application | `annuaire` (dossier `~/annuaire`) |
| URL de l'application | `annuaire.example.com`, chemin vide |
| Fichier de démarrage | **`passenger/app.js`** |

N0C écrit la configuration Passenger dans le `.htaccess` du sous-domaine (bloc « CLOUDLINUX PASSENGER
CONFIGURATION ») : ne pas le modifier à la main.

**Masquer la version du serveur** (recommandé) : Passenger ajoute l'en-tête `X-Powered-By: Phusion Passenger(R) x.y.z`.
Les scanners de sécurité en déduisent à tort un site Ruby on Rails et affichent de vieilles CVE Rails sans rapport
avec l'annuaire (Node.js / Astro). Ajouter **à la fin** du `.htaccess` du sous-domaine (`~/annuaire.example.com/.htaccess`),
en dehors du bloc Passenger :

```apache
<IfModule mod_headers.c>
  Header always unset X-Powered-By
  Header unset X-Powered-By
  Header always unset X-Runtime
</IfModule>
ServerSignature Off
```

Vérification : `curl -sI https://annuaire.example.com | grep -i powered` ne doit plus rien afficher.

### 3. Jeton GitHub (dépôt privé)

Sur le compte propriétaire du dépôt : GitHub > **Settings > Developer settings > Personal access tokens >
Fine-grained tokens > Generate new token** :

- **Repository access** : *Only select repositories* → votre dépôt ;
- **Permissions** : **Contents → Read-only** (sans elle, `git fetch` répond « 403 »).

Le jeton sert de mot de passe lors du `git fetch` / `git pull`. Ne le collez ni dans un fichier du projet ni dans
un message ; conservez-le dans un gestionnaire de mots de passe.

### 4. Installation en SSH

Se connecter en SSH (identifiants dans N0C > **Accès SSH**), puis **activer l'environnement Node** avec la commande
affichée en haut de la page de l'application dans N0C (de la forme `source /home/<compte>/nodevenv/annuaire/24/bin/activate && cd /home/<compte>/annuaire`).
Sans cette étape, `npm` est introuvable.
Pour l'activer automatiquement à chaque connexion (une seule fois) :
`echo 'source ~/nodevenv/annuaire/24/bin/activate' >> ~/.bashrc`.

```bash
# Récupérer le code (le dossier créé par N0C n'est pas vide : on initialise Git sur place)
git init -b main
git remote add origin https://github.com/<votre-compte>/<votre-depot>.git
git fetch origin                     # identifiant : votre compte GitHub · mot de passe : le jeton GitHub
git checkout -f -B main origin/main

npm install

# Configuration
cp .env.example .env
nano .env                            # voir ci-dessous

# Base de données : import OpenStreetMap + compte admin
npm run setup

# Build limité à un fil, sans npm (sans cela, esbuild ou Rolldown plantent sur l'hébergement mutualisé)
sh scripts/build-n0c.sh

# Démarrage / redémarrage
mkdir -p tmp && touch tmp/restart.txt
```

`.env` de production, au minimum :

```ini
SITE_URL=https://annuaire.example.com
ADMIN_EMAIL=votre-adresse@exemple.fr
ADMIN_PASSWORD=un-mot-de-passe-long-et-unique
MAIL_FROM=Annuaire Votre ville <contact@example.com>
```

`SITE_URL` doit être **exactement** l'adresse publique (https, sans barre finale) : elle sert aux liens des emails,
au sitemap, aux balises canonical, aux retours Stripe et à la protection CSRF.

### 4 bis. Installation par FTP (sans SSH)

Sans accès SSH, tout se prépare **sur votre ordinateur** (Node.js 22.18 minimum, 24 conseillé), puis s'envoie par FTP
(ou SFTP, ou le Gestionnaire de fichiers de l'hébergeur) dans le dossier de l'application (`~/annuaire`).

**1. Préparer en local**

```bash
git clone https://github.com/<votre-compte>/<votre-depot>.git annuaire
cd annuaire
npm install
cp .env.example .env      # renseigner les valeurs de PRODUCTION (SITE_URL=https://annuaire.example.com…)
npm run setup             # crée data/annuaire.db : import OpenStreetMap + compte admin (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run build             # crée le dossier dist/
```

**2. Envoyer par FTP** dans `~/annuaire` :

| À envoyer | Rôle |
|---|---|
| `dist/` | le site construit |
| `passenger/` | fichier de démarrage `passenger/app.js` |
| `package.json`, `package-lock.json` | liste des dépendances |
| `data/` | base `annuaire.db` et images `uploads/` (sans `annuaire.db-wal` ni `annuaire.db-shm`) |
| `.env` | configuration et clés (fichier caché : activer l'affichage des fichiers cachés dans le client FTP) |

Ne pas envoyer `src/`, `scripts/` ni `.git/` : ils ne servent qu'à construire le site.

**3. Dépendances (`node_modules`)** : le serveur en a besoin pour démarrer.

- si la page de l'application Node.js de l'hébergeur propose d'installer les dépendances (bouton « npm install »
  ou équivalent), l'utiliser après l'envoi de `package.json` et `package-lock.json` ;
- sinon, envoyer le dossier `node_modules/` **installé sur Linux 64 bits** (le module d'images `sharp` contient du
  code propre au système : un `node_modules` installé sous Windows ou macOS ne convient pas). Sans `sharp`, le site
  fonctionne, mais les images envoyées ne sont pas converties (3 Mo max, voir [Images](#images)).

**4. Démarrer** : bouton « Redémarrer » de l'application Node.js, ou envoyer un fichier vide `tmp/restart.txt`
(dossier `tmp/` à créer dans `~/annuaire`).

**Mettre à jour sans SSH** : en local, `git pull && npm install && npm run build`, puis renvoyer `dist/` (et
`package.json`, `package-lock.json` + dépendances s'ils ont changé), puis redémarrer. **Ne jamais écraser `data/`
ni `.env` sur le serveur** : ils contiennent les fiches, les comptes, les paiements et les clés. Les migrations de la
base s'appliquent seules au redémarrage.

**Tâches planifiées sans SSH** : le panneau « Tâches cron » de l'hébergeur fonctionne sans SSH ; reprendre les lignes
de [Sauvegardes et tâches planifiées](#sauvegardes-et-tâches-planifiées). Pour récupérer une sauvegarde, télécharger
`data/backups/` par FTP.

### 5. Vérifier

- https://annuaire.example.com s'affiche, https://annuaire.example.com/admin accepte la connexion admin ;
- avec SSH : `node passenger/app.js` lancé à la main affiche « Annuaire prêt » (Ctrl+C pour quitter) ;
- https://annuaire.example.com/sitemap.xml et `/robots.txt` répondent.

### Base de données : pas de phpMyAdmin

La base est un **fichier SQLite** (`data/annuaire.db`), pas une base MySQL : phpMyAdmin ne sert pas. Pour reprendre
une base locale sur le serveur :

1. en local, arrêter `npm run dev` ;
2. envoyer `data/annuaire.db` et le dossier `data/uploads/` dans `~/annuaire/data/` (Gestionnaire de fichiers N0C ou SFTP),
   en supprimant au besoin `annuaire.db-wal` et `annuaire.db-shm` sur le serveur ;
3. `touch tmp/restart.txt`.

Si l'API OpenStreetMap (Overpass) est saturée au moment de `npm run setup` (erreur 504), envoyer le cache
`data/osm-<ville>.json` d'une installation locale dans `~/annuaire/data/`, puis relancer `npm run setup` : l'import
lit alors le cache sans rien télécharger.

### Lien depuis le site parent

Ajouter un lien « Annuaire » vers l'adresse de l'annuaire dans le menu du site parent. Les sessions de l'annuaire
sont indépendantes de WordPress (cookies propres au sous-domaine).

## Mettre à jour le site

Après chaque `git push` sur GitHub, en SSH (environnement Node activé, dans `~/annuaire`) :

```bash
git pull && npm install && sh scripts/build-n0c.sh && touch tmp/restart.txt
```

Les migrations de la base (nouvelles colonnes, nouvelles tables) s'appliquent automatiquement au redémarrage : les
fiches, comptes et paiements existants sont conservés. Recharger ensuite la page avec Ctrl+F5.

## Sauvegardes et tâches planifiées

À sauvegarder : `data/annuaire.db` (toute la base) et `data/uploads/` (logos et photos). `.env` contient les secrets :
le garder aussi, hors du dépôt.

`npm run db:backup` crée une copie cohérente de la base, même site en ligne, dans `data/backups/` et conserve les 14
dernières (`-- --keep 30` pour en garder plus).

Tâches cron conseillées (N0C > **Tâches cron**, chemins à adapter au compte) :

```cron
# Sauvegarde de la base chaque nuit à 3 h
0 3 * * *  cd ~/annuaire && source ~/nodevenv/annuaire/24/bin/activate && npm run -s db:backup
# Renvoi vers Axonaut des paiements pas encore facturés, chaque nuit à 4 h
0 4 * * *  cd ~/annuaire && source ~/nodevenv/annuaire/24/bin/activate && npm run -s billing:retry
# Bilan mensuel par email aux pros (Pro et Premium), le 1er du mois à 8 h 15
15 8 1 * *  cd ~/annuaire && source ~/nodevenv/annuaire/24/bin/activate && npm run -s bilan:mensuel
# Relances par email (fiche à compléter, formule non finalisée, formule offerte qui se termine), chaque jour à 9 h 50
50 9 * * *  cd ~/annuaire && source ~/nodevenv/annuaire/24/bin/activate && npm run -s emails:relances
# Avis Google (DataForSEO) : fiches Pro et Premium non mises à jour depuis 30 jours, chaque nuit à 5 h
0 5 * * *  cd ~/annuaire && source ~/nodevenv/annuaire/24/bin/activate && npm run -s avis:google
```

Télécharger de temps en temps `data/backups/` et `data/uploads/` hors du serveur.

## Dépannage

| Symptôme | Cause | Solution |
|---|---|---|
| `npm: command not found` | Environnement Node non activé | Lancer la commande `source …/nodevenv/…/activate` affichée par N0C |
| `npm ci` : « package-lock.json absent » | Le code n'est pas encore récupéré | Faire d'abord les commandes Git de l'étape 4 |
| `git fetch` : « Authentication failed » | Mot de passe GitHub saisi au lieu du jeton | Utiliser le jeton fine-grained comme mot de passe |
| `git fetch` : « 403 » | Jeton sans permission sur le contenu | Ajouter **Contents : Read-only** au jeton |
| « Web application could not be started » | Mauvais fichier de démarrage, build absent ou erreur au démarrage | Fichier de démarrage `passenger/app.js`, relancer le build ; pour voir l'erreur, passer l'application en mode **Développement** dans N0C, puis revenir en Production |
| `require is not defined in ES module scope` | Fichier de démarrage par défaut de N0C (`app.js` / `app.cjs.js` à la racine) | Mettre `passenger/app.js` comme fichier de démarrage |
| Build : pile d'erreurs Go (`runtime: …`, `goroutine …`) | esbuild lance trop de fils sur le mutualisé | `sh scripts/build-n0c.sh` |
| Build : `Rolldown panicked`, `ThreadPoolBuildError`, `Resource temporarily unavailable` | Rolldown lance trop de fils sur le mutualisé | `sh scripts/build-n0c.sh` |
| Build : `failed to create new OS thread`, `newosproc` | Limite de processus du compte atteinte (site en ligne + build) | N0C > Node.js : **Arrêter** l'application, `sh scripts/build-n0c.sh`, puis **Démarrer** |
| « Cross-site POST form submissions are forbidden » | `SITE_URL` différent de l'adresse réelle (http au lieu de https, www, barre finale…) | Corriger `SITE_URL`, relancer le build, redémarrer |
| `npm run setup` : Overpass 504 | API OpenStreetMap saturée | Réessayer plus tard ou envoyer `data/osm-<ville>.json` (voir plus haut) |
| Les changements n'apparaissent pas | Pas de build ou pas de redémarrage | `sh scripts/build-n0c.sh && touch tmp/restart.txt`, puis Ctrl+F5 |

## Variables d'environnement

Fichier `.env` à la racine (modèle : `.env.example`, jamais versionné).

| Variable | Rôle |
|---|---|
| `SITE_URL` | URL publique : `https://annuaire.example.com` en production |
| `DATABASE_PATH`, `UPLOADS_DIR` | Base SQLite et images envoyées (par défaut `./data/annuaire.db` et `./data/uploads`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Compte admin créé par `db:seed` (mot de passe : 10 caractères min.) |
| `DEMO_PASSWORD` | Mot de passe des comptes de démonstration (vide = `ADMIN_PASSWORD`) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Paiement Stripe (vide = mode démo) |
| `STRIPE_PRICE_PRO_MONTH`, `STRIPE_PRICE_PRO_YEAR`, `STRIPE_PRICE_PREMIUM_MONTH`, `STRIPE_PRICE_PREMIUM_YEAR` | Identifiants `price_…` des 4 prix Stripe (remplis par `npm run stripe:setup`) |
| `STRIPE_PORTAL_CONFIG` | Configuration du portail client (remplie par `npm run stripe:setup`) |
| `AXONAUT_API_KEY` | Facturation Axonaut (vide = paiements en attente de facturation) |
| `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | Avis Google via DataForSEO (identifiants API du compte) ; `DATAFORSEO_API_URL=https://sandbox.dataforseo.com` pour des essais gratuits |
| `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | Avis Google via DataForSEO (identifiants API du compte) ; `DATAFORSEO_API_URL=https://sandbox.dataforseo.com` pour des essais gratuits |
| `RESEND_API_KEY`, `MAIL_FROM` | Envoi des emails (vide = emails conservés dans Admin > Emails) |
| `PORT`, `HOST` | Uniquement hors Passenger (`npm start`) : port et interface d'écoute |

Après une modification du `.env` : `touch tmp/restart.txt` (et un nouveau build si `SITE_URL` change).

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (http://localhost:4321) |
| `npm run build` | Build de production |
| `sh scripts/build-n0c.sh` | Build à utiliser sur N0C : un fil par outil, sans npm (≈ 50 processus au lieu de 85) |
| `npm start` | Serveur Node autonome hors Passenger (VPS, Docker…) |
| `npm run setup` | `db:import` + `db:seed` (première installation) |
| `npm run db:import` | Import / mise à jour des établissements OpenStreetMap (`-- --refresh` pour retélécharger) |
| `npm run db:seed` | Crée le compte admin et les données de démonstration (sans toucher aux comptes existants) |
| `npm run db:villes` | Remet chaque fiche sur sa commune officielle (`-- --dry` pour prévisualiser) |
| `npm run db:backup` | Sauvegarde de la base dans `data/backups/` (`-- --keep N`) |
| `npm run stripe:setup` | Crée dans Stripe produits, prix, webhook et portail, et remplit le `.env` |
| `npm run db:descriptions` | Aperçu des textes régénérés des fiches importées non revendiquées (`-- --appliquer` pour enregistrer, `-- --telephone` pour y inclure le numéro) |
| `npm run bilan:mensuel` | Bilan du mois écoulé par email aux pros (`-- --apercu` sans envoi, `-- --mois=AAAA-MM`, `-- --force`) |
| `npm run stripe:promo -- --code=PROMO20 --pourcent=20 --formule=pro --fin=2026-11-30` | Crée un code promo Stripe pour une formule (`pro`, `premium`, `toutes`), nouveaux clients ; `--mois=N` (durée de la remise, défaut : 1re échéance), `--max=N` |
| `npm run billing:retry` | Envoie vers Axonaut les paiements en attente |
| `npm run db:fiche -- scripts/fiches/<fichier>.json` | Crée ou met à jour une fiche complète depuis un JSON (publication, propriétaire, formule offerte) ; aperçu sans `--appliquer`, `--id N` pour viser une fiche précise |
| `npm run -s images:optimiser` | Allège les images déjà envoyées (redimensionnées et recompressées sous le même nom ; `-- --apercu` pour voir le gain sans rien modifier) |
| `npm run -s emails:relances` | Relances par email dues aujourd'hui (`-- --apercu` pour les afficher sans les envoyer) |
| `npm run -s actualites` | Diagnostic des actualités de l'accueil (flux trouvés, articles retenus ✓ ou écartés ✗) et mise à jour du cache |

## Fonctionnement

### Parcours

| Qui | Parcours |
|---|---|
| Visiteur | Recherche (mot-clé, ville, univers, « ouvert maintenant ») avec suggestions instantanées, univers → catégories, villes, A–Z, fiche détaillée, signaler une erreur. L'accueil affiche en premier les **nouveaux inscrits** |
| Professionnel | `/tarifs` → `/creer-ma-fiche` (la formule choisie est conservée) : vérifie si l'établissement existe, **revendique** la fiche existante ou en **crée** une. Chaque fiche, gratuite ou payante, **attend la validation de l'admin** avant d'apparaître ; le lien de paiement est envoyé à la validation. Espace `/compte` : fiches, statistiques, formule, factures, coordonnées de facturation, paramètres |
| Abonné Pro / Premium | **Fiche indexée sur Google** (title et meta description personnalisables), site internet, plan d'accès Google Maps et présentation détaillée (**réservés aux formules payantes**), badge certifié, galerie (6 ou 12 photos), statistiques d'appels / itinéraires / clics, classement en tête (Premium devant Pro) |
| Admin | `/admin` (interface dédiée) : tableau de bord (indicateurs, file « à traiter », courbes 30 jours), fiches (filtres, actions groupées, **édition complète d'une fiche, y compris SEO et indexation**, modération, propriétaire, formule offerte, historique), revendications, signalements, facturation, utilisateurs, emails |

### Formules

| Formule | Mensuel | Annuel | Contenu |
|---|---|---|---|
| Gratuite | 0 € | 0 € | Adresse, horaires, réseaux sociaux, services, logo, description courte (fiche non indexée, **sans téléphone ni email affichés**) |
| Pro | 9 € HT | 99 € HT (8,25 €/mois) | + téléphone et email affichés, bannière de couverture, indexation Google, site internet, plan d'accès, présentation détaillée, badge, 6 photos, 5 références clients, statistiques |
| Premium | 19 € HT | 190 € HT (15,83 €/mois) | + tête de liste devant Pro, priorité dans les sélections du jour, 12 photos, 4 vidéos YouTube, formulaire « Demander un devis » (option « J'achète des leads »), assistance prioritaire |

Prix, avantages et nombre de photos : `PLANS` dans `src/config.ts`. Les règles sont appliquées côté serveur
(`src/lib/ficheForm.ts`, `src/pages/[slug].astro`) : sans abonnement, le site internet et la présentation détaillée
saisis sont conservés mais masqués, puis réaffichés en cas de réabonnement. L'import OSM n'importe jamais le site internet.
Le téléphone et l'email (y compris ceux importés d'OpenStreetMap) restent enregistrés mais ne sont affichés, sur la
fiche, dans les listes et dans les données structurées, qu'avec Pro ou Premium (`showsContact` dans `src/lib/fiches.ts`).

**Formule offerte** (Admin > Fiches > fiche > Formule, `src/lib/formula.ts`) : Pro ou Premium offert à n'importe quelle
fiche, pour N jours (essai) ou sans limite (clients privilégiés). Elle s'ajoute à l'abonnement Stripe éventuel sans le
modifier : la plus haute des deux formules s'applique, le webhook la respecte, et à la fin la fiche reprend sa formule
payée (ou redevient gratuite) automatiquement ; le propriétaire et les admins reçoivent un email à chaque changement.
Colonnes : `paid_*` (abonnement payé, écrit par le webhook), `gift_*` (cadeau), `pro_status` / `plan` / `pro_until`
(formule effective, lue par tout le site).

### Textes des fiches importées

`npm run db:descriptions` rédige l'accroche et la présentation des fiches importées d'OpenStreetMap, gratuites et non
revendiquées (`src/lib/autoText.ts`) : catégorie, adresse, horaires en phrases (« Ouvert du lundi au vendredi de 9h à
18h, le samedi de 9h à 12h ; fermé le dimanche »), informations de l'import conservées (cuisine, enseigne…). Trois
tournures alternent pour varier les textes. Sans option, rien n'est modifié (aperçu) ; `-- --appliquer` enregistre
(faire `npm run -s db:backup` avant). Le téléphone n'est ajouté qu'avec `-- --telephone`, car il est masqué sur les fiches
gratuites. La présentation d'une fiche non revendiquée est affichée même sans formule ; une fois revendiquée, la règle
des formules s'applique. À relancer après un nouvel import.

### Mise en avant des fiches payantes

- **Bannière** (Pro et Premium) : image de couverture en haut de la fiche, image de partage sur les réseaux sociaux.
- **Références clients** (Pro et Premium) : 5 logos de clients au plus, avec leur nom, dans un bloc « Nos références clients » de la fiche ; ajout et suppression enregistrés aussitôt.
- **Actualité ou offre du moment** (Pro et Premium) : titre, détail, lien, date de fin ; bloc en haut de la fiche,
  pastille « Offre » et titre de l'offre dans les listes ; masquée automatiquement après la date de fin.
- **Listes** : les fiches Premium s'affichent avec un visuel (bannière, sinon 1re photo), une pastille et leur accroche.
- **Bilan mensuel** : `npm run bilan:mensuel` (tâche cron le 1er du mois) envoie à chaque pro les vues, appels,
  itinéraires, clics et demandes de devis du mois écoulé, avec l'évolution et des conseils. Statistiques mensuelles
  enregistrées à partir de cette version (table `fiche_stats`). Désabonnement : Mon compte > Paramètres.
- **Mises en avant sponsorisées** (Admin > Mises en avant) : une fiche dans un encadré « Sponsorisé » en tête d'une
  catégorie (toutes villes ou une ville) ou d'une page ville, sur une période ; deux au plus par emplacement.
  Affichages et clics comptés (bilan pour le client). Vendues hors abonnement : facturation manuelle (Axonaut).

### Modifier les prix

1. `src/config.ts`, `PLANS` : montants **HT** `month` et `year` de Pro et Premium (tout le site en découle : cartes,
   tarifs, « dès … € HT / mois », données structurées).
2. Sur le serveur : `git pull`, puis `npm run stripe:setup` (crée dans Stripe les nouveaux prix TTC, met à jour le
   portail client et le `.env`), puis `sh scripts/build-n0c.sh && touch tmp/restart.txt`.
3. Les abonnés existants gardent leur ancien prix (Stripe ne le change pas seul) ; les nouveaux souscrivent au nouveau.
   Pour faire passer un abonné au nouveau tarif : Stripe > Abonnements > Modifier le prix.

### Ventes : téléphone masqué, code promo, contenu des catégories

- **« Afficher le téléphone »** sur les fiches gratuites : le numéro reste masqué, un message s'affiche et le clic est
  compté (`clicks_phone_locked`, et par mois dans `fiche_stats`). Le propriétaire le voit dans son espace, et le
  bilan mensuel lui envoie « X personnes ont voulu vous appeler » avec l'offre Pro (fiches gratuites avec activité).
- **Codes promo par formule** : `npm run stripe:promo -- --code=PROMO20 --pourcent=20 --formule=pro --fin=2026-11-30`
  crée le code dans Stripe (limité à la formule, nouveaux clients, remise sur la 1re échéance sauf `--mois=N`) ; le
  client le saisit sur la page de paiement. Admin > Facturation > Offres promotionnelles : une ligne par code (formule,
  %, date de fin) ; affichage sur les tarifs (bandeau et pastille sur la carte de la formule), la page d'abonnement et
  dans les emails, jusqu'à la date de fin. Code vide = offre retirée du site (le code reste à désactiver dans Stripe).
- **Contenu SEO des pages catégories, univers et villes** (`src/lib/pageContent.ts`, composant `SeoContent`), en
  première page, texte sur une seule colonne et pleine largeur :
  - **Introduction** dans un encadré, avec les chiffres réels de la page.
  - **Repères chiffrés** (`src/lib/insights.ts`, calculés sur les fiches publiées, cache 10 min) : fiches, communes,
    part ouverte le dimanche, ouvertures avant 8 h et fermetures après 21 h, jours d'ouverture et jour de fermeture le
    plus fréquent (avec les établissements ouverts ce jour-là), heures médianes, pause de midi, samedi après-midi,
    soirée, services signalés, types de cuisine, rues les plus fréquentes ; listes cliquables (ouverts le dimanche, tôt,
    tard), liens par commune et par domaine. Tout est rédigé en phrases.
  - **« Nos conseils »** : pages catégories = conseil du métier (`src/data/categoryTips.ts`, 238 catégories) + guide
    réglementaire des 27 catégories les plus consultées (`src/data/categoryGuides.ts`) ; pages univers = guide de
    l'univers (`src/data/universeGuides.ts` : droits, règles, repères locaux) puis, pour les 10 premières catégories,
    conseil + repère + chiffres réels + bouton « Voir les N fiches ».
  - **FAQ** balisée FAQPage : questions calquées sur les recherches réelles (« quelle boulangerie est ouverte le
    dimanche », « quel jour un restaurant est-il fermé », « combien coûte… », « X ou Y »), réponses avec noms
    d'établissements et chiffres réels ; formulations choisies selon la page, deux pages voisines ne se ressemblent pas.
  - Contenus éditables : `src/data/categoryTips.ts`, `categoryExtras.ts` (spécialités, comparaisons, tarifs, urgence,
    remboursement), `categoryGuides.ts`, `universeTips.ts`, `universeGuides.ts`. Aucun tarif ni chiffre inventé : les
    chiffres viennent des fiches.

### Accueil et sommaire

- **Accueil** (`src/pages/index.astro`) : recherche et accès rapides, nouveaux inscrits (le site « vit »), « Découvrir
  par univers » (10 univers), fiches à la une, actualité locale, fonctionnement et chiffres clés, communes, offres pour
  les professionnels (prix lus dans `PLANS`), présentation et FAQ (FAQPage).
- **Annuaire** (`/annuaire`) : sommaire complet, sans doublon avec l'accueil : univers du jour, toutes les catégories
  par univers (tuiles), index A à Z, toutes les communes.
- **Actualités** (`src/lib/newsFeed.ts`) : 4 articles issus de flux RSS ou Atom, sources mélangées et triées par date ;
  bloc masqué s'il y a moins de 4 articles. Admin > SEO > Actualités : une source par ligne ; l'adresse d'une simple page
  suffit, ses flux sont trouvés automatiquement (balises `<link rel="alternate">`, liens RSS, `…/feed/` WordPress) ;
  état de chaque source (articles lus et retenus). Les sujets déprimants (faits divers, décès, accidents, justice,
  grèves, blocages, licenciements…) sont écartés par mots-clés. Seuls les articles de moins de 30 jours sont affichés, sans doublon
  (même article dans plusieurs flux : adresse ou titre identique). Cache de 30 min conservé en base (clé `news_cache` de la
  table `settings`) : servi aussitôt après un redémarrage de Passenger. Diagnostic : `npm run -s actualites`.

### Créer une fiche complète par script

`npm run db:fiche -- scripts/fiches/<fichier>.json` crée ou met à jour une fiche depuis un JSON (voir
`scripts/fiches/` pour des exemples) : publication, rattachement à un compte existant (`owner_email`), formule offerte
(`plan`, `days` ; sans `days` = sans limite), géocodage de l'adresse. Une fiche existante (recherchée par commune et nom, `match`) est mise à jour :
elle garde son nom et son adresse web (sauf `"rename": true`), ses photos et ses coordonnées. Aperçu par défaut,
`--appliquer` pour enregistrer (après `npm run -s db:backup`).

### Demandes de contact (leads, Premium)

- **Activation** : fiche Premium, section 8 du formulaire, case « J'achète des leads ». La même section accepte jusqu'à
  3 liens YouTube (`src/lib/video.ts`), affichés sur la fiche ; le lecteur `youtube-nocookie.com` n'est chargé qu'au clic.
- **Formulaire « Demander un devis »** sur la fiche (`#demande`) : type de demande, délai, besoin, nom, téléphone, email,
  code postal facultatif, consentement. Anti-abus : champ piège, 5 demandes par heure et par IP, 2 par jour et par fiche.
  Le prospect reçoit un accusé de réception ; les admins sont prévenus.
- **Admin > Demandes** : chaque demande est vérifiée puis **transmise** (email au propriétaire, avec réponse directe au
  prospect, et prospect prévenu) ou **refusée** (motif, rien n'est envoyé). Suppression définitive possible (RGPD).
- **Espace pro > Demandes** : demandes transmises avec téléphone et email du prospect.
- **Statistiques** : demandes par fiche (espace pro, fiche admin), demandes transmises du mois et à vérifier
  (tableau de bord admin), événement GTM `generate_lead` (événement clé).
- Code : `src/lib/leads.ts`, `src/pages/admin/demandes.astro`, `src/pages/compte/demandes.astro`, formulaire dans `src/pages/[slug].astro`.

### Avis Google (DataForSEO)

- **Admin > fiche > Avis Google** : coller le lien de la fiche Google Maps (adresse complète ; un lien court
  `maps.app.goo.gl` n'est pas reconnu), le CID, le place_id ou, à défaut, le nom et la ville, puis « Enregistrer et
  récupérer les avis » (résultat en une à deux minutes).
- **Mise à jour** : `npm run -s avis:google` (tâche cron quotidienne, chaque fiche n'est interrogée qu'une fois par
  mois, fiches Pro et Premium seulement). Coût DataForSEO : 20 avis demandés par mise à jour, soit 2 pages facturées.
- **Affichage** (`src/components/GoogleReviews.astro`) : appréciation, note, nombre d'avis, puis
  les derniers avis avec un commentaire, quelle que soit leur note (4 en Pro, 8 en Premium, aucun en gratuit), réponse du pro comprise ; note rappelée en haut de fiche.
  Les photos des auteurs sont copiées sur le serveur (aucune requête vers Google depuis les pages).
- **Pas de données structurées** (`aggregateRating`) pour ces avis : les règles de Google interdisent de baliser des
  avis collectés sur un autre site (risque d'action manuelle sur tout le site).

### Images

- **À l'envoi** (`src/lib/uploads.ts`, module `sharp`) : logos, bannières et photos (10 Mo max) sont redressés selon
  l'EXIF, débarrassés de leurs métadonnées (position GPS comprise), redimensionnés sans agrandissement (logo 800 px,
  bannière 2000 × 1000, photo 1600 px) et convertis en WebP. Si `sharp` est indisponible, le fichier est gardé tel quel
  (3 Mo max).
- **Images déjà en ligne** : `npm run -s images:optimiser` (une fois après la mise à jour).
- **Images de partage** (Facebook, LinkedIn, WhatsApp… : `src/lib/ogImage.ts`, servies par `/og/….png`) : accueil,
  annuaire, villes, tarifs, domaines, catégories, communes et fiches sans photo reçoivent une image 1200 × 630 générée
  avec le titre de la page et le nombre d'adresses (police Inter dans `assets/fonts`, licence OFL). Le texte vient
  toujours de la base, jamais de l'adresse appelée. Images gardées en mémoire, régénérées quand le texte change.

### Indexation et SEO

| Page | Moteurs de recherche |
|---|---|
| Accueil, annuaire, univers, catégories (et leurs pages filtrées par ville), villes, tarifs, pages légales | Indexées |
| **Fiches Pro et Premium** | **Indexées** et présentes dans le sitemap |
| **Fiches gratuites** | `noindex, follow` : visibles dans l'annuaire, absentes du sitemap |
| Pages A–Z, recherche, espace pro, admin, paiement | `noindex` |
| Ville filtrée par domaine (`/ville/x?univers=y`) | `noindex, follow` (liste courte, titre et H1 propres) |

- Liens vers les **réseaux sociaux** des fiches en `nofollow` ; tous les autres liens (internes, site internet des fiches) sont suivis.
- L'admin peut **forcer** l'indexation d'une fiche (toujours / jamais) depuis la fiche ou en action groupée ;
  « Automatique » revient à la règle par formule (`index_mode` : `auto`, `index`, `noindex`).
- Le pro et l'admin personnalisent le **title** (65 caractères max) et la **meta description** (160 max) de chaque
  fiche, avec un aperçu Google en direct ; vides, ils sont générés (`src/lib/seo.ts`).
- Canonical : seuls les paramètres qui changent le contenu sont conservés (`page` partout, `ville` sur les pages
  catégories ; prop `canonicalParams` de `Base.astro`) : `/univers/x?ville=y` pointe vers `/univers/x`. Liens internes
  en chemins complets (pas de `?ville=` relatif). Sitemap : `/sitemap.xml`, généré à la demande.
- Title au-delà de 70 caractères : le suffixe « | nom du site » est retiré ; meta description de moins de 70 caractères
  complétée ; « Page N. » ajouté au-delà de la première page.
- **Modèles avec variables (façon Yoast)**, Admin > SEO : un modèle de title et de description par type de page
  (fiches, catégories, univers, villes), avec des variables `%%nom%%`, `%%categorie%%`, `%%ville%%`, `%%nombre%%`,
  `%%page%%`, `%%site%%`, `%%sep%%`, `%%annee%%`… insérées d'un clic, et un aperçu Google en direct sur un exemple réel.
  Les variables vides sont retirées proprement ; un champ vide reprend le modèle par défaut. Les titles et
  descriptions saisis dans une fiche ou pour une page précise acceptent aussi les variables
  (`src/lib/seoVars.ts`, `src/lib/seoTemplates.ts`).
- **Admin > SEO** : title et meta description de n'importe quelle page (accueil, annuaire, tarifs, univers, catégorie,
  ville…), prioritaires sur le texte généré (première page seulement) ; balises de vérification Google Search Console
  et Bing (coller la balise `<meta>` entière).

### Mesure d'audience (Google Tag Manager)

- **Admin > SEO** : saisir l'ID du conteneur GTM (`GTM-…`) et l'ID de mesure GA4 (`G-…`). Sans ID GTM : aucun outil
  de mesure, aucun bandeau.
- **Consentement (CNIL)** : bandeau « Accepter / Refuser » ; GTM n'est chargé qu'après acceptation (Consent Mode v2 :
  tout est refusé par défaut, `analytics_storage` accordé à l'acceptation). Choix conservé 13 mois (6 mois en cas de
  refus), modifiable via « Gérer les cookies » en pied de page ; un retrait supprime les cookies `_ga`. La politique
  de confidentialité s'adapte automatiquement. L'admin n'est jamais suivi.
- **Plan de taggage** (`EVENTS` dans `src/lib/analytics.ts`, détaillé dans Admin > SEO) : contexte de page
  (`page_type`, `user_status`, et pour une fiche `fiche_id`, `fiche_category`, `fiche_city`, `fiche_plan`…),
  `view_fiche`, `click_phone`, `click_website`, `click_directions`, `click_email`, `click_social`, `share`, `search`,
  `select_plan`, `sign_up`, `login`, `create_fiche`, `claim_fiche`, `report_error`, `begin_checkout`, `purchase`
  (montants HT, une seule fois par paiement). Aucune donnée personnelle des visiteurs.
- **Conteneur GTM prêt à l'emploi** : Admin > SEO > « Télécharger le conteneur GTM », puis dans GTM : Administration >
  Importer un conteneur > Fusionner > Envoyer. Il contient la balise Google GA4 (cookies limités à 13 mois), une balise
  d'événement GA4 par événement et les variables. Dans GA4 : marquer les événements clés et créer les dimensions
  personnalisées (étapes rappelées dans Admin > SEO). Régler la conservation des données GA4 sur 14 mois.
- Clic suivi sur un élément : attribut `data-ev="nom_evenement"` (+ `data-ev-param="valeur"` → paramètre `param`).
- **UTM vers les sites des pros** (`src/lib/utm.ts`) : les liens vers le site d'une fiche et vers son actualité portent
  `utm_source=<domaine de l'annuaire>&utm_medium=referral&utm_campaign=fiche-annuaire`, `utm_content` = `bouton`,
  `coordonnees` ou `actualite`, `utm_term` = adresse de la fiche. Un lien qui a déjà ses propres UTM est laissé tel quel.
  L'adresse affichée, le schema.org et le paramètre `link_url` des événements restent sans UTM.

### Données structurées (schema.org)

Chaque page publie un seul graphe JSON-LD (`src/lib/schema.ts`, assemblé dans `src/layouts/Base.astro`) :

Fiches : région déduite du code postal, téléphone au format international, `sameAs` limité aux réseaux sociaux,
`priceRange` (« À partir de 25 € », champ saisi par le pro, Pro et Premium), `paymentAccepted` et `amenityFeature`
(services cochés), `servesCuisine` et `acceptsReservations` pour les restaurants, bars et commerces de bouche,
`foundingDate`, `areaServed`, `hasCredential` et `knowsLanguage` (année de création, zone d'intervention, labels et
langues parlées, saisis par le pro dans la section Présentation, toutes formules).

| Page | Types |
|---|---|
| Toutes | `Organization` (site parent, avec son éditeur légal en `parentOrganization`) + `WebSite` |
| Fiche | `ItemPage` + type d'établissement précis selon la catégorie (`Bakery`, `Plumber`, `Dentist`, `Restaurant`, `HairSalon`… ; `LocalBusiness` par défaut) : adresse, GPS, horaires, téléphone, carte, SIRET, réseaux sociaux, images et site internet pour les formules payantes |
| Accueil, annuaire, univers, catégories, villes | `CollectionPage` + `ItemList` (univers, catégories ou fiches de la page) |
| Tarifs | `Service` avec les offres (prix HT) + `FAQPage` (même texte que la FAQ affichée) |
| Mentions légales, sources | `AboutPage` |
| Pages avec fil d'Ariane | `BreadcrumbList` |

Correspondance catégorie → type : `TYPES` dans `src/lib/schema.ts`. Test : https://search.google.com/test/rich-results.

### Paiement (Stripe)

- **Sans clés** : mode démo, le bouton « S'abonner » mène à une page de paiement simulé (rien n'est débité).
- **Avec Stripe** (faire d'abord tout le parcours en mode test) :
  1. Stripe > **Développeurs > Clés API** (https://dashboard.stripe.com/test/apikeys) : copier la **clé secrète**
     (`sk_test_…`) dans `STRIPE_SECRET_KEY` du `.env`. Vérifier que `SITE_URL` est l'adresse publique en HTTPS.
  2. `npm run stripe:setup` : crée les produits Pro et Premium, les 4 prix récurrents **TTC** (calculés depuis `PLANS`
     et `SITE.billing.vatRate` de `src/config.ts`), le webhook `SITE_URL/api/stripe/webhook` avec ses 6 événements et
     le portail client (carte, changement de formule avec prorata, résiliation en fin de période), puis écrit
     `STRIPE_PRICE_…`, `STRIPE_WEBHOOK_SECRET` et `STRIPE_PORTAL_CONFIG` dans le `.env`. Relançable sans doublon.
  3. Redémarrer l'application et tester avec la carte `4242 4242 4242 4242`. En local :
     `stripe listen --forward-to localhost:4321/api/stripe/webhook`.
  4. Passage en production : remplacer la clé par la `sk_live_…`, relancer `npm run stripe:setup`, redémarrer.
     Puis Stripe > **Paramètres > Emails clients** : désactiver l'envoi des factures (la facture officielle est celle
     d'Axonaut ; seul réglage non faisable par l'API).
- Le paiement demande l'adresse de facturation et, facultativement, le numéro de TVA du client.
- Activation, changement de formule, résiliation, impayé et fin de formule déclenchent un email au pro et aux admins.

### Facturation (Axonaut)

Stripe encaisse ; **Axonaut émet la facture officielle** (plateforme agréée : numérotation, envoi, facture électronique).

1. Chaque paiement Stripe réussi (`invoice.paid`) est enregistré dans l'annuaire (**Admin > Facturation**), sans doublon.
2. L'annuaire crée dans Axonaut le client (une fois, identifiant interne `annuaire-user-<id>`, raison sociale, adresse,
   SIRET, n° de TVA, contact de facturation), le produit de la formule, la facture (montant HT + TVA, période facturée,
   fiche, référence Stripe) et le règlement par carte : la facture apparaît payée.
3. Le pro retrouve ses factures dans **Mon compte > Factures** et renseigne ses coordonnées dans **Paramètres** ; une
   modification met aussi à jour le client Axonaut.
4. Paiement à 0 € (code promo 100 %) : ignoré. Remboursement Stripe : ligne « Remboursée » et alerte aux admins ;
   l'avoir est à émettre dans Axonaut (l'API ne permet pas de créer d'avoir).

Mise en route : Axonaut > clé à molette > **API**, copier la clé dans `AXONAUT_API_KEY`, redémarrer, puis
**Admin > Facturation > Tester la connexion**. Les paiements reçus avant la clé restent « en attente » : « Envoyer les
N en attente » ou `npm run billing:retry`. En cas d'erreur (Axonaut indisponible, adresse incomplète…), la ligne passe
en « Erreur », les admins sont prévenus et le renvoi se fait au même endroit. TVA et mentions : `SITE.billing` dans
`src/config.ts`.

### Emails

Tous les emails partagent une mise en page HTML aux couleurs de l'annuaire (`src/lib/emailLayout.ts` : une colonne,
600 px, tableaux et styles en ligne, sans image, adaptations Outlook pour Windows : largeur fixe, polices et interlignes
  explicites, encadrés et boutons en tableaux), avec une version texte.
Leurs textes sont réunis dans `src/lib/emails.ts` : un email, un objectif, un bouton principal. Avec `RESEND_API_KEY`,
ils sont envoyés via Resend (domaine de `MAIL_FROM` à valider chez Resend) ; sinon ils sont seulement
conservés. **Admin > Emails** affiche les emails envoyés et, dans l'onglet **Modèles**, un aperçu de chaque email.

**Stratégie par fiche** (destinataire : le propriétaire, sauf mention contraire)

| Moment | Email | Objectif |
|---|---|---|
| Création du compte | Bienvenue | Ajouter son établissement |
| Fiche créée par le pro | Fiche bien reçue | Rassurer (validation sous 24 h), compléter en attendant |
| Fiche validée / refusée | En ligne / À corriger | Activer la formule choisie, ou corriger |
| Revendication acceptée / refusée | La fiche est à vous / Justificatif nécessaire | Premiers pas, activer la formule choisie |
| J+2 après mise en ligne, formule choisie non payée | Il ne reste qu'une étape | Finaliser le paiement |
| J+3 après mise en ligne ou revendication, fiche complète à moins de 80 % | Complète à X % | Compléter (liste de ce qui manque) |
| Formule activée, offerte, changée, résiliée, impayée, terminée | Formule | Compléter la fiche, régulariser ou reprendre |
| J-7 avant la fin d'une formule offerte | Votre formule offerte se termine | Convertir en abonnement |
| Actualité terminée depuis moins de 7 jours | Votre actualité est terminée | Publier la suivante |
| Le 1er du mois | Bilan mensuel (payant : chiffres et évolution ; gratuit : vues et appels manqués) | Montrer la valeur, faire passer en Pro |
| Demande de devis (Premium) | Accusé au client, demande au pro (réponse directe au client), confirmation au client | Mettre en relation vite |

Relances (`src/lib/lifecycle.ts`, tâche quotidienne `npm run -s emails:relances`, `-- --apercu` pour voir sans
envoyer) : chacune n'est envoyée qu'une fois par fiche (table `email_log`), et au plus un conseil par compte et par
jour. Les conseils (fiche à compléter, formule non finalisée, actualité terminée) et le bilan mensuel se désactivent
dans **Mon compte > Paramètres > Emails** ; les emails de compte, de paiement et de demandes de devis partent toujours.

Mise en route de Resend :
1. Compte sur https://resend.com, puis **Domains > Add Domain** : le domaine de l'adresse d'expédition.
2. Ajouter dans la zone DNS du domaine les enregistrements affichés par Resend, puis **Verify**.
3. **API Keys > Create API Key** : copier la clé (`re_…`) dans `RESEND_API_KEY`, garder `MAIL_FROM` sur une adresse
   du domaine validé, redémarrer.
4. Test : « Mot de passe oublié » avec son adresse.

### Données

- `npm run db:import` interroge l'API Overpass (OpenStreetMap, licence **ODbL**, avec plusieurs serveurs de secours),
  classe chaque établissement dans les 238 catégories, lit les horaires OSM, les réseaux sociaux et les services
  (PMR, terrasse, CB…), et rattache chaque fiche à sa **commune officielle** (Base Adresse Nationale, puis
  geo.api.gouv.fr). Relancer la commande met à jour les fiches non revendiquées ; une fiche revendiquée n'est plus écrasée.
- Rayon et centre de l'import : `scripts/import-osm.ts` (`CENTER`, `RADIUS_M`).
- Le formulaire de fiche vérifie que la ville est une commune réelle et en retient le nom officiel.
- Attribution des sources : page `/sources-et-donnees` et lien « © OpenStreetMap » sur chaque fiche importée.

## Où modifier quoi

| Fichier | Rôle |
|---|---|
| `src/config.ts` | Ville couverte (`CITY` : nom, zone, département, centre et rayon de l'import), nom, textes, formules (`PLANS`), facturation (`billing`), mentions légales (`legal`), pagination |
| `src/lib/pageContent.ts`, `src/lib/insights.ts`, `src/components/SeoContent.astro` | Contenus des pages catégories, univers et villes (repères, listes, conseils, FAQ) |
| `src/data/categoryTips.ts`, `categoryExtras.ts`, `categoryGuides.ts`, `universeTips.ts`, `universeGuides.ts` | Textes de conseils (métiers, univers, repères locaux) |
| `src/lib/newsFeed.ts` | Actualités de l'accueil (sources, filtre, cache) |
| `src/data/universes.ts` | 30 univers et 238 catégories |
| `src/lib/db.ts` | Schéma SQLite et migrations (appliquées automatiquement) |
| `src/lib/fiches.ts` | Requêtes, recherche, classement, indexation, sélections du jour, nouveaux inscrits |
| `src/lib/ficheForm.ts` | Validation du formulaire de fiche (règles par formule, SEO, ville officielle) |
| `src/lib/seo.ts` | Title et meta description générés des fiches |
| `src/lib/settings.ts`, `src/pages/admin/seo/` | Réglages SEO (GTM, vérifications, titles par page) |
| `src/lib/analytics.ts` | Plan de taggage et conteneur GTM |
| `src/lib/leads.ts` | Demandes de contact (leads) : formulaire, validation, transmission, statistiques |
| `src/lib/schema.ts` | Données structurées schema.org |
| `src/lib/hours.ts` | Horaires : format OSM, « ouvert maintenant », schema.org |
| `src/lib/stripe.ts` | Abonnement, webhook, notifications, mode démo |
| `src/lib/billing.ts`, `src/lib/axonaut.ts` | Facturation Stripe → Axonaut |
| `src/lib/intent.ts` | Formule choisie sur la page Tarifs, conservée jusqu'au paiement |
| `src/components/FicheForm.astro` | Formulaire de fiche (autocomplétion d'adresse, horaires, SEO avec aperçu Google) |
| `src/layouts/Base.astro`, `src/styles/global.css` | Gabarit du site (en-tête, pied de page, meta, largeur `--wrap`) |
| `src/layouts/Admin.astro`, `src/pages/admin/*` | Back-office |
| `src/pages/[slug].astro` | Fiche publique |
| `src/pages/mentions-legales.astro`, `cgu.astro`, `confidentialite.astro`, `sources-et-donnees.astro` | Pages légales |
| `passenger/app.js` | Démarrage sous Passenger (N0C) |
| `astro.config.mjs` | Adaptateur Node, protection CSRF (domaine autorisé déduit de `SITE_URL`) |

## Sécurité

**Anti-aspiration des coordonnées** : le téléphone et l'email des fiches Pro et Premium ne figurent pas dans le code
des pages (numéro partiellement masqué, « 02 31 •• •• •• », y compris dans les listes). Ils sont demandés au serveur au
clic (`src/pages/api/contact.ts`) : requête venant du site uniquement, robots et navigateurs automatisés refusés,
30 affichages par heure et par visiteur au plus ; les refus sont comptés par jour et par IP hachée (tableau de bord
admin, « Anti-aspiration »). L'email n'est jamais publié dans les données structurées ; le téléphone l'est (signal de
recherche locale), sauf si la case correspondante est cochée dans **Admin > SEO > Protection des coordonnées**.

Mots de passe hachés avec scrypt, sessions en base (cookie `httpOnly`, `SameSite=Lax`), protection CSRF par contrôle
d'origine (Astro `security.checkOrigin`, domaine autorisé déduit de `SITE_URL` pour le proxy HTTPS de l'hébergeur),
limitation de débit sur la connexion, l'inscription et les formulaires publics, champ piège anti-robots, vérification
du type réel des images envoyées, signature des webhooks Stripe vérifiée, espaces `/compte` et `/admin` en `noindex`
et `no-store`. Retour après connexion limité aux pages du site (`safeNext`). En-têtes : Content-Security-Policy
(`frame-ancestors`, `base-uri`, `object-src`), Strict-Transport-Security, Permissions-Policy, Cross-Origin-Opener-Policy,
X-Frame-Options, X-Content-Type-Options, Referrer-Policy (`src/middleware.ts`). Les vues des robots ne sont pas comptées.

Les scanners de vulnérabilités peuvent signaler de vieilles CVE **Ruby on Rails** : faux positif dû à l'en-tête
`X-Powered-By: Phusion Passenger` ajouté par l'hébergeur ; le retirer avec le bloc `.htaccess` décrit dans la partie
N0C ci-dessus.

**Aucun secret n'est versionné** : `.env`, `data/` (base, images, sauvegardes) sont exclus par `.gitignore`. Ne
jamais committer de clé API ni de jeton GitHub.

## À compléter avant le lancement

- `.env` de production : clés Stripe (4 prix TTC + webhook), `AXONAUT_API_KEY`, `RESEND_API_KEY` / `MAIL_FROM`.
- Tâches cron de sauvegarde et de facturation (voir plus haut).
- Moyen de contact de l'éditeur sur les mentions légales (obligatoire, LCEN) et contact RGPD.
- Conditions générales d'utilisation (`/cgu`) : modèle à faire relire.
- Cartes Google Maps : envisager un chargement au clic pour se passer de consentement aux cookies tiers.
- Profils sociaux du site parent à ajouter au balisage `Organization` (`sameAs` dans `src/lib/schema.ts`).
