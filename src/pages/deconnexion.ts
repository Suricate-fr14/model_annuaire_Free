import type { APIRoute } from 'astro';
import { endSession } from '../lib/auth';
import { flash } from '../lib/flash';

export const POST: APIRoute = ({ cookies, redirect }) => {
  endSession(cookies);
  flash(cookies, 'info', 'Vous êtes déconnecté.');
  return redirect('/');
};
