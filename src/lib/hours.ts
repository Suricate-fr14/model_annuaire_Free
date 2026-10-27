// Horaires d'ouverture. Sans dépendance : utilisé côté serveur, par l'import OSM et dans le navigateur.

export const DAYS = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'] as const;
export type Day = (typeof DAYS)[number];
export type Range = [string, string]; // ["09:00", "12:30"]
export type Hours = { always?: boolean } & Partial<Record<Day, Range[]>>;

export const DAY_LABELS: Record<Day, string> = {
  mo: 'Lundi', tu: 'Mardi', we: 'Mercredi', th: 'Jeudi', fr: 'Vendredi', sa: 'Samedi', su: 'Dimanche',
};

const TIME = /^([01]?\d|2[0-4]):([0-5]\d)$/;
export const isTime = (s: string) => TIME.test(s);
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
export const fmtTime = (t: string) => t.replace(/^0(\d)/, '$1').replace(':', 'h').replace(/h00$/, 'h');

/** Analyse les formats OSM les plus courants : "Mo-Fr 09:00-12:00,14:00-18:00; Sa 10:00-18:00; Su off", "24/7". */
export function parseOsmHours(input: string): Hours | null {
  const src = input.trim();
  if (!src) return null;
  if (src === '24/7') return { always: true };
  const out: Hours = {};
  let understood = 0;
  const OSM_DAYS: Record<string, Day> = { Mo: 'mo', Tu: 'tu', We: 'we', Th: 'th', Fr: 'fr', Sa: 'sa', Su: 'su' };

  const DAY_RE = '(?:Mo|Tu|We|Th|Fr|Sa|Su)';

  // Une sous-règle : "Mo-Fr,Su 09:00-12:00,14:00-18:00" ou "Sa off". Renvoie null si non comprise.
  function parseSub(sub: string): { days: Day[]; ranges: Range[] } | null {
    const m = sub.match(new RegExp(`^(${DAY_RE}(?:-${DAY_RE})?(?:,${DAY_RE}(?:-${DAY_RE})?)*)?\\s*(.*)$`));
    if (!m) return null;
    const [, daySel, rest] = m;
    let days: Day[] = [...DAYS];
    if (daySel) {
      days = [];
      for (const part of daySel.split(',')) {
        const [a, b] = part.split('-');
        const ia = DAYS.indexOf(OSM_DAYS[a]);
        const ib = b ? DAYS.indexOf(OSM_DAYS[b]) : ia;
        for (let i = ia; ; i = (i + 1) % 7) {
          days.push(DAYS[i]);
          if (i === ib) break;
        }
      }
    }
    const body = rest.trim();
    if (/^(off|closed)$/i.test(body)) return { days, ranges: [] };
    if (!body) return null;
    const ranges: Range[] = [];
    for (const r of body.split(/\s*,\s*/)) {
      const t = r.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\+?$/);
      if (!t || !isTime(t[1]) || !isTime(t[2])) return null;
      ranges.push([t[1].padStart(5, '0'), t[2].padStart(5, '0')]);
    }
    return { days, ranges };
  }

  for (const rawRule of src.split(/\s*;\s*|\s*\|\|\s*/)) {
    // "PH,Mo-Su 10:00-19:00" → "Mo-Su 10:00-19:00" (les jours fériés ne sont pas modélisés).
    const rule = rawRule.trim().replace(/\s+/g, ' ').replace(/\bPH\s*,\s*/g, '').replace(/\s*,\s*PH\b/g, '');
    if (!rule) continue;
    // Règles saisonnières, jours fériés seuls, semaines… : ignorées (non représentables simplement).
    if (/\b(PH|SH|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|week|easter|sunrise|sunset)\b|\[|"/i.test(rule)) continue;

    // Dans une même règle, ", Tu-Sa …" introduit une règle additionnelle (horaires cumulés).
    // (séparateur : une virgule placée après une heure ou « off », suivie d'un jour)
    const subs = rule.split(new RegExp(`(?<=\\d|off|closed)\\s*,\\s*(?=${DAY_RE}\\b)`, 'i'));
    const merged = new Map<Day, Range[]>();
    let ok = true;
    for (const sub of subs) {
      const parsed = parseSub(sub);
      if (!parsed) { ok = false; break; }
      for (const d of parsed.days) {
        merged.set(d, parsed.ranges.length ? [...(merged.get(d) ?? []), ...parsed.ranges] : (merged.get(d) ?? []));
      }
    }
    if (!ok) continue;
    for (const [d, ranges] of merged) out[d] = ranges.sort((a, b) => a[0].localeCompare(b[0]));
    understood++;
  }
  if (!understood) return null;
  for (const d of DAYS) if (!out[d]) out[d] = [];
  const allDay = (r: Range[]) => r.length === 1 && r[0][0] === '00:00' && (r[0][1] === '24:00' || r[0][1] === '23:59');
  if (DAYS.every((d) => allDay(out[d]!))) return { always: true };
  return out;
}

/** Heure locale (Europe/Paris par défaut) : jour de la semaine et minutes depuis minuit. */
export function localNow(timezone = 'Europe/Paris', date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const wd = parts.find((p) => p.type === 'weekday')!.value.slice(0, 2).toLowerCase() as Day;
  const h = Number(parts.find((p) => p.type === 'hour')!.value);
  const m = Number(parts.find((p) => p.type === 'minute')!.value);
  return { day: wd, minutes: h * 60 + m };
}

export type OpenState = { open: boolean; label: string; soon?: boolean } | null;

export function openState(hours: Hours | null | undefined, timezone = 'Europe/Paris', date = new Date()): OpenState {
  if (!hours) return null;
  if (hours.always) return { open: true, label: 'Ouvert 24h/24' };
  const { day, minutes } = localNow(timezone, date);
  const di = DAYS.indexOf(day);
  const prev = DAYS[(di + 6) % 7];

  // Plage de la veille qui déborde après minuit (ex. 19:00-02:00).
  for (const [a, b] of hours[prev] ?? []) {
    if (toMin(b) <= toMin(a) && minutes < toMin(b)) return { open: true, label: `Ouvert · ferme à ${fmtTime(b)}`, soon: toMin(b) - minutes <= 30 };
  }
  for (const [a, b] of hours[day] ?? []) {
    const s = toMin(a);
    const e = toMin(b) <= s ? toMin(b) + 1440 : toMin(b);
    if (minutes >= s && minutes < e) return { open: true, label: `Ouvert · ferme à ${fmtTime(b)}`, soon: e - minutes <= 30 };
  }
  // Prochaine ouverture : plus tard aujourd'hui, puis les jours suivants.
  for (const [a] of hours[day] ?? []) if (toMin(a) > minutes) return { open: false, label: `Fermé · ouvre à ${fmtTime(a)}` };
  for (let i = 1; i <= 7; i++) {
    const d = DAYS[(di + i) % 7];
    const first = (hours[d] ?? [])[0];
    if (first) return { open: false, label: `Fermé · ouvre ${i === 1 ? 'demain' : DAY_LABELS[d].toLowerCase()} à ${fmtTime(first[0])}` };
  }
  return { open: false, label: 'Fermé' };
}

export const dayText = (ranges: Range[] | undefined) =>
  ranges && ranges.length ? ranges.map(([a, b]) => `${fmtTime(a)} – ${fmtTime(b)}`).join(', ') : 'Fermé';

/** schema.org openingHoursSpecification */
export function hoursToSchema(hours: Hours | null) {
  if (!hours) return undefined;
  const map: Record<Day, string> = { mo: 'Monday', tu: 'Tuesday', we: 'Wednesday', th: 'Thursday', fr: 'Friday', sa: 'Saturday', su: 'Sunday' };
  if (hours.always) return [{ '@type': 'OpeningHoursSpecification', dayOfWeek: Object.values(map), opens: '00:00', closes: '23:59' }];
  return DAYS.flatMap((d) => (hours[d] ?? []).map(([opens, closes]) => ({
    '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${map[d]}`, opens, closes,
  })));
}

/** Lecture du formulaire : champs h_<jour>_open, h_<jour>_<1|2>_from / _to, h_always. */
export function hoursFromForm(form: FormData): { hours: Hours | null; error?: string } {
  if (form.get('h_none') === 'on') return { hours: null };
  if (form.get('h_always') === 'on') return { hours: { always: true } };
  const out: Hours = {};
  for (const d of DAYS) {
    out[d] = [];
    if (form.get(`h_${d}_open`) !== 'on') continue;
    for (const slot of [1, 2]) {
      const a = String(form.get(`h_${d}_${slot}_from`) ?? '').trim();
      const b = String(form.get(`h_${d}_${slot}_to`) ?? '').trim();
      if (!a && !b) continue;
      if (!isTime(a) || !isTime(b)) return { hours: null, error: `Horaires du ${DAY_LABELS[d].toLowerCase()} incomplets.` };
      out[d]!.push([a, b]);
    }
    if (!out[d]!.length) return { hours: null, error: `Indiquez au moins une plage horaire le ${DAY_LABELS[d].toLowerCase()}, ou décochez « ouvert ».` };
  }
  return { hours: out };
}
