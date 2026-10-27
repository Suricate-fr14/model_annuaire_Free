// Services et équipements affichés sur les fiches (cases à cocher dans le formulaire).
export const FEATURES = [
  { key: 'accessible', label: 'Accessible PMR' },
  { key: 'rdv', label: 'Sur rendez-vous' },
  { key: 'reservation', label: 'Réservation possible' },
  { key: 'emporter', label: 'Vente à emporter' },
  { key: 'livraison', label: 'Livraison' },
  { key: 'click-collect', label: 'Click & collect' },
  { key: 'domicile', label: 'Intervention à domicile' },
  { key: 'devis', label: 'Devis gratuit' },
  { key: 'terrasse', label: 'Terrasse' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'parking', label: 'Parking' },
  { key: 'clim', label: 'Climatisé' },
  { key: 'vegetarien', label: 'Options végétariennes' },
  { key: 'vegan', label: 'Options vegan' },
  { key: 'cb', label: 'Carte bancaire' },
  { key: 'sans-contact', label: 'Paiement sans contact' },
  { key: 'cheques', label: 'Chèques' },
  { key: 'animaux', label: 'Animaux acceptés' },
] as const;

// Langues parlées en plus du français (code BCP 47 publié dans schema.org knowsLanguage).
export const LANGUAGES = [
  { key: 'en', label: 'Anglais' },
  { key: 'es', label: 'Espagnol' },
  { key: 'de', label: 'Allemand' },
  { key: 'it', label: 'Italien' },
  { key: 'nl', label: 'Néerlandais' },
  { key: 'pt', label: 'Portugais' },
  { key: 'ar', label: 'Arabe' },
  { key: 'zh', label: 'Chinois' },
  { key: 'ru', label: 'Russe' },
  { key: 'fsl', label: 'Langue des signes (LSF)' },
] as const;

export const languageLabel = (key: string) => LANGUAGES.find((l) => l.key === key)?.label ?? key;
export const languageKeys = new Set<string>(LANGUAGES.map((l) => l.key));

/** Labels et certifications saisis séparés par des virgules ou des retours à la ligne. */
export const credentialList = (s: string) => (s ?? '').split(/[,\n;]/).map((c) => c.trim()).filter(Boolean);

export const featureLabel = (key: string) => FEATURES.find((f) => f.key === key)?.label ?? key;
export const featureKeys = new Set<string>(FEATURES.map((f) => f.key));
