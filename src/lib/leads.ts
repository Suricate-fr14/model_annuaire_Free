// Demandes de contact (leads) des fiches Premium « J'achète des leads » :
// le prospect remplit le formulaire de la fiche, l'admin vérifie, puis la demande est transmise au propriétaire.
import { all, get, run, audit } from './db.ts';
import { ENV, SITE } from '../config.ts';
import { send, notifyAdmins } from './mail.ts';
import { leadReceived, leadToOwner, leadSent, type LeadInfo } from './emails.ts';
import { emailValid, phoneValid, phoneDisplay } from './text.ts';
import type { Fiche } from './fiches.ts';

export const REQUEST_TYPES: Record<string, string> = {
  devis: 'Demande de devis',
  rdv: 'Prise de rendez-vous',
  info: "Demande d'information",
  autre: 'Autre demande',
};
export const TIMINGS: Record<string, string> = {
  urgent: 'Dès que possible',
  mois: 'Dans le mois',
  trimestre: 'Dans les 3 mois',
  libre: 'Pas de date précise',
};
export const LEAD_STATUS: Record<string, string> = { pending: 'À vérifier', sent: 'Transmise', rejected: 'Refusée' };

export interface Lead {
  id: number; fiche_id: number; name: string; email: string; phone: string; postcode: string;
  request_type: string; timing: string; message: string; status: 'pending' | 'sent' | 'rejected';
  reject_reason: string; sent_to: string; decided_at: string | null; created_at: string;
}
export type LeadInput = Pick<Lead, 'name' | 'email' | 'phone' | 'postcode' | 'request_type' | 'timing' | 'message'>;

const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? '').trim().slice(0, max);

export function parseLeadForm(form: FormData): { data: LeadInput; errors: string[] } {
  const data: LeadInput = {
    name: str(form, 'lead_name', 80),
    email: str(form, 'lead_email', 120).toLowerCase(),
    phone: str(form, 'lead_phone', 30),
    postcode: str(form, 'lead_postcode', 5),
    request_type: str(form, 'lead_type', 20),
    timing: str(form, 'lead_timing', 20),
    message: str(form, 'lead_message', 2000),
  };
  const errors: string[] = [];
  if (data.name.length < 2) errors.push('Indiquez votre nom.');
  if (!emailValid(data.email)) errors.push('Indiquez une adresse email valide.');
  if (!phoneValid(data.phone)) errors.push('Indiquez un numéro de téléphone valide.');
  if (data.postcode && !/^\d{5}$/.test(data.postcode)) errors.push('Le code postal doit contenir 5 chiffres.');
  if (!REQUEST_TYPES[data.request_type]) errors.push('Choisissez le type de demande.');
  if (!TIMINGS[data.timing]) data.timing = 'libre';
  if (data.message.length < 15) errors.push('Décrivez votre besoin en quelques mots (15 caractères minimum).');
  if (form.get('lead_consent') !== 'on') errors.push('Cochez la case autorisant la transmission de votre demande au professionnel.');
  return { data, errors };
}

export async function createLead(f: Fiche, d: LeadInput) {
  const r = run(
    'INSERT INTO leads (fiche_id, name, email, phone, postcode, request_type, timing, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    f.id, d.name, d.email, d.phone, d.postcode, d.request_type, d.timing, d.message,
  );
  const id = Number(r.lastInsertRowid);
  await send(d.email, leadReceived(info(d), f.name, phoneDisplay));
  await notifyAdmins(`Demande de contact à vérifier : ${f.name}`,
    `${REQUEST_TYPES[d.request_type]} de ${d.name} pour « ${f.name} ».\n\n${d.message}\n\nÀ vérifier : ${ENV.siteUrl}/admin/demandes`);
  return id;
}

const info = (d: LeadInput): LeadInfo => ({
  name: d.name, email: d.email, phone: d.phone, postcode: d.postcode, message: d.message,
  request: REQUEST_TYPES[d.request_type] ?? d.request_type, timing: TIMINGS[d.timing] ?? d.timing,
});

/** Destinataire de la demande : le compte propriétaire de la fiche. */
function ownerOf(ficheId: number) {
  return get<{ email: string; name: string; fiche: string; slug: string }>(
    'SELECT u.email, u.name, f.name AS fiche, f.slug FROM fiches f JOIN users u ON u.id = f.owner_id WHERE f.id = ? AND u.disabled = 0', ficheId);
}

/** Transmet la demande au propriétaire (email avec réponse directe au prospect) et prévient le prospect. */
export async function approveLead(id: number, adminId: number): Promise<string | null> {
  const l = get<Lead>("SELECT * FROM leads WHERE id = ? AND status = 'pending'", id);
  if (!l) return 'Demande introuvable ou déjà traitée.';
  const owner = ownerOf(l.fiche_id);
  if (!owner) return "La fiche n'a pas de propriétaire actif : impossible de transmettre la demande.";
  await send(owner.email, leadToOwner(owner.name, info(l), owner.fiche, phoneDisplay), l.email);
  await send(l.email, leadSent(l.name, owner.fiche, owner.slug));
  run("UPDATE leads SET status = 'sent', sent_to = ?, decided_by = ?, decided_at = datetime('now') WHERE id = ?", owner.email, adminId, id);
  audit(adminId, 'lead.send', String(id));
  return null;
}

export function rejectLead(id: number, adminId: number, reason: string) {
  run("UPDATE leads SET status = 'rejected', reject_reason = ?, decided_by = ?, decided_at = datetime('now') WHERE id = ? AND status = 'pending'", reason.slice(0, 200), adminId, id);
  audit(adminId, 'lead.reject', String(id));
}

export function deleteLead(id: number, adminId: number) {
  run('DELETE FROM leads WHERE id = ?', id);
  audit(adminId, 'lead.delete', String(id));
}

/** Statistiques d'une fiche : demandes reçues (toutes) et transmises au propriétaire. */
export function leadStats(ficheId: number) {
  const r = get<{ total: number; sent: number }>(
    "SELECT COUNT(*) total, COALESCE(SUM(status = 'sent'), 0) sent FROM leads WHERE fiche_id = ?", ficheId);
  return { total: r?.total ?? 0, sent: r?.sent ?? 0 };
}

/** Demandes transmises au propriétaire, toutes fiches confondues (espace pro). */
export const leadsOfOwner = (userId: number) =>
  all<Lead & { fiche_name: string; fiche_slug: string }>(
    `SELECT l.*, f.name AS fiche_name, f.slug AS fiche_slug FROM leads l JOIN fiches f ON f.id = l.fiche_id
     WHERE f.owner_id = ? AND l.status = 'sent' ORDER BY l.decided_at DESC, l.id DESC LIMIT 500`, userId);

/** Date SQLite (UTC) affichée à l'heure de Paris. */
export const parisDate = (d: string | null) =>
  d ? new Date(d.replace(' ', 'T') + 'Z').toLocaleString('fr-FR', { timeZone: SITE.timezone, dateStyle: 'short', timeStyle: 'short' }) : '';

export const pendingLeadsCount = () => get<{ n: number }>("SELECT COUNT(*) n FROM leads WHERE status = 'pending'")?.n ?? 0;

export const LEADS_PRIVACY = `Vos coordonnées sont transmises à ce seul professionnel, après vérification par l'équipe de l'${SITE.fullName}, pour qu'il vous recontacte. Elles ne sont ni revendues ni utilisées à d'autres fins.`;
