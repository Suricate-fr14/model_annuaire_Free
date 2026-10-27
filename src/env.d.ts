/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: import('./lib/auth').User | null;
    flash: { type: 'ok' | 'error' | 'info'; message: string } | null;
    /** Événements dataLayer mis en file avant une redirection (lib/analytics). */
    events: import('./lib/analytics').TrackEvent[];
  }
}
