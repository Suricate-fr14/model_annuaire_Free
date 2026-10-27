import { run, all } from './db.ts';
import { ENV } from '../config.ts';
import { renderMail, fromText, type MailContent } from './emailLayout.ts';

/**
 * Envoie un email via Resend si RESEND_API_KEY est défini, en HTML (mise en page lib/emailLayout) et en texte.
 * Dans tous les cas, l'email est conservé dans la table outbox (visible et prévisualisable dans Admin > Emails).
 * content : contenu structuré, ou texte simple (paragraphes séparés par une ligne vide).
 * replyTo : adresse de réponse (ex. le prospect, pour que le pro puisse lui répondre directement).
 */
export async function sendMail(to: string, subject: string, content: string | MailContent, replyTo?: string) {
  const { html, text } = renderMail(typeof content === 'string' ? fromText(subject, content) : content);
  let status = 'stored';
  if (ENV.resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${ENV.resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: ENV.mailFrom, to: [to], subject, html, text, ...(replyTo && { reply_to: replyTo }) }),
      });
      status = res.ok ? 'sent' : `error ${res.status}`;
    } catch (e) {
      status = 'error';
      console.error('Envoi email échoué', e);
    }
  } else {
    console.log(`[email] → ${to} · ${subject}`);
  }
  run('INSERT INTO outbox (to_email, subject, body, html, status) VALUES (?, ?, ?, ?, ?)', to, subject, text, html, status);
}

/** Prévient les administrateurs (ADMIN_EMAIL + comptes admin). */
export async function notifyAdmins(subject: string, content: string | MailContent) {
  const emails = new Set(all<{ email: string }>("SELECT email FROM users WHERE role = 'admin' AND disabled = 0").map((r) => r.email));
  if (ENV.adminEmail) emails.add(ENV.adminEmail);
  for (const e of emails) await sendMail(e, `[Admin] ${subject}`, content);
}

/** Envoie un email du catalogue (lib/emails.ts). */
export const send = (to: string, m: { subject: string; content: MailContent }, replyTo?: string) => sendMail(to, m.subject, m.content, replyTo);
