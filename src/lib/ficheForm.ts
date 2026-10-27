// Lecture et validation du formulaire de fiche (création, édition par le propriétaire ou l'admin).
import type { Fiche, FicheInput } from './fiches.ts';
import { hoursFromForm } from './hours.ts';
import { socialsFromForm } from './social.ts';
import { featureKeys, languageKeys, credentialList } from './features.ts';
import { categoryExists } from './taxonomy.ts';
import { emailValid, phoneValid, urlValid, cleanCity, normalize } from './text.ts';
import { saveImage, removeImage } from './uploads.ts';
import { geocode, findMunicipality, cityAt } from './geo.ts';
import { youtubeId, MAX_VIDEOS } from './video.ts';
import { ficheVars } from './seo.ts';
import { fillCustom } from './seoTemplates.ts';

const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? '').trim().slice(0, max);

import { PLANS } from '../config.ts';
import type { Fiche as F } from './fiches.ts';

/** Nombre de photos autorisé selon la formule en cours. */
export const photoLimit = (f: Pick<F, 'certified' | 'premium'> | null | undefined) =>
  !f?.certified ? 0 : f.premium ? PLANS.premium.photos : PLANS.pro.photos;

export const SEO_TITLE_MAX = 65;
export const SEO_DESC_MAX = 160;

export interface ParseOptions {
  /** Le site internet et la galerie photo sont réservés aux abonnés. */
  pro: boolean;
  /** Vidéos et formulaire de demande de contact : réservés à Premium. */
  premium?: boolean;
  maxPhotos?: number;
  current?: Fiche | null;
}

export async function parseFicheForm(form: FormData, opts: ParseOptions): Promise<{ data: FicheInput; errors: string[] }> {
  const errors: string[] = [];
  const cur = opts.current;

  const name = str(form, 'name', 120);
  if (name.length < 2) errors.push("Indiquez le nom de l'établissement.");
  const kind = form.get('kind') === 'person' ? 'person' : 'organization';
  const category = str(form, 'category', 80);
  if (!categoryExists(category)) errors.push('Choisissez une catégorie.');

  const short_desc = str(form, 'short_desc', 200);
  if (short_desc.length < 10) errors.push('La description courte doit faire au moins 10 caractères.');
  // Présentation détaillée : réservée aux formules payantes (hors abonnement, le texte existant est conservé, masqué).
  const description = opts.pro ? str(form, 'description', 4000) : (cur?.description ?? '');

  // SEO : title et meta description personnalisés (vides = générés automatiquement).
  // Les variables (%%nom%%, %%ville%%…) sont acceptées : la longueur est contrôlée sur le texte final.
  const seo_title = str(form, 'seo_title', 200);
  const seo_description = str(form, 'seo_description', 400);

  let street = str(form, 'street', 160);
  let postcode = str(form, 'postcode', 10);
  const rawCity = str(form, 'city', 80);
  let city = cleanCity(rawCity);
  let lat = Number(form.get('lat')) || null;
  let lng = Number(form.get('lng')) || null;
  if (postcode && !/^\d{5}$/.test(postcode)) errors.push('Le code postal doit contenir 5 chiffres.');
  // La ville doit être une commune réelle : on retient son nom officiel (Base Adresse Nationale).
  if (!rawCity) errors.push('Indiquez la ville.');
  else if (!city) errors.push(`« ${rawCity} » n'est pas un nom de ville (un code postal va dans le champ « Code postal »).`);
  else if (cur && normalize(cur.city) === normalize(city)) {
    city = cur.city; // ville inchangée : déjà vérifiée
    postcode ||= cur.postcode;
  } else {
    const m = await findMunicipality(city, postcode);
    if (m) {
      city = m.city;
      postcode ||= m.postcode;
    } else if (lat != null && lng != null) {
      const at = await cityAt(lat, lng);
      if (at) { city = at.city; postcode ||= at.postcode; }
    } else if (m === null) {
      errors.push(`Ville « ${city} » introuvable : vérifiez l'orthographe ou choisissez l'adresse dans la liste proposée.`);
    }
    // m === undefined : service d'adresses injoignable, la ville saisie (nettoyée) est conservée.
  }
  // Coordonnées absentes (saisie manuelle sans autocomplétion) : géocodage côté serveur.
  if ((lat == null || lng == null) && city) {
    const g = await geocode([street, postcode, city].filter(Boolean).join(' '));
    if (g) {
      lat = g.lat; lng = g.lng;
      postcode ||= g.postcode;
    }
  }
  if (lat != null && (lat < 41 || lat > 52 || lng == null || lng < -6 || lng > 10)) { lat = null; lng = null; }

  const phone = str(form, 'phone', 30);
  if (phone && !phoneValid(phone)) errors.push('Numéro de téléphone invalide.');
  const email = str(form, 'email', 120).toLowerCase();
  if (email && !emailValid(email)) errors.push('Adresse email invalide.');

  let website = '';
  const rawWebsite = str(form, 'website', 300);
  if (opts.pro) {
    if (rawWebsite) {
      const w = /^https?:\/\//i.test(rawWebsite) ? rawWebsite : `https://${rawWebsite}`;
      if (urlValid(w)) website = w;
      else errors.push('Adresse du site internet invalide.');
    }
  } else {
    // Hors abonnement, le site déjà enregistré est conservé (masqué) pour être réaffiché en cas de réabonnement.
    website = cur?.website ?? '';
  }

  // Prix « à partir de » (Pro et Premium) : nombre en euros, enregistré avec une virgule (« 12,50 »).
  let price_from = cur?.price_from ?? '';
  if (opts.pro) {
    const raw = str(form, 'price_from', 12).replace(/\s|€/g, '').replace('.', ',');
    if (!raw) price_from = '';
    else if (/^\d{1,6}(,\d{1,2})?$/.test(raw)) price_from = raw.replace(/,(\d)$/, (_, d) => `,${d}0`).replace(/,00$/, '');
    else errors.push('Prix « à partir de » : indiquez un montant en euros (ex. 25 ou 12,50).');
  }

  const siret = str(form, 'siret', 20).replace(/\s/g, '');
  if (siret && !/^\d{14}$/.test(siret)) errors.push('Le SIRET doit contenir 14 chiffres.');

  const seoVars = ficheVars({ name, city: city || rawCity, category, short_desc, postcode });
  const titleLen = seo_title ? fillCustom(seo_title, seoVars).length : 0;
  const descLen = seo_description ? fillCustom(seo_description, seoVars).length : 0;
  if (titleLen > SEO_TITLE_MAX) errors.push(`Le title SEO doit faire au plus ${SEO_TITLE_MAX} caractères une fois les variables remplacées (${titleLen} actuellement).`);
  if (descLen > SEO_DESC_MAX) errors.push(`La meta description doit faire au plus ${SEO_DESC_MAX} caractères une fois les variables remplacées (${descLen} actuellement).`);

  const { hours, error: hoursError } = hoursFromForm(form);
  if (hoursError) errors.push(hoursError);
  const hours_note = str(form, 'hours_note', 200);

  const { socials, errors: socialErrors } = socialsFromForm(form);
  errors.push(...socialErrors);

  const features = form.getAll('features').map(String).filter((k) => featureKeys.has(k));
  const languages = form.getAll('languages').map(String).filter((k) => languageKeys.has(k));

  // Année de création, zone d'intervention, labels et certifications (toutes formules).
  const founded = str(form, 'founded', 6);
  if (founded && !(/^\d{4}$/.test(founded) && +founded >= 1500 && +founded <= new Date().getFullYear())) {
    errors.push(`Année de création invalide (ex. 1998, au plus ${new Date().getFullYear()}).`);
  }
  const area_served = str(form, 'area_served', 150);
  const credentials = credentialList(str(form, 'credentials', 300)).slice(0, 10).join(', ');

  // Logo
  let logo = cur?.logo ?? '';
  if (form.get('logo_remove') === 'on' && logo) { removeImage(logo); logo = ''; }
  const up = await saveImage(form.get('logo'), 'logo');
  if (up.error) errors.push(up.error);
  if (up.path) { if (logo) removeImage(logo); logo = up.path; }

  // Bannière (Pro et Premium) : hors abonnement, la bannière enregistrée est conservée (masquée).
  let banner = cur?.banner ?? '';
  if (opts.pro) {
    if (form.get('banner_remove') === 'on' && banner) { removeImage(banner); banner = ''; }
    const b = await saveImage(form.get('banner'), 'banner');
    if (b.error) errors.push(b.error);
    if (b.path) { if (banner) removeImage(banner); banner = b.path; }
  }

  // Actualité / offre du moment (Pro et Premium) : hors abonnement, la valeur enregistrée est conservée (masquée).
  let news_title = cur?.news_title ?? '', news_text = cur?.news_text ?? '', news_link = cur?.news_link ?? '', news_until = cur?.news_until ?? '';
  if (opts.pro) {
    news_title = str(form, 'news_title', 80);
    news_text = str(form, 'news_text', 400);
    const rawLink = str(form, 'news_link', 300);
    news_link = '';
    if (rawLink) {
      const l = /^https?:\/\//i.test(rawLink) ? rawLink : `https://${rawLink}`;
      if (urlValid(l)) news_link = l; else errors.push("Lien de l'actualité invalide.");
    }
    news_until = str(form, 'news_until', 10);
    if (news_until && !/^\d{4}-\d{2}-\d{2}$/.test(news_until)) { errors.push("Date de fin de l'actualité invalide."); news_until = ''; }
    if (!news_title && (news_text || news_link)) errors.push("Donnez un titre à votre actualité (ex. « -10 % en octobre »).");
  }

  // Galerie (Pro)
  let photos = [...(cur?.photos ?? [])];
  const toRemove = new Set(form.getAll('photo_remove').map(String));
  for (const p of photos.filter((p) => toRemove.has(p))) removeImage(p);
  photos = photos.filter((p) => !toRemove.has(p));
  if (opts.pro) {
    for (const file of form.getAll('photos')) {
      if (photos.length >= (opts.maxPhotos ?? PLANS.pro.photos)) break;
      const r = await saveImage(file, 'photo');
      if (r.error) errors.push(r.error);
      if (r.path) photos.push(r.path);
    }
  }

  // Premium : vidéos YouTube et « J'achète des leads » (hors Premium, les valeurs enregistrées sont conservées, masquées).
  let videos = [...(cur?.videos ?? [])];
  let leads_enabled = cur?.leads_enabled ?? false;
  if (opts.premium) {
    videos = [];
    for (let i = 1; i <= MAX_VIDEOS; i++) {
      const raw = str(form, `video_${i}`, 300);
      if (!raw) continue;
      const id = youtubeId(raw);
      if (id) { if (!videos.includes(id)) videos.push(id); }
      else errors.push(`Vidéo ${i} : lien YouTube non reconnu (ex. https://www.youtube.com/watch?v=…).`);
    }
    leads_enabled = form.get('leads_enabled') === 'on';
  }

  // En cas d'erreur, rien n'est enregistré : on supprime les images tout juste envoyées.
  if (errors.length) {
    const kept = new Set([cur?.logo, cur?.banner, ...(cur?.photos ?? [])].filter(Boolean));
    for (const p of [logo, banner, ...photos]) if (p && !kept.has(p)) removeImage(p);
    logo = cur?.logo ?? '';
    banner = cur?.banner ?? '';
    photos = [...(cur?.photos ?? [])];
  }

  return {
    data: {
      name, kind, category, short_desc, description, street, postcode, city, lat, lng, phone, email, website, siret,
      hours, hours_note, socials, features, logo, photos, seo_title, seo_description, videos, leads_enabled, banner,
      news_title, news_text, news_link, news_until, price_from,
      founded, area_served, credentials, languages,
    },
    errors,
  };
}
