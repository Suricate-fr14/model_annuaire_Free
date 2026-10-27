import type { AstroCookies } from 'astro';
import { get, run } from './db';
import { hashPassword, verifyPassword, randomToken, sha256 } from './crypto';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  disabled: number;
  created_at: string;
}

const COOKIE = 'sid';
const SESSION_DAYS = 30;
const isProd = () => (import.meta as any).env?.PROD === true;

export const isAdmin = (u: User | null | undefined) => u?.role === 'admin';

export function createUser(email: string, password: string, name: string, role: 'user' | 'admin' = 'user') {
  const r = run(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
    email.trim().toLowerCase(), hashPassword(password), name.trim(), role,
  );
  return Number(r.lastInsertRowid);
}

export const findUserByEmail = (email: string) =>
  get<User & { password_hash: string }>('SELECT * FROM users WHERE email = ?', email.trim().toLowerCase());

export function checkCredentials(email: string, password: string): User | null {
  const u = findUserByEmail(email);
  // Vérification même si l'utilisateur n'existe pas, pour ne pas révéler l'existence d'un compte par le temps de réponse.
  const ok = verifyPassword(password, u?.password_hash ?? 'scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '==');
  if (!u || !ok || u.disabled) return null;
  return u;
}

export function startSession(cookies: AstroCookies, userId: number) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', sha256(token), userId, expires.toISOString());
  run("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", userId);
  cookies.set(COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', secure: isProd(), expires });
}

export function endSession(cookies: AstroCookies) {
  const token = cookies.get(COOKIE)?.value;
  if (token) run('DELETE FROM sessions WHERE token_hash = ?', sha256(token));
  cookies.delete(COOKIE, { path: '/' });
}

export function userFromCookies(cookies: AstroCookies): User | null {
  const token = cookies.get(COOKIE)?.value;
  if (!token) return null;
  const u = get<User>(
    `SELECT u.id, u.email, u.name, u.role, u.disabled, u.created_at FROM sessions s
     JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`,
    sha256(token), new Date().toISOString(),
  );
  return u && !u.disabled ? u : null;
}

export const revokeSessions = (userId: number) => run('DELETE FROM sessions WHERE user_id = ?', userId);

export function setPassword(userId: number, password: string) {
  run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(password), userId);
}

export function createPasswordReset(userId: number) {
  const token = randomToken();
  run('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    sha256(token), userId, new Date(Date.now() + 3600e3).toISOString());
  return token;
}

export function consumePasswordReset(token: string): number | null {
  const row = get<{ user_id: number }>(
    'SELECT user_id FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > ?',
    sha256(token), new Date().toISOString(),
  );
  if (!row) return null;
  run('UPDATE password_resets SET used = 1 WHERE token_hash = ?', sha256(token));
  return row.user_id;
}

export const passwordProblem = (p: string) =>
  p.length < 10 ? 'Le mot de passe doit contenir au moins 10 caractères.' : null;

// --- Limitation de débit en mémoire (connexion, inscription, formulaires publics) ---
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

export const clientIp = (request: Request, fallback = 'local') =>
  request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || fallback;

/**
 * Chemin de retour après connexion ou inscription (?next=…) : uniquement une page du site.
 * Refuse les adresses externes, y compris les formes détournées (« //site », « /\site », caractères de contrôle).
 */
export function safeNext(next: string | null, fallback: string) {
  if (!next || !next.startsWith('/') || /[\\\u0000-\u001f]/.test(next)) return fallback;
  try {
    const u = new URL(next, 'http://annuaire.invalid');
    return u.origin === 'http://annuaire.invalid' ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}
