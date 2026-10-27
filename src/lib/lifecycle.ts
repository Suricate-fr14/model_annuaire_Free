// Relances automatiques par fiche (tâche quotidienne : npm run -s emails:relances). Chaque relance n'est envoyée
// qu'une fois par fiche et par référence (table email_log), uniquement au propriétaire d'une fiche publiée.
//   1. complete : 3 jours après la mise en ligne, si la fiche est complète à moins de 80 %   (conseils)
//   2. intent   : 2 jours après la mise en ligne, si la formule choisie n'a pas été payée     (conseils)
//   3. gift     : 7 jours avant la fin d'une formule offerte                                   (service, toujours envoyée)
//   4. news     : dans la semaine qui suit la fin d'une actualité, si aucune autre n'est publiée (conseils)
// « Conseils » : non envoyées si le pro a décoché « Conseils et rappels » dans ses paramètres.
import { all, get, run } from './db.ts';
import { parseFiche, activeNews, type Fiche } from './fiches.ts';
import { completeness } from './completeness.ts';
import { intentFrom } from './intent.ts';
import { send } from './mail.ts';
import { renderMail } from './emailLayout.ts';
import { completeReminder, intentReminder, giftEnding, newsExpired, type Mail } from './emails.ts';

type Owner = { email: string; name: string; tips: number };
type Job = { kind: string; ref: string; fiche: Fiche; owner: Owner; mail: Mail; tips: boolean };

const daysAgo = (d: number) => new Date(Date.now() - d * 864e5).toISOString();
const sent = (ficheId: number, kind: string, ref: string) => Boolean(get('SELECT 1 FROM email_log WHERE fiche_id = ? AND kind = ? AND ref = ?', ficheId, kind, ref));

/** Relances dues aujourd'hui. */
export function dueReminders(): Job[] {
  const rows = all<any>(`SELECT f.*, u.email AS o_email, u.name AS o_name, u.tips_emails AS o_tips,
    (SELECT MAX(decided_at) FROM claims c WHERE c.fiche_id = f.id AND c.status = 'approved') AS claimed_at FROM fiches f
    JOIN users u ON u.id = f.owner_id WHERE f.status = 'published' AND u.disabled = 0`);
  const jobs: Job[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const r of rows) {
    const f = parseFiche(r);
    const owner: Owner = { email: r.o_email, name: r.o_name, tips: r.o_tips };
    const add = (kind: string, ref: string, mail: Mail, tips = true) => {
      if (!sent(f.id, kind, ref)) jobs.push({ kind, ref, fiche: f, owner, mail, tips });
    };
    // Point de départ : mise en ligne, ou prise en main par le pro (fiche importée puis revendiquée).
    const toIso = (d: string) => (d.includes('T') ? d : `${d.replace(' ', 'T')}Z`);
    const published = [f.published_at ?? f.created_at, r.claimed_at].filter(Boolean).map(toIso).sort().pop()!;
    // 1. Fiche peu complète, 3 jours après sa mise en ligne (une seule fois).
    const c = completeness(f);
    if (published <= daysAgo(3) && published >= daysAgo(60) && c.score < 80) add('complete', '', completeReminder(owner.name, f, c.score, c.missing));
    // 2. Formule choisie mais pas payée.
    const wanted = intentFrom(f.wanted_plan, f.wanted_interval);
    if (wanted && !f.certified && published <= daysAgo(2)) add('intent', `${wanted.plan}-${wanted.interval}`, intentReminder(owner.name, f, wanted));
    // 3. Formule offerte qui se termine dans 7 jours au plus.
    if (f.gift_plan && f.gift_until && f.gift_until > new Date().toISOString() && f.gift_until <= new Date(Date.now() + 7 * 864e5).toISOString()) {
      add('gift', f.gift_until.slice(0, 10), giftEnding(owner.name, f, f.gift_until), false);
    }
    // 4. Actualité terminée depuis moins de 7 jours, sans nouvelle actualité.
    if (f.certified && f.news_title.trim() && f.news_until && f.news_until < today && f.news_until >= daysAgo(7).slice(0, 10) && !activeNews(f)) {
      add('news', `${f.news_until}:${f.news_title.slice(0, 60)}`, newsExpired(owner.name, f));
    }
  }
  // Conseils désactivés par le pro : seules les relances de service partent. Une seule relance de conseil par compte
  // et par jour (la plus utile d'abord), pour ne pas saturer une boîte qui gère plusieurs fiches.
  const order = ['gift', 'intent', 'complete', 'news'];
  const tipsSent = new Set<string>();
  return jobs
    .filter((j) => !j.tips || j.owner.tips)
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
    .filter((j) => {
      if (!j.tips) return true;
      if (tipsSent.has(j.owner.email)) return false;
      tipsSent.add(j.owner.email);
      return true;
    });
}

/** Envoie les relances dues ; apercu = affiche sans envoyer ni enregistrer. */
export async function sendReminders(opts: { dryRun?: boolean } = {}) {
  const jobs = dueReminders();
  for (const j of jobs) {
    if (opts.dryRun) { console.log(`--- ${j.owner.email} · ${j.kind} · ${j.mail.subject}\n\n${renderMail(j.mail.content).text}\n`); continue; }
    await send(j.owner.email, j.mail);
    run('INSERT OR IGNORE INTO email_log (fiche_id, kind, ref) VALUES (?, ?, ?)', j.fiche.id, j.kind, j.ref);
  }
  return jobs.length;
}
