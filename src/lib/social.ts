// Réseaux sociaux proposés sur les fiches : saisie libre (URL ou @identifiant), normalisée et vérifiée.

export interface Network {
  key: string;
  label: string;
  hosts: string[];
  /** Construit l'URL à partir d'un @identifiant. */
  fromHandle?: (h: string) => string;
  placeholder: string;
}

export const NETWORKS: Network[] = [
  { key: 'facebook', label: 'Facebook', hosts: ['facebook.com', 'fb.com', 'fb.me'], fromHandle: (h) => `https://www.facebook.com/${h}`, placeholder: 'https://www.facebook.com/votrepage' },
  { key: 'instagram', label: 'Instagram', hosts: ['instagram.com'], fromHandle: (h) => `https://www.instagram.com/${h}`, placeholder: '@votrecompte' },
  { key: 'linkedin', label: 'LinkedIn', hosts: ['linkedin.com'], placeholder: 'https://www.linkedin.com/company/…' },
  { key: 'x', label: 'X (Twitter)', hosts: ['x.com', 'twitter.com'], fromHandle: (h) => `https://x.com/${h}`, placeholder: '@votrecompte' },
  { key: 'tiktok', label: 'TikTok', hosts: ['tiktok.com'], fromHandle: (h) => `https://www.tiktok.com/@${h}`, placeholder: '@votrecompte' },
  { key: 'youtube', label: 'YouTube', hosts: ['youtube.com', 'youtu.be'], fromHandle: (h) => `https://www.youtube.com/@${h}`, placeholder: '@votrechaine' },
  { key: 'pinterest', label: 'Pinterest', hosts: ['pinterest.com', 'pinterest.fr'], fromHandle: (h) => `https://www.pinterest.fr/${h}`, placeholder: '@votrecompte' },
  { key: 'threads', label: 'Threads', hosts: ['threads.net', 'threads.com'], fromHandle: (h) => `https://www.threads.net/@${h}`, placeholder: '@votrecompte' },
  { key: 'snapchat', label: 'Snapchat', hosts: ['snapchat.com'], fromHandle: (h) => `https://www.snapchat.com/add/${h}`, placeholder: '@votrecompte' },
  { key: 'whatsapp', label: 'WhatsApp', hosts: ['wa.me', 'whatsapp.com'], placeholder: '06 12 34 56 78 ou https://wa.me/…' },
];

export type Socials = Record<string, string>;

const hostOk = (url: URL, hosts: string[]) =>
  hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));

/** Renvoie l'URL normalisée, ou une erreur lisible. */
export function normalizeSocial(net: Network, raw: string): { url?: string; error?: string } {
  let v = raw.trim();
  if (!v) return {};
  if (net.key === 'whatsapp' && /^[+\d][\d\s.-]{7,}$/.test(v)) {
    let digits = v.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `33${digits.slice(1)}`;
    return { url: `https://wa.me/${digits}` };
  }
  if (v.startsWith('@') && net.fromHandle) {
    const handle = v.slice(1);
    if (!/^[\w.-]{1,60}$/.test(handle)) return { error: `${net.label} : identifiant invalide.` };
    return { url: net.fromHandle(handle) };
  }
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (!hostOk(u, net.hosts)) return { error: `${net.label} : l'adresse doit être sur ${net.hosts[0]}.` };
    u.protocol = 'https:';
    return { url: u.href };
  } catch {
    return { error: `${net.label} : adresse invalide.` };
  }
}

export function socialsFromForm(form: FormData): { socials: Socials; errors: string[] } {
  const socials: Socials = {};
  const errors: string[] = [];
  for (const net of NETWORKS) {
    const { url, error } = normalizeSocial(net, String(form.get(`s_${net.key}`) ?? ''));
    if (error) errors.push(error);
    else if (url) socials[net.key] = url;
  }
  return { socials, errors };
}
