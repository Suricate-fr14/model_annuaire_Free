// Petites fonctions de texte partagées (serveur, scripts et navigateur).

export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const slugify = (s: string) =>
  normalize(s).replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'fiche';

/** Nettoie une saisie de ville : retire CEDEX, codes postaux et chiffres ; '' si ce n'est pas un nom de commune. */
export function cleanCity(raw: string) {
  const s = raw
    .replace(/\bcedex\b.*$/i, '')
    .replace(/\b\d{5}\b/g, '')
    .replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .trim();
  return /\p{L}{2,}/u.test(s) ? s : '';
}

/** Téléphone français : affichage "02 31 12 34 56" et lien tel:+33231123456. */
export function phoneDisplay(raw: string) {
  const d = raw.replace(/[^\d+]/g, '');
  const national = d.startsWith('+33') ? `0${d.slice(3)}` : d.startsWith('0033') ? `0${d.slice(4)}` : d;
  return /^0\d{9}$/.test(national) ? national.replace(/(\d{2})(?=\d)/g, '$1 ').trim() : raw.trim();
}
/** Téléphone partiellement masqué (« 02 31 •• •• •• ») : affiché tant que le visiteur n'a pas cliqué (anti-aspiration). */
export function phoneMasked(raw: string) {
  const shown = phoneDisplay(raw);
  let digits = 0;
  return shown.replace(/\d/g, (c) => (++digits <= 4 ? c : '•'));
}
/** Téléphone au format international (« +33 2 31 00 00 01 ») pour les données structurées ; numéros d'outre-mer laissés tels quels. */
export function phoneIntl(raw: string) {
  const d = raw.replace(/[^\d+]/g, '');
  const national = d.startsWith('+33') ? `0${d.slice(3)}` : d.startsWith('0033') ? `0${d.slice(4)}` : d;
  if (!/^0\d{9}$/.test(national) || /^0(26|59|63|69)/.test(national)) return raw.trim();
  return `+33 ${national.slice(1, 2)} ${national.slice(2).replace(/(\d{2})(?=\d)/g, '$1 ')}`;
}

/** Région administrative d'après le code postal (France métropolitaine et départements d'outre-mer). */
const REGIONS: [string, string][] = [
  ['Auvergne-Rhône-Alpes', '01 03 07 15 26 38 42 43 63 69 73 74'],
  ['Bourgogne-Franche-Comté', '21 25 39 58 70 71 89 90'],
  ['Bretagne', '22 29 35 56'],
  ['Centre-Val de Loire', '18 28 36 37 41 45'],
  ['Corse', '20'],
  ['Grand Est', '08 10 51 52 54 55 57 67 68 88'],
  ['Hauts-de-France', '02 59 60 62 80'],
  ['Île-de-France', '75 77 78 91 92 93 94 95'],
  ['Normandie', '14 27 50 61 76'],
  ['Nouvelle-Aquitaine', '16 17 19 23 24 33 40 47 64 79 86 87'],
  ['Occitanie', '09 11 12 30 31 32 34 46 48 65 66 81 82'],
  ['Pays de la Loire', '44 49 53 72 85'],
  ["Provence-Alpes-Côte d'Azur", '04 05 06 13 83 84'],
  ['Guadeloupe', '971'], ['Martinique', '972'], ['Guyane', '973'], ['La Réunion', '974'], ['Mayotte', '976'],
];
export function regionOfPostcode(postcode: string) {
  if (!/^\d{5}$/.test(postcode)) return '';
  const dept = postcode.startsWith('97') ? postcode.slice(0, 3) : postcode.slice(0, 2);
  return REGIONS.find(([, depts]) => depts.split(' ').includes(dept))?.[0] ?? '';
}

export function phoneHref(raw: string) {
  const d = raw.replace(/[^\d+]/g, '');
  if (/^0\d{9}$/.test(d)) return `tel:+33${d.slice(1)}`;
  return `tel:${d}`;
}
export const phoneValid = (raw: string) => {
  const d = raw.replace(/[\s.()-]/g, '');
  return /^(?:\+33|0033|0)[1-9]\d{8}$/.test(d) || /^\+\d{8,15}$/.test(d);
};

export const emailValid = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

export function urlValid(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export const host = (url?: string) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
};

/** Distance en km (formule de haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('fr-FR')} ${n > 1 ? many : one}`;
