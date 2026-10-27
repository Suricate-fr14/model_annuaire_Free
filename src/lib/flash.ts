import type { AstroCookies } from 'astro';

export type Flash = { type: 'ok' | 'error' | 'info'; message: string };

/** Message affiché une seule fois après une redirection (motif POST → redirection → GET). */
export function flash(cookies: AstroCookies, type: Flash['type'], message: string) {
  cookies.set('flash', JSON.stringify({ type, message }), { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 });
}

export function readFlash(cookies: AstroCookies): Flash | null {
  const raw = cookies.get('flash')?.value;
  if (!raw) return null;
  cookies.delete('flash', { path: '/' });
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
