// Base SQLite (module natif node:sqlite, aucune dépendance). Fichier autonome : importé aussi par les scripts.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const readEnv = (k: string) =>
  (typeof process !== 'undefined' ? process.env[k] : undefined) || (import.meta as any).env?.[k];

export const DB_PATH = resolve(readEnv('DATABASE_PATH') || './data/annuaire.db');
export const UPLOADS_DIR = resolve(readEnv('UPLOADS_DIR') || './data/uploads');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fiches (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'organization' CHECK (kind IN ('organization','person')),
  category TEXT NOT NULL,
  short_desc TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  street TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  city_slug TEXT NOT NULL DEFAULT '',
  lat REAL,
  lng REAL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  siret TEXT NOT NULL DEFAULT '',
  hours TEXT,
  hours_note TEXT NOT NULL DEFAULT '',
  socials TEXT NOT NULL DEFAULT '{}',
  features TEXT NOT NULL DEFAULT '[]',
  logo TEXT NOT NULL DEFAULT '',
  photos TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','rejected','unpublished')),
  reject_reason TEXT NOT NULL DEFAULT '',
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'user',
  source_ref TEXT NOT NULL DEFAULT '',
  pro_status TEXT NOT NULL DEFAULT 'none' CHECK (pro_status IN ('none','active','past_due','canceled')),
  pro_until TEXT,
  stripe_customer TEXT NOT NULL DEFAULT '',
  stripe_subscription TEXT NOT NULL DEFAULT '',
  search TEXT NOT NULL DEFAULT '',
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS fiches_status ON fiches(status);
CREATE INDEX IF NOT EXISTS fiches_category ON fiches(category, status);
CREATE INDEX IF NOT EXISTS fiches_city ON fiches(city_slug, status);
CREATE INDEX IF NOT EXISTS fiches_owner ON fiches(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS fiches_source_ref ON fiches(source, source_ref) WHERE source_ref <> '';

CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY,
  fiche_id INTEGER NOT NULL REFERENCES fiches(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY,
  fiche_id INTEGER NOT NULL REFERENCES fiches(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'stored',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Une ligne par paiement Stripe réussi ; la facture officielle correspondante est créée dans Axonaut.
CREATE TABLE IF NOT EXISTS billing_invoices (
  id INTEGER PRIMARY KEY,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_customer TEXT NOT NULL DEFAULT '',
  stripe_subscription TEXT NOT NULL DEFAULT '',
  stripe_charge TEXT NOT NULL DEFAULT '',
  fiche_id INTEGER REFERENCES fiches(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  plan TEXT NOT NULL DEFAULT '',
  interval TEXT NOT NULL DEFAULT '',
  amount_ttc_cents INTEGER NOT NULL,
  vat_rate REAL NOT NULL,
  period_start TEXT,
  period_end TEXT,
  paid_at TEXT NOT NULL,
  customer_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','error','skipped','refunded')),
  error TEXT NOT NULL DEFAULT '',
  attempts INTEGER NOT NULL DEFAULT 0,
  axonaut_invoice_id INTEGER,
  axonaut_number TEXT NOT NULL DEFAULT '',
  axonaut_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS billing_status ON billing_invoices(status);
CREATE INDEX IF NOT EXISTS billing_user ON billing_invoices(user_id);

-- Demandes de contact (leads) envoyées depuis les fiches Premium : vérifiées par l'admin avant transmission au pro
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY,
  fiche_id INTEGER NOT NULL REFERENCES fiches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL DEFAULT '',
  request_type TEXT NOT NULL DEFAULT '',
  timing TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  -- pending : à vérifier · sent : transmise au propriétaire · rejected : refusée (spam, incomplète…)
  status TEXT NOT NULL DEFAULT 'pending',
  reject_reason TEXT NOT NULL DEFAULT '',
  sent_to TEXT NOT NULL DEFAULT '',
  decided_by INTEGER,
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS leads_status ON leads(status, created_at);
CREATE INDEX IF NOT EXISTS leads_fiche ON leads(fiche_id, status);

-- Statistiques mensuelles par fiche (bilan mensuel envoyé aux pros) : mois au format AAAA-MM
CREATE TABLE IF NOT EXISTS fiche_stats (
  fiche_id INTEGER NOT NULL REFERENCES fiches(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  clicks_phone INTEGER NOT NULL DEFAULT 0,
  clicks_web INTEGER NOT NULL DEFAULT 0,
  clicks_route INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (fiche_id, month)
);

-- Bilans mensuels envoyés (évite un double envoi si la tâche est relancée)
CREATE TABLE IF NOT EXISTS monthly_reports (
  user_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, month)
);

-- Mises en avant sponsorisées : une fiche affichée en tête d'une catégorie (toutes villes ou une ville), sur une période
CREATE TABLE IF NOT EXISTS sponsorships (
  id INTEGER PRIMARY KEY,
  fiche_id INTEGER NOT NULL REFERENCES fiches(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  city_slug TEXT NOT NULL DEFAULT '',
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  price_ht REAL NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS sponsorships_cat ON sponsorships(category, starts_on, ends_on);

-- Réglages modifiables dans l'admin (GTM, vérification des moteurs…)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Title et meta description personnalisés par page (chemin exact, ex. /tarifs)
CREATE TABLE IF NOT EXISTS seo_pages (
  path TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Avis Google d'une fiche (récupérés via DataForSEO, lib/googleReviews.ts). query = CID, place_id, lien Google Maps
-- ou nom saisi dans l'admin ; reviews = JSON des avis affichés ; status = '' | pending | ok | message d'erreur.
CREATE TABLE IF NOT EXISTS google_reviews (
  fiche_id INTEGER PRIMARY KEY REFERENCES fiches(id) ON DELETE CASCADE,
  query TEXT NOT NULL DEFAULT '',
  place_id TEXT NOT NULL DEFAULT '',
  cid TEXT NOT NULL DEFAULT '',
  rating REAL,
  count INTEGER NOT NULL DEFAULT 0,
  reviews TEXT NOT NULL DEFAULT '[]',
  task_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  fetched_at TEXT
);

-- Relances envoyées (lib/lifecycle.ts) : une seule fois par fiche, type et référence (ex. date de fin d'une formule).
CREATE TABLE IF NOT EXISTS email_log (
  fiche_id INTEGER NOT NULL REFERENCES fiches(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  ref TEXT NOT NULL DEFAULT '',
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (fiche_id, kind, ref)
);

-- Affichages de coordonnées refusés (trop de demandes : aspiration probable). IP hachée, jamais en clair.
CREATE TABLE IF NOT EXISTS contact_blocks (
  ip_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  last_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (ip_hash, day)
);

CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// Colonnes ajoutées après la première version : créées si absentes (bases existantes).
const ADDED_COLUMNS: [table: string, column: string, def: string][] = [
  ['fiches', 'plan', "TEXT NOT NULL DEFAULT ''"],
  ['fiches', 'clicks_phone', 'INTEGER NOT NULL DEFAULT 0'],
  ['fiches', 'clicks_web', 'INTEGER NOT NULL DEFAULT 0'],
  ['fiches', 'clicks_route', 'INTEGER NOT NULL DEFAULT 0'],
  ['fiches', 'pro_interval', "TEXT NOT NULL DEFAULT ''"],
  ['fiches', 'wanted_plan', "TEXT NOT NULL DEFAULT ''"],
  ['fiches', 'wanted_interval', "TEXT NOT NULL DEFAULT ''"],
  ['claims', 'wanted_plan', "TEXT NOT NULL DEFAULT ''"],
  ['claims', 'wanted_interval', "TEXT NOT NULL DEFAULT ''"],
  // SEO de la fiche (title / meta description personnalisés) et indexation : auto (selon la formule), index, noindex
  ['fiches', 'seo_title', "TEXT NOT NULL DEFAULT ''"],
  ['fiches', 'seo_description', "TEXT NOT NULL DEFAULT ''"],
  ['fiches', 'index_mode', "TEXT NOT NULL DEFAULT 'auto'"],
  // Coordonnées de facturation du professionnel et identifiant client Axonaut
  ['users', 'billing_name', "TEXT NOT NULL DEFAULT ''"],
  ['users', 'billing_street', "TEXT NOT NULL DEFAULT ''"],
  ['users', 'billing_zip', "TEXT NOT NULL DEFAULT ''"],
  ['users', 'billing_city', "TEXT NOT NULL DEFAULT ''"],
  ['users', 'billing_country', "TEXT NOT NULL DEFAULT 'France'"],
  ['users', 'billing_siret', "TEXT NOT NULL DEFAULT ''"],
  ['users', 'billing_vat', "TEXT NOT NULL DEFAULT ''"],
  ['users', 'axonaut_company_id', 'INTEGER'],
  // Premium : vidéos YouTube (identifiants, 4 max) et formulaire de demande de contact (« J'achète des leads »)
  ['fiches', 'videos', "TEXT NOT NULL DEFAULT '[]'"],
  ['fiches', 'leads_enabled', 'INTEGER NOT NULL DEFAULT 0'],
  // Références clients (logos et noms, 5 au plus), affichées avec Pro et Premium : [{ logo, name }]
  ['fiches', 'refs', "TEXT NOT NULL DEFAULT '[]'"],
  // Bannière (image de couverture) affichée en haut de la fiche avec Pro et Premium
  ['fiches', 'banner', "TEXT NOT NULL DEFAULT ''"],
  // Actualité ou offre du moment (Pro et Premium), masquée après la date de fin
  ['fiches', 'news_title', "TEXT NOT NULL DEFAULT ''"],
  ['fiches', 'news_text', "TEXT NOT NULL DEFAULT ''"],
  ['fiches', 'news_link', "TEXT NOT NULL DEFAULT ''"],
  ['fiches', 'news_until', "TEXT NOT NULL DEFAULT ''"],
  // Fiches gratuites : clics sur « Afficher le téléphone » (numéro masqué), argument de passage en Pro
  ['fiches', 'clicks_phone_locked', 'INTEGER NOT NULL DEFAULT 0'],
  ['fiche_stats', 'phone_locked', 'INTEGER NOT NULL DEFAULT 0'],
  // Bilan mensuel par email : 0 = le pro s'est désabonné
  ['users', 'monthly_report', 'INTEGER NOT NULL DEFAULT 1'],
  // Version HTML des emails (Admin > Emails) ; conseils et rappels par email (désactivables dans les paramètres)
  ['outbox', 'html', "TEXT NOT NULL DEFAULT ''"],
  ['users', 'tips_emails', 'INTEGER NOT NULL DEFAULT 1'],
  // Formule payée et formule offerte par l'admin (voir lib/formula.ts) ; pro_status / plan / pro_until = formule effective
  ['fiches', 'paid_status', "TEXT NOT NULL DEFAULT 'none'"],
  ['fiches', 'paid_plan', "TEXT NOT NULL DEFAULT ''"],
  ['fiches', 'paid_until', 'TEXT'],
  ['fiches', 'gift_plan', "TEXT NOT NULL DEFAULT ''"],
  ['fiches', 'gift_until', 'TEXT'],
  // Prix « à partir de » en euros (Pro et Premium), ex. « 25 » ou « 12,50 »
  ['fiches', 'price_from', "TEXT NOT NULL DEFAULT ''"],
  // Année de création, zone d'intervention, labels (séparés par des virgules), langues parlées (codes, JSON)
  ['fiches', 'founded', "TEXT NOT NULL DEFAULT ''"],
  ['fiches', 'area_served', "TEXT NOT NULL DEFAULT ''"],
  ['fiches', 'credentials', "TEXT NOT NULL DEFAULT ''"],
  ['fiches', 'languages', "TEXT NOT NULL DEFAULT '[]'"],
];

function migrate(d: DatabaseSync) {
  const added = new Set<string>();
  for (const [table, column, def] of ADDED_COLUMNS) {
    const cols = d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) { d.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`); added.add(`${table}.${column}`); }
  }
  if (added.has('fiches.paid_status')) {
    // Reprise : abonnements Stripe ou démo = formule payée ; formules données à la main = formule offerte, conservée
    // (sans limite si sa date est déjà passée, comme avant : ces formules n'expiraient pas).
    d.exec(`UPDATE fiches SET paid_status = pro_status, paid_plan = plan, paid_until = pro_until
      WHERE pro_status <> 'none' AND (stripe_subscription <> '' OR stripe_customer <> '')`);
    d.exec(`UPDATE fiches SET gift_plan = CASE WHEN plan = 'premium' THEN 'premium' ELSE 'pro' END,
      gift_until = CASE WHEN pro_until > strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN pro_until ELSE NULL END
      WHERE pro_status IN ('active', 'past_due') AND stripe_subscription = '' AND stripe_customer = ''`);
  }
  // Abonnements antérieurs aux formules : rattachés à l'offre Pro.
  d.exec("UPDATE fiches SET plan = 'pro' WHERE plan = '' AND pro_status <> 'none'");
}

let instance: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (instance) return instance;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  mkdirSync(UPLOADS_DIR, { recursive: true });
  const d = new DatabaseSync(DB_PATH);
  d.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  d.exec(SCHEMA);
  migrate(d);
  instance = d;
  return d;
}

type Param = string | number | bigint | null | Uint8Array;

export const all = <T = any>(sql: string, ...params: Param[]) => db().prepare(sql).all(...params) as T[];
export const get = <T = any>(sql: string, ...params: Param[]) => db().prepare(sql).get(...params) as T | undefined;
export const run = (sql: string, ...params: Param[]) => db().prepare(sql).run(...params);

export function tx<T>(fn: () => T): T {
  const d = db();
  d.exec('BEGIN');
  try {
    const out = fn();
    d.exec('COMMIT');
    return out;
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}

export const audit = (userId: number | null, action: string, target = '') =>
  run('INSERT INTO audit (user_id, action, target) VALUES (?, ?, ?)', userId, action, target);
