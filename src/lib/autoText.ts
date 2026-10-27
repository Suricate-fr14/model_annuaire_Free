// Textes générés pour les fiches importées (non revendiquées) : accroche courte et présentation en phrases,
// à partir de la catégorie, de l'adresse, des horaires et (en option) du téléphone.
import { DAYS, type Day, type Hours, type Range, fmtTime } from './hours.ts';
import { categoryName } from './taxonomy.ts';
import { phoneDisplay } from './text.ts';
import { CITY } from '../config.ts';

const DAY_NAMES: Record<Day, string> = { mo: 'lundi', tu: 'mardi', we: 'mercredi', th: 'jeudi', fr: 'vendredi', sa: 'samedi', su: 'dimanche' };

const join = (parts: string[]) => (parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}`);
const rangesText = (r: Range[]) => r.map(([a, b]) => `de ${fmtTime(a)} à ${fmtTime(b)}`).join(' et ');
const key = (r: Range[] | undefined) => (r ?? []).map((x) => x.join('-')).join(',');

/** Jours consécutifs regroupés : « du lundi au vendredi », « les lundi et mardi », « le samedi ». */
function daysText(days: Day[]) {
  if (days.length === 1) return `le ${DAY_NAMES[days[0]]}`;
  if (days.length === 2) return `les ${DAY_NAMES[days[0]]} et ${DAY_NAMES[days[1]]}`;
  return `du ${DAY_NAMES[days[0]]} au ${DAY_NAMES[days.at(-1)!]}`;
}

/** Liste de jours (pas forcément consécutifs) : « les mardi, mercredi et samedi », « du lundi au vendredi et le samedi ». */
function dayList(days: Day[]) {
  const runs: Day[][] = [];
  for (const d of days) {
    const last = runs.at(-1);
    if (last && DAYS.indexOf(last.at(-1)!) === DAYS.indexOf(d) - 1) last.push(d); else runs.push([d]);
  }
  if (runs.every((r) => r.length < 3)) {
    const names = runs.flat().map((d) => DAY_NAMES[d]);
    return names.length === 1 ? `le ${names[0]}` : `les ${join(names)}`;
  }
  return join(runs.flatMap((r) => (r.length >= 3 ? [daysText(r)] : r.map((d) => `le ${DAY_NAMES[d]}`))));
}

/** Groupes de jours consécutifs ayant les mêmes horaires. */
function groups(h: Hours) {
  const out: { days: Day[]; ranges: Range[] }[] = [];
  for (const d of DAYS) {
    const r = h[d] ?? [];
    const last = out.at(-1);
    if (last && key(last.ranges) === key(r) && DAYS.indexOf(last.days.at(-1)!) === DAYS.indexOf(d) - 1) last.days.push(d);
    else out.push({ days: [d], ranges: r });
  }
  return out;
}


/** « Ouvert du lundi au vendredi de 9h à 18h et le samedi de 9h à 12h ; fermé le dimanche. » */
export function hoursSentence(h: Hours | null): string {
  if (!h) return '';
  if (h.always) return 'Ouvert 24 h/24, 7 j/7.';
  const g = groups(h);
  const open = g.filter((x) => x.ranges.length);
  if (!open.length) return '';
  const closed = DAYS.filter((d) => !(h[d] ?? []).length);
  if (open.length === 1 && open[0].days.length === 7) return `Ouvert tous les jours ${rangesText(open[0].ranges)}.`;
  return `Ouvert ${open.map((x) => `${daysText(x.days)} ${rangesText(x.ranges)}`).join(', ')}${closed.length ? ` ; fermé ${dayList(closed)}` : ''}.`;
}

/** Jours d'ouverture seuls, pour l'accroche : « ouvert du lundi au samedi ». */
export function openDaysText(h: Hours | null): string {
  if (!h) return '';
  if (h.always) return 'ouvert 24 h/24, 7 j/7';
  const days = DAYS.filter((d) => (h[d] ?? []).length);
  if (!days.length) return '';
  if (days.length === 7) return 'ouvert 7 j/7';
  return `ouvert ${dayList(days)}`;
}

export interface AutoInput {
  id: number; name: string; category: string; street: string; postcode: string; city: string;
  phone: string; hours: Hours | null; short_desc: string; description: string;
}

/** Informations complémentaires de l'import (cuisine, enseigne, étoiles…) à conserver. */
function extras(f: AutoInput) {
  const cuisine = f.short_desc.split(' · ').slice(1).join(' · ').replace(/^cuisine /, '');
  // La 1re ligne de la présentation importée est la phrase générique « X est référencé dans la catégorie… » : on la remplace.
  const lines = f.description.split(/\n{2,}/).map((l) => l.trim()).filter((l) => l && !/ est référencé dans la catégorie /.test(l));
  return { cuisine, lines };
}

export function autoTexts(f: AutoInput, opts: { phone?: boolean } = {}) {
  const cat = categoryName(f.category);
  const catMin = cat.toLowerCase();
  const city = f.city || CITY.name;
  const place = f.street ? `${f.street}, ${[f.postcode, city].filter(Boolean).join(' ')}` : '';
  const { cuisine, lines } = extras(f);

  // « au 12 rue de la Gare, 35000 Rennes », « rue de la Gare, 35000 Rennes » ou « à l'adresse … » selon la forme de l'adresse.
  const STREET_TYPES = /^(rue|avenue|boulevard|place|chemin|route|impasse|allée|quai|cours|square|esplanade|passage|parvis|promenade|rond-point|résidence|lieu-dit)\b/i;
  const at = !place ? '' : /^\d/.test(place) ? `au ${place}` : STREET_TYPES.test(place) ? place[0].toLowerCase() + place.slice(1) : `à l'adresse ${place}`;

  // Trois tournures (neutres, sans accord), choisies selon l'identifiant, pour varier les textes d'une fiche à l'autre.
  const v = f.id % 3;
  const intro = at
    ? [`${f.name} vous accueille ${at}.`,
       `${f.name} fait partie des ${catMin} de ${city} : rendez-vous ${at}.`,
       `Rendez-vous ${at} pour découvrir ${f.name}.`][v]
    : [`${f.name} vous accueille à ${city}.`, `${f.name} fait partie des ${catMin} de ${city}.`, `Retrouvez ${f.name} à ${city}.`][v];
  const sentences = [
    intro,
    v !== 1 ? `Catégorie : ${catMin}${cuisine ? `, cuisine ${cuisine}` : ''}.` : cuisine ? `Cuisine ${cuisine}.` : '',
    hoursSentence(f.hours),
    opts.phone && f.phone ? `Téléphone : ${phoneDisplay(f.phone)}.` : '',
  ].filter(Boolean);
  const description = [sentences.join(' '), ...lines].join('\n\n');

  // Accroche (200 caractères max) : catégorie, ville, rue, jours d'ouverture.
  const days = openDaysText(f.hours);
  const parts = [`${cat} à ${city}${cuisine ? ` · cuisine ${cuisine}` : ''}`, f.street, days].filter(Boolean);
  let short = parts.join(' · ');
  if (short.length > 200) short = parts.slice(0, 2).join(' · ').slice(0, 200);
  return { short_desc: short, description };
}
