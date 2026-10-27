// Mise en page des emails : un même contenu structuré donne une version HTML (tableaux et styles en ligne, lisible
// dans Gmail, Outlook, Apple Mail) et une version texte. Couleurs et ton de l'annuaire, une seule colonne, un seul
// bouton principal par email, lisible sans les images (aucune image n'est utilisée).
import { ENV, SITE } from '../config.ts';

export interface MailLink { label: string; url: string }
export type MailBlock =
  | { type: 'p'; text: string }
  /** Chiffres clés (bilan) : libellé, valeur, évolution facultative (« +12 % »). */
  | { type: 'stats'; title?: string; rows: { label: string; value: string; trend?: string }[] }
  /** Tableau libellé / valeur (récapitulatif d'une demande, d'une formule). */
  | { type: 'facts'; rows: [string, string][] }
  | { type: 'list'; title?: string; items: string[] }
  /** Texte cité (message d'un client). */
  | { type: 'quote'; text: string }
  /** Encadré mis en avant (offre, rappel important). */
  | { type: 'note'; text: string; tone?: 'info' | 'warn' | 'ok' }
  | { type: 'button'; label: string; url: string; secondary?: boolean }
  | { type: 'h'; text: string };

export interface MailContent {
  /** Texte d'aperçu affiché après l'objet dans la boîte de réception. */
  preheader?: string;
  /** Titre affiché en haut de l'email. */
  title: string;
  /** Formule d'appel (« Bonjour Marie, »). */
  greeting?: string;
  blocks: MailBlock[];
  /** Bouton principal, en fin de contenu. */
  cta?: MailLink;
  /** Lien secondaire sous le bouton. */
  secondary?: MailLink;
  /** Pourquoi cet email (pied de page), et lien de désinscription éventuel. */
  reason?: string;
  unsubscribe?: MailLink;
}

const C = {
  bg: '#f5f0e8', card: '#fffdf9', text: '#1c1830', muted: '#6a6478', line: '#e0d8ca', accent: '#2321ac', accent2: '#3d63f2',
  soft: '#eeedfb', ok: '#e7f6ec', okText: '#14532d', warn: '#fdf3e2', warnText: '#7c4a03',
};
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Police en propriétés séparées (Outlook pour Windows lit mal le raccourci « font: ») et interligne fixe en px
 *  (mso-line-height-rule doit précéder line-height pour qu'Outlook l'applique). */
const font = (size: number, opts: { weight?: number; lh?: number; color?: string; italic?: boolean } = {}) =>
  `font-family:${FONT};font-size:${size}px;mso-line-height-rule:exactly;line-height:${Math.round(size * (opts.lh ?? 1.6))}px;`
  + `font-weight:${opts.weight ?? 400};${opts.italic ? 'font-style:italic;' : ''}color:${opts.color ?? C.text};`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // Typographie française : pas de retour à la ligne entre les guillemets et le texte, ni avant « : ; ! ? ».
  .replace(/« /g, '«&nbsp;').replace(/ »/g, '&nbsp;»').replace(/ ([:;!?])(?=\s|$)/g, '&nbsp;$1');
/** Texte simple vers HTML : échappé, retours à la ligne conservés, adresses web cliquables. */
const rich = (s: string) => esc(s)
  .replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" style="color:${C.accent};text-decoration:underline;word-break:break-all">${u}</a>`)
  .replace(/\n/g, '<br>');

const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';
/** Texte d'une cellule : un paragraphe sans marge (Outlook ajoute sinon un espacement sous le texte des cellules). */
const cell = (html: string, style: string) => `<p style="margin:0;${style}">${html}</p>`;
/** Espacement sous un bloc : porté par une cellule, car Outlook ignore les marges des tableaux. */
const spaced = (inner: string, bottom = 16, top = 0) =>
  `<table ${TABLE} width="100%"><tr><td style="padding:${top}px 0 ${bottom}px">${inner}</td></tr></table>`;
/** Encadré : un tableau d'une cellule (Outlook ignore la marge intérieure et le fond des <div>). */
const box = (inner: string, o: { bg: string; style?: string }) =>
  spaced(`<table ${TABLE} width="100%"><tr><td bgcolor="${o.bg}" style="background-color:${o.bg};${o.style ?? ''}">${inner}</td></tr></table>`);

/** Bouton : dessiné en VML pour Outlook pour Windows (taille et coins arrondis respectés, toute la surface cliquable),
 *  lien stylé ailleurs. */
function button(label: string, url: string, secondary = false) {
  const bg = secondary ? C.card : C.accent;
  const color = secondary ? C.accent : '#ffffff';
  const border = secondary ? C.line : C.accent;
  const width = Math.ceil(label.length * 8.6) + 48;
  const vml = `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(url)}" style="height:46px;v-text-anchor:middle;width:${width}px" arcsize="26%" strokecolor="${border}" strokeweight="1px" fillcolor="${bg}"><w:anchorlock/><center style="color:${color};font-family:Arial,sans-serif;font-size:15px;font-weight:bold">${esc(label)}</center></v:roundrect><![endif]-->`;
  const link = `<!--[if !mso]><!--><a href="${esc(url)}" style="display:inline-block;background-color:${bg};border:1px solid ${border};border-radius:12px;padding:13px 22px;${font(15, { weight: 600, lh: 1.2, color })}text-decoration:none">${esc(label)}</a><!--<![endif]-->`;
  return spaced(`${vml}${link}`, 18, 4);
}

function blockHtml(b: MailBlock): string {
  switch (b.type) {
    case 'p': return `<p style="margin:0 0 16px;${font(15)}">${rich(b.text)}</p>`;
    case 'h': return `<p style="margin:8px 0 10px;${font(16, { weight: 700, lh: 1.3 })}">${esc(b.text)}</p>`;
    case 'button': return button(b.label, b.url, b.secondary);
    case 'quote': return box(cell(rich(b.text), font(15, { italic: true })), { bg: C.bg, style: `border-left:3px solid ${C.accent2};padding:12px 16px` });
    case 'note': {
      const [bg, fg] = b.tone === 'warn' ? [C.warn, C.warnText] : b.tone === 'ok' ? [C.ok, C.okText] : [C.soft, C.accent];
      return box(cell(rich(b.text), font(14, { weight: 600, lh: 1.55, color: fg })), { bg, style: 'border-radius:12px;padding:14px 16px' });
    }
    case 'list': return spaced(`${b.title ? `<p style="margin:0 0 8px;${font(15, { weight: 700, lh: 1.4 })}">${esc(b.title)}</p>` : ''}<table ${TABLE} width="100%">${b.items.map((i) => `<tr><td valign="top" width="22" style="width:22px;padding:3px 0">${cell('&#10003;', font(15, { weight: 700, lh: 1.5, color: C.accent2 }))}</td><td valign="top" style="padding:3px 0">${cell(rich(i), font(15, { lh: 1.5 }))}</td></tr>`).join('')}</table>`);
    case 'facts': return spaced(`<table ${TABLE} width="100%" style="border:1px solid ${C.line};border-radius:12px;border-collapse:separate">${b.rows.map(([k, v], i) => {
      const bt = i ? `border-top:1px solid ${C.line};` : '';
      return `<tr><td valign="top" width="38%" style="padding:9px 14px;${bt}">${cell(esc(k), font(13, { lh: 1.5, color: C.muted }))}</td><td valign="top" style="padding:9px 14px;${bt}">${cell(rich(v), font(14, { weight: 600, lh: 1.45 }))}</td></tr>`;
    }).join('')}</table>`);
    case 'stats': return spaced(`${b.title ? `<p style="margin:4px 0 10px;${font(16, { weight: 700, lh: 1.3 })}">${esc(b.title)}</p>` : ''}<table ${TABLE} width="100%" style="border:1px solid ${C.line};border-radius:12px;border-collapse:separate">${b.rows.map((r, i) => {
      const t = r.trend ?? '';
      const tc = t.startsWith('+') ? '#15803d' : t.startsWith('-') ? '#b42318' : C.muted;
      const bt = i ? `border-top:1px solid ${C.line};` : '';
      return `<tr><td valign="middle" style="padding:9px 14px;${bt}">${cell(esc(r.label), font(14, { lh: 1.4 }))}</td><td valign="middle" align="right" style="padding:9px 6px;${bt}white-space:nowrap">${cell(esc(r.value), `${font(17, { weight: 700, lh: 1.2 })}text-align:right`)}</td><td valign="middle" align="right" width="64" style="width:64px;padding:9px 14px 9px 6px;${bt}white-space:nowrap">${cell(t ? esc(t) : '&nbsp;', `${font(12, { weight: 600, lh: 1.2, color: tc })}text-align:right`)}</td></tr>`;
    }).join('')}</table>`);
  }
}

function blockText(b: MailBlock): string {
  switch (b.type) {
    case 'p': return b.text;
    case 'h': return b.text.toUpperCase();
    case 'button': return `${b.label} : ${b.url}`;
    case 'quote': return b.text.split('\n').map((l) => `> ${l}`).join('\n');
    case 'note': return b.text;
    case 'list': return [b.title, ...b.items.map((i) => `- ${i}`)].filter(Boolean).join('\n');
    case 'facts': return b.rows.map(([k, v]) => `${k} : ${v}`).join('\n');
    case 'stats': return [b.title, ...b.rows.map((r) => `- ${r.label} : ${r.value}${r.trend ? ` (${r.trend})` : ''}`)].filter(Boolean).join('\n');
  }
}

/** Contenu structuré → { html, text }. */
export function renderMail(m: MailContent): { html: string; text: string } {
  const site = ENV.siteUrl;
  const host = site.replace(/^https?:\/\//, '');
  const footer = [m.reason, `${SITE.fullName} · ${host}`].filter(Boolean) as string[];

  const text = [
    m.title.toUpperCase(),
    m.greeting,
    ...m.blocks.map(blockText),
    m.cta && `${m.cta.label} : ${m.cta.url}`,
    m.secondary && `${m.secondary.label} : ${m.secondary.url}`,
    '—',
    ...footer,
    m.unsubscribe && `${m.unsubscribe.label} : ${m.unsubscribe.url}`,
  ].filter(Boolean).join('\n\n');

  const html = `<!doctype html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(m.title)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
<style>body,table,td,p,a,h1,center{font-family:Arial,Helvetica,sans-serif !important}table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${C.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
${m.preheader ? `<div style="display:none;mso-hide:all;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${esc(m.preheader)}${'&#8199;&#65279;&#847; '.repeat(40)}</div>` : ''}
<table ${TABLE} width="100%" bgcolor="${C.bg}" style="background-color:${C.bg}"><tr><td align="center" style="padding:28px 12px">
<!--[if mso]><table ${TABLE} width="600" align="center"><tr><td><![endif]-->
<table ${TABLE} width="100%" style="max-width:600px;margin:0 auto">
<tr><td style="padding:0 6px 16px;${font(18, { weight: 800, lh: 1.2, color: C.accent })}"><a href="${site}" style="color:${C.accent};text-decoration:none">${esc(SITE.fullName)}</a></td></tr>
<tr><td bgcolor="${C.card}" style="background-color:${C.card};border:1px solid ${C.line};border-radius:18px;overflow:hidden">
<table ${TABLE} width="100%">
<tr><td height="6" bgcolor="${C.accent}" style="height:6px;line-height:6px;font-size:6px;mso-line-height-rule:exactly;background-color:${C.accent};background-image:linear-gradient(90deg,${C.accent},${C.accent2});border-radius:18px 18px 0 0">&nbsp;</td></tr>
<tr><td style="padding:30px 32px 10px">
<h1 style="margin:0 0 18px;${font(23, { weight: 800, lh: 1.25 })}">${esc(m.title)}</h1>
${m.greeting ? `<p style="margin:0 0 16px;${font(15)}">${esc(m.greeting)}</p>` : ''}
${m.blocks.map(blockHtml).join('\n')}
${m.cta ? button(m.cta.label, m.cta.url) : ''}
${m.secondary ? `<p style="margin:0 0 16px;${font(14, { lh: 1.5 })}"><a href="${esc(m.secondary.url)}" style="color:${C.accent};text-decoration:underline">${esc(m.secondary.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:0 32px 26px;${font(13, { lh: 1.5, color: C.muted })}">L'équipe de l'${esc(SITE.fullName)}</td></tr>
</table></td></tr>
<tr><td align="center" style="padding:18px 10px 0;${font(12, { color: C.muted })}text-align:center">
${footer.map(esc).join('<br>')}
${m.unsubscribe ? `<br><a href="${esc(m.unsubscribe.url)}" style="color:${C.muted};text-decoration:underline">${esc(m.unsubscribe.label)}</a>` : ''}
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
  return { html, text };
}

/** Email écrit en texte simple (paragraphes séparés par une ligne vide) : même mise en page. */
export const fromText = (title: string, body: string): MailContent => ({
  title,
  blocks: body.split(/\n{2,}/).map((t) => ({ type: 'p' as const, text: t.trim() })).filter((b) => b.text),
});
