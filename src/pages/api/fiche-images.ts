import type { APIRoute } from 'astro';
import { getFiche, MAX_REFS } from '../../lib/fiches';
import { photoLimit } from '../../lib/ficheForm';
import { saveImage, removeImage } from '../../lib/uploads';
import { audit, run } from '../../lib/db';
import { PLANS } from '../../config';

// Images d'une fiche, modifiées sans enregistrer tout le formulaire : ajout d'une photo à la galerie (action=add,
// champ photo), suppression d'une photo (action=remove, champ path), du logo (remove-logo) ou de la bannière
// (remove-banner), ajout d'une référence client (add-ref : champs photo et name) ou suppression (remove-ref : path).
// Réservé au propriétaire de la fiche et aux administrateurs.
export const POST: APIRoute = async ({ request, locals }) => {
  const fail = (status: number, error: string) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  const user = locals.user;
  if (!user) return fail(401, 'Session expirée : reconnectez-vous.');
  const form = await request.formData().catch(() => null);
  if (!form) return fail(400, 'Requête invalide.');
  const f = getFiche(Number(form.get('fiche')));
  const admin = user.role === 'admin';
  if (!f || (f.owner_id !== user.id && !admin)) return fail(404, 'Fiche introuvable.');

  const action = String(form.get('action') ?? '');
  if (action === 'remove-logo' || action === 'remove-banner') {
    const col = action === 'remove-logo' ? 'logo' : 'banner';
    if (f[col]) removeImage(f[col]);
    run(`UPDATE fiches SET ${col} = '', updated_at = datetime('now') WHERE id = ?`, f.id);
    audit(user.id, `fiche.${col}.remove`, String(f.id));
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (action === 'add-ref' || action === 'remove-ref') {
    let refs = [...f.refs];
    if (action === 'remove-ref') {
      const path = String(form.get('path') ?? '');
      if (refs.some((r) => r.logo === path)) removeImage(path);
      refs = refs.filter((r) => r.logo !== path);
    } else {
      if (!f.certified && !admin) return fail(403, 'Les références clients sont réservées aux formules Pro et Premium.');
      if (refs.length >= MAX_REFS) return fail(409, `${MAX_REFS} références au plus : supprimez-en une pour en ajouter une autre.`);
      const name = String(form.get('name') ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
      const r = await saveImage(form.get('photo'), 'ref');
      if (r.error) return fail(400, r.error);
      if (!r.path) return fail(400, 'Choisissez le logo du client.');
      refs.push({ logo: r.path, name });
    }
    run("UPDATE fiches SET refs = ?, updated_at = datetime('now') WHERE id = ?", JSON.stringify(refs), f.id);
    audit(user.id, `fiche.${action}`, String(f.id));
    return Response.json({ refs }, { headers: { 'Cache-Control': 'no-store' } });
  }

  let photos = [...f.photos];
  if (action === 'remove') {
    const path = String(form.get('path') ?? '');
    if (!photos.includes(path)) return Response.json({ photos });
    photos = photos.filter((p) => p !== path);
    removeImage(path);
  } else if (action === 'add') {
    const max = admin ? PLANS.premium.photos : photoLimit(f);
    if (!max) return fail(403, 'La galerie photos est réservée aux formules Pro et Premium.');
    if (photos.length >= max) return fail(409, `Votre formule permet ${max} photos : supprimez-en une pour en ajouter une autre.`);
    const r = await saveImage(form.get('photo'), 'photo');
    if (r.error) return fail(400, r.error);
    if (!r.path) return fail(400, 'Aucune image reçue.');
    photos.push(r.path);
  } else return fail(400, 'Action inconnue.');

  run("UPDATE fiches SET photos = ?, updated_at = datetime('now') WHERE id = ?", JSON.stringify(photos), f.id);
  audit(user.id, `fiche.photo.${action}`, String(f.id));
  return Response.json({ photos }, { headers: { 'Cache-Control': 'no-store' } });
};
