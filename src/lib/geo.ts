// Géocodage via la Géoplateforme IGN (Base Adresse Nationale), gratuit et sans clé.
export async function geocode(q: string): Promise<{ lat: number; lng: number; street: string; postcode: string; city: string } | null> {
  if (q.trim().length < 3) return null;
  try {
    const res = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&limit=1`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const f = (await res.json()).features?.[0];
    if (!f || f.properties.score < 0.4) return null;
    const [lng, lat] = f.geometry.coordinates;
    return { lat, lng, street: f.properties.name, postcode: f.properties.postcode, city: f.properties.city };
  } catch {
    return null;
  }
}

/** Commune officielle (nom et code postal BAN) à partir d'un nom saisi, éventuellement aidé du code postal. */
/**
 * Commune officielle d'après un nom saisi. Renvoie la commune, `null` si le service confirme qu'elle n'existe pas,
 * ou `undefined` si le service ne répond pas (lenteur, panne) : dans ce cas, la saisie ne doit pas être bloquée.
 */
export async function findMunicipality(name: string, postcode = ''): Promise<{ city: string; postcode: string } | null | undefined> {
  if (name.trim().length < 2) return null;
  const qs = new URLSearchParams({ q: name, type: 'municipality', limit: '1' });
  if (/^\d{5}$/.test(postcode)) qs.set('postcode', postcode);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://data.geopf.fr/geocodage/search?${qs}`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const f = (await res.json()).features?.[0];
      if (!f || f.properties.score < 0.5) return null;
      return { city: f.properties.city ?? f.properties.name, postcode: f.properties.postcode ?? '' };
    } catch {
      // nouvel essai, puis « service indisponible »
    }
  }
  return undefined;
}

/** Commune contenant un point (API Découpage administratif) : fonctionne même loin de toute adresse. */
export async function communeAt(lat: number, lng: number): Promise<{ city: string; postcode: string } | null> {
  try {
    const res = await fetch(`https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lng}&fields=nom,codesPostaux`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const c = (await res.json())[0];
    return c?.nom ? { city: c.nom, postcode: c.codesPostaux?.[0] ?? '' } : null;
  } catch {
    return null;
  }
}

/** Commune officielle à partir de coordonnées : adresse la plus proche, sinon commune contenant le point. */
export async function cityAt(lat: number, lng: number): Promise<{ city: string; postcode: string } | null> {
  try {
    const res = await fetch(`https://data.geopf.fr/geocodage/reverse?lat=${lat}&lon=${lng}&limit=1`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const p = (await res.json()).features?.[0]?.properties;
      if (p?.city) return { city: p.city, postcode: p.postcode ?? '' };
    }
  } catch {}
  return communeAt(lat, lng);
}

/** Carte Google Maps intégrée à partir des coordonnées (sans clé d'API). */
export const mapEmbedUrl = (lat: number, lng: number, zoom = 16) =>
  `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&hl=fr&output=embed`;
export const directionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
export const mapsSearchUrl = (name: string, lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=&center=${lat},${lng}`;
