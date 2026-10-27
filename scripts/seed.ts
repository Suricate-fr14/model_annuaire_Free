// Crée le compte administrateur (ADMIN_EMAIL / ADMIN_PASSWORD du .env) et des données de démonstration.
// Usage : npm run db:seed        (sans effet sur les comptes déjà existants)
import { db, get, run } from '../src/lib/db.ts';
import { hashPassword } from '../src/lib/crypto.ts';
import { createFiche, setStatus } from '../src/lib/fiches.ts';
import { CITY } from '../src/config.ts';

// Fiches de démonstration placées autour du centre de la ville (CITY dans src/config.ts).
const near = (dLat: number, dLng: number) => ({ lat: CITY.center.lat + dLat, lng: CITY.center.lng + dLng });

db();
const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || '';
if (!adminEmail || adminPassword.length < 10) {
  console.error('Définissez ADMIN_EMAIL et ADMIN_PASSWORD (10 caractères min.) dans .env');
  process.exit(1);
}

function ensureUser(email: string, password: string, name: string, role: 'user' | 'admin') {
  const found = get<{ id: number }>('SELECT id FROM users WHERE email = ?', email);
  if (found) return { id: found.id, created: false };
  const r = run('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', email, hashPassword(password), name, role);
  return { id: Number(r.lastInsertRowid), created: true };
}

const admin = ensureUser(adminEmail, adminPassword, 'Administrateur', 'admin');
console.log(admin.created ? `Admin créé : ${adminEmail}` : `Admin déjà présent : ${adminEmail}`);

// --- Démo : un professionnel abonné Pro, un autre en attente de validation ---
const demoPassword = process.env.DEMO_PASSWORD || adminPassword;
const pro = ensureUser('pro@example.test', demoPassword, 'Camille Durand', 'user');
const newbie = ensureUser('nouveau@example.test', demoPassword, 'Lucas Martin', 'user');

if (!get("SELECT 1 FROM fiches WHERE slug = 'atelier-camille-durand'")) {
  const { id } = createFiche({
    name: 'Atelier Camille Durand', kind: 'person', category: 'photographes',
    short_desc: `Photographe portrait, mariage et entreprise à ${CITY.name} · studio et extérieur`,
    description: "Photographe professionnelle installée en centre-ville depuis 2014.\n\nPortraits, mariages, photos corporate et packshots produits pour les commerçants. Studio de 60 m² sur rendez-vous, déplacements dans tout le département.",
    street: '12 Rue de la République', postcode: '', city: CITY.name, ...near(0.003, 0.01),
    phone: '02 31 00 00 01', email: 'contact@example.test', website: 'https://www.example.com', siret: '',
    hours: { mo: [], tu: [['09:30', '12:30'], ['14:00', '19:00']], we: [['09:30', '12:30'], ['14:00', '19:00']], th: [['09:30', '12:30'], ['14:00', '19:00']], fr: [['09:30', '19:00']], sa: [['10:00', '17:00']], su: [] },
    hours_note: 'Séances photo en soirée et le dimanche sur rendez-vous.',
    socials: { instagram: 'https://www.instagram.com/example', facebook: 'https://www.facebook.com/example', linkedin: 'https://www.linkedin.com/company/example' },
    features: ['rdv', 'devis', 'accessible', 'cb', 'domicile'], logo: '', photos: [],
  }, { ownerId: pro.id, status: 'published' });
  setStatus(id, 'published');
  const until = new Date(Date.now() + 30 * 864e5).toISOString();
  run("UPDATE fiches SET pro_status = 'active', pro_until = ?, plan = 'premium', paid_status = 'active', paid_until = ?, paid_plan = 'premium', pro_interval = 'month', stripe_customer = 'demo' WHERE id = ?", until, until, id);
  console.log('Fiche Pro de démonstration créée : /atelier-camille-durand');
}

if (!get("SELECT 1 FROM fiches WHERE slug LIKE 'plomberie-martin%'")) {
  createFiche({
    name: 'Plomberie Martin', kind: 'organization', category: 'plombiers',
    short_desc: `Dépannage plomberie et chauffage 7j/7 à ${CITY.area}`,
    description: 'Fuite, débouchage, chauffe-eau, rénovation de salle de bain. Devis gratuit, intervention rapide.',
    street: '5 Rue de la Gare', postcode: '', city: CITY.name, ...near(0.007, -0.004),
    phone: '06 00 00 00 02', email: '', website: '', siret: '',
    hours: { mo: [['08:00', '19:00']], tu: [['08:00', '19:00']], we: [['08:00', '19:00']], th: [['08:00', '19:00']], fr: [['08:00', '19:00']], sa: [['09:00', '12:00']], su: [] },
    hours_note: '', socials: {}, features: ['devis', 'domicile'], logo: '', photos: [],
  }, { ownerId: newbie.id, status: 'pending' });
  console.log('Fiche en attente de validation créée (Admin > Fiches).');
}

// Une revendication et un signalement sur des fiches importées, pour remplir les files de modération.
const osm = get<{ id: number; name: string }>("SELECT id, name FROM fiches WHERE source = 'osm' AND owner_id IS NULL AND category = 'boulangeries' ORDER BY id LIMIT 1");
if (osm && !get('SELECT 1 FROM claims WHERE user_id = ?', newbie.id)) {
  run('INSERT INTO claims (fiche_id, user_id, role, phone, message) VALUES (?, ?, ?, ?, ?)', osm.id, newbie.id, 'Gérant', '06 00 00 00 03', 'Bonjour, je suis le nouveau gérant depuis septembre.');
  console.log(`Revendication de démonstration sur « ${osm.name} ».`);
}
const osm2 = get<{ id: number }>("SELECT id FROM fiches WHERE source = 'osm' AND category = 'restaurants' ORDER BY id LIMIT 1");
if (osm2 && !get('SELECT 1 FROM reports')) {
  run('INSERT INTO reports (fiche_id, reason, message) VALUES (?, ?, ?)', osm2.id, 'horaires', 'Le restaurant est désormais fermé le lundi midi.');
}
console.log('Seed terminé. Comptes de démo : pro@example.test et nouveau@example.test (mot de passe : DEMO_PASSWORD, ou ADMIN_PASSWORD à défaut).');
