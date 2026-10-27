// Vidéos YouTube des fiches Premium : on n'enregistre que l'identifiant de la vidéo (11 caractères).
export const MAX_VIDEOS = 4;

/** Identifiant YouTube extrait d'un lien (watch, youtu.be, shorts, embed, live) ou d'un identifiant collé seul. */
export function youtubeId(raw: string): string | null {
  const s = raw.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let id = '';
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/)?.[1] ?? '';
  }
  return /^[\w-]{11}$/.test(id) ? id : null;
}

export const youtubeUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
/** Lecteur sans cookie de suivi, chargé seulement au clic. */
export const youtubeEmbed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
