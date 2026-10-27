// Repères calculés sur les fiches publiées d'un périmètre (catégorie, catégorie + commune, univers, commune) :
// ouvertures le week-end, horaires matinaux et tardifs, jour de fermeture, services, cuisines, rues, communes.
// Tout vient des données ; rien n'est estimé. Résultats mis en cache quelques minutes (pages très consultées).
import { all } from './db.ts';
import { DAYS, fmtTime, type Day, type Hours } from './hours.ts';
import { featureLabel } from './features.ts';

export interface Named { name: string; slug: string; city: string; note?: string }
export interface Insights {
  total: number;
  communes: { city: string; city_slug: string; n: number }[];
  postcodes: string[];
  /** Fiches dont les horaires sont renseignés. */
  known: number;
  sat: number;
  sun: number;
  sunList: Named[];
  /** Ouvertures les plus matinales (en semaine), avant 8h. */
  early: Named[];
  /** Fermetures les plus tardives, à partir de 21h. */
  late: Named[];
  /** Ouverts sans interruption entre 12h et 14h en semaine. */
  continuous: number;
  /** Jours de fermeture (lundi → samedi) : part des fiches aux horaires connus fermées ce jour-là, décroissante. */
  closed: { day: Day; pct: number }[];
  sunClosedPct: number;
  features: { key: string; label: string; n: number; examples: Named[] }[];
  cuisines: { label: string; n: number }[];
  streets: { street: string; city: string; n: number }[];
  claimed: number;
  recent: Named[];
  /** Semaine type, sur les fiches aux horaires connus. */
  week: {
    /** Établissements ouverts chaque jour, et leurs noms. */
    open: Record<Day, number>;
    openNames: Record<Day, Named[]>;
    always: number;
    /** Heures médianes d'ouverture et de fermeture en semaine (« 09:00 »). */
    medOpen?: string;
    medClose?: string;
    /** Fermés à l'heure du déjeuner en semaine, et pause médiane. */
    lunchBreak: number;
    breakFrom?: string;
    breakTo?: string;
    /** Ouverts le samedi après-midi (entre 15h et 16h). */
    satAfternoon: number;
    /** Ouverts après 19h au moins un jour de semaine. */
    evening: number;
  };
}

const min = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const WEEK: Day[] = ['mo', 'tu', 'we', 'th', 'fr'];
const median = (a: number[]) => { if (!a.length) return undefined; const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
/** Arrondi au quart d'heure, pour une heure « typique » lisible. */
const quarter = (m?: number) => (m === undefined ? undefined : hhmm(Math.round(m / 15) * 15));

/** « 12 bis Rue Saint-Jean » → « rue Saint-Jean ». */
function streetName(s: string) {
  const v = s.replace(/^\s*\d+[\s,]*(bis|ter|quater|[a-d])?\b[\s,]*/i, '').replace(/\s+/g, ' ').trim();
  if (!/^(rue|avenue|boulevard|place|quai|route|chemin|allée|impasse|cours|square|esplanade|passage|promenade|rond-point|zone|za|zi|centre commercial)\b/i.test(v)) return '';
  return v.charAt(0).toLowerCase() + v.slice(1);
}

const cache = new Map<string, { at: number; v: Insights }>();

export function insights(where: string, params: (string | number)[]): Insights {
  const key = `${where}|${params.join('|')}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.v;

  const rows = all<{ name: string; slug: string; city: string; city_slug: string; postcode: string; street: string; hours: string | null; features: string; short_desc: string; owner_id: number | null; published_at: string | null }>(
    `SELECT name, slug, city, city_slug, postcode, street, hours, features, short_desc, owner_id, published_at FROM fiches WHERE status = 'published' AND ${where} ORDER BY name`, ...params);

  const v: Insights = {
    total: rows.length, communes: [], postcodes: [], known: 0, sat: 0, sun: 0, sunList: [], early: [], late: [], continuous: 0,
    closed: [], sunClosedPct: 0, features: [], cuisines: [], streets: [], claimed: 0, recent: [],
    week: {
      open: Object.fromEntries(DAYS.map((d) => [d, 0])) as Record<Day, number>,
      openNames: Object.fromEntries(DAYS.map((d) => [d, []])) as unknown as Record<Day, Named[]>,
      always: 0, lunchBreak: 0, satAfternoon: 0, evening: 0,
    },
  };
  const W = v.week;
  const opens: number[] = [], closes: number[] = [], breakFrom: number[] = [], breakTo: number[] = [];
  const communes = new Map<string, { city: string; city_slug: string; n: number }>();
  const postcodes = new Map<string, number>();
  const closedN = new Map<Day, number>();
  const feats = new Map<string, Named[]>();
  const cuisines = new Map<string, number>();
  const streets = new Map<string, { street: string; city: string; n: number }>();
  const early: (Named & { m: number })[] = [];
  const late: (Named & { m: number })[] = [];

  for (const r of rows) {
    const named: Named = { name: r.name, slug: r.slug, city: r.city };
    if (r.city_slug) {
      const c = communes.get(r.city_slug) ?? { city: r.city, city_slug: r.city_slug, n: 0 };
      c.n++; communes.set(r.city_slug, c);
    }
    if (/^\d{5}$/.test(r.postcode)) postcodes.set(r.postcode, (postcodes.get(r.postcode) ?? 0) + 1);
    if (r.owner_id) v.claimed++;
    const st = streetName(r.street);
    if (st) {
      const k = `${r.city_slug}|${st.toLowerCase()}`;
      const s = streets.get(k) ?? { street: st, city: r.city, n: 0 };
      s.n++; streets.set(k, s);
    }
    let fs: string[] = [];
    try { fs = JSON.parse(r.features || '[]'); } catch {}
    for (const f of fs) { const l = feats.get(f) ?? []; l.push(named); feats.set(f, l); }
    const cu = r.short_desc.match(/· cuisine ([^·]+)/);
    if (cu) for (const c of new Set(cu[1].split(/,\s*/).map((x) => x.trim().toLowerCase()))) if (c) cuisines.set(c, (cuisines.get(c) ?? 0) + 1);

    let h: Hours | null = null;
    try { h = JSON.parse(r.hours ?? 'null'); } catch {}
    if (!h || (!h.always && !DAYS.some((d) => (h![d] ?? []).length))) continue;
    v.known++;
    if (h.always) {
      v.sat++; v.sun++; v.sunList.push({ ...named, note: '24h/24' }); v.continuous++;
      W.always++; W.satAfternoon++; W.evening++;
      for (const d of DAYS) { W.open[d]++; W.openNames[d].push({ ...named, note: '24h/24' }); }
      continue;
    }
    for (const d of DAYS) {
      const r = h[d] ?? [];
      if (r.length) { W.open[d]++; W.openNames[d].push({ ...named, note: r.map(([a, b]) => `${fmtTime(a)}-${fmtTime(b)}`).join(', ') }); }
    }
    const end = (a: string, b: string) => (min(b) <= min(a) ? min(b) + 1440 : min(b));
    const wkDays = WEEK.filter((d) => (h![d] ?? []).length);
    if (wkDays.length) {
      opens.push(median(wkDays.map((d) => min(h![d]![0][0])))!);
      closes.push(median(wkDays.map((d) => { const r = h![d]!; return end(...r[r.length - 1]); }))!);
      if (wkDays.some((d) => (h![d] ?? []).some(([a, b]) => end(a, b) > 19 * 60))) W.evening++;
      const lunchBefore = W.lunchBreak;
      // Pause de midi : deux plages dont la coupure tombe entre 11h et 15h.
      for (const d of wkDays) {
        const r = h[d]!;
        const i = r.findIndex((x, k) => k > 0 && min(r[k - 1][1]) >= 11 * 60 && min(r[k - 1][1]) <= 15 * 60 && min(x[0]) > min(r[k - 1][1]));
        if (i > 0) { W.lunchBreak++; breakFrom.push(min(r[i - 1][1])); breakTo.push(min(r[i][0])); break; }
      }
      // Journée continue : aucune pause de midi et au moins un jour ouvert sans interruption de 12h à 14h.
      if (W.lunchBreak === lunchBefore && wkDays.some((d) => (h![d] ?? []).some(([a, b]) => min(a) <= 12 * 60 && end(a, b) >= 14 * 60))) v.continuous++;
    }
    if ((h.sa ?? []).some(([a, b]) => min(a) <= 15 * 60 && end(a, b) >= 16 * 60)) W.satAfternoon++;
    const sa = h.sa ?? [], su = h.su ?? [];
    if (sa.length) v.sat++;
    if (su.length) { v.sun++; v.sunList.push({ ...named, note: su.map(([a, b]) => `${fmtTime(a)}-${fmtTime(b)}`).join(', ') }); }
    for (const d of ['mo', 'tu', 'we', 'th', 'fr', 'sa'] as Day[]) if (!(h[d] ?? []).length) closedN.set(d, (closedN.get(d) ?? 0) + 1);
    const wk = WEEK.flatMap((d) => h![d] ?? []);
    if (wk.length) {
      const open = Math.min(...wk.map(([a]) => min(a)));
      if (open < 8 * 60) early.push({ ...named, m: open, note: fmtTime(hhmm(open)) });
    }
    const ends = DAYS.flatMap((d) => (h![d] ?? []).map(([a, b]) => (min(b) <= min(a) ? min(b) + 1440 : min(b))));
    if (ends.length) {
      const close = Math.max(...ends);
      if (close >= 21 * 60) late.push({ ...named, m: close, note: close >= 1440 ? `${fmtTime(hhmm(close - 1440))} du matin` : fmtTime(hhmm(close)) });
    }
  }

  W.medOpen = quarter(median(opens));
  W.medClose = quarter(median(closes));
  W.breakFrom = quarter(median(breakFrom));
  W.breakTo = quarter(median(breakTo));
  v.communes = [...communes.values()].sort((a, b) => b.n - a.n);
  v.postcodes = [...postcodes.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
  v.closed = v.known ? [...closedN.entries()].map(([day, n]) => ({ day, pct: Math.round((n / v.known) * 100) })).sort((a, b) => b.pct - a.pct) : [];
  v.sunClosedPct = v.known ? Math.round(((v.known - v.sun) / v.known) * 100) : 0;
  v.early = early.sort((a, b) => a.m - b.m).map(({ m, ...x }) => x);
  v.late = late.sort((a, b) => b.m - a.m).map(({ m, ...x }) => x);
  v.features = [...feats.entries()].map(([key, l]) => ({ key, label: featureLabel(key), n: l.length, examples: l })).sort((a, b) => b.n - a.n);
  v.cuisines = [...cuisines.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
  v.streets = [...streets.values()].filter((s) => s.n >= 2).sort((a, b) => b.n - a.n);
  v.recent = rows.filter((r) => r.published_at).sort((a, b) => (b.published_at! > a.published_at! ? 1 : -1)).slice(0, 6).map((r) => ({ name: r.name, slug: r.slug, city: r.city }));
  cache.set(key, { at: Date.now(), v });
  return v;
}
