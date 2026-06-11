import type { GameLocation } from "./types";

/**
 * Street View without an API key or billing account.
 *
 * Panorama lookup uses Google's public GeoPhotoService endpoint (the same
 * one google.com/maps itself calls), and display uses the public keyless
 * embed iframe (the same code Google hands out via "Share → Embed a map").
 */

let jsonpCounter = 0;

type JsonpWindow = Window & Record<string, unknown>;

function parsePanoResponse(data: unknown): GameLocation | null {
  try {
    // Shape: [[0], [[1], [2, "<panoId>"], ..., [[[1], [[null,null,lat,lng], ...]]]]]
    const root = data as unknown[];
    const body = root?.[1] as unknown[] | undefined;
    if (!body) return null;
    const panoId = (body?.[1] as unknown[] | undefined)?.[1];
    const coords = (
      ((body?.[5] as unknown[])?.[0] as unknown[])?.[1] as unknown[]
    )?.[0] as unknown[] | undefined;
    const lat = coords?.[2];
    const lng = coords?.[3];
    if (typeof panoId === "string" && typeof lat === "number" && typeof lng === "number") {
      return { lat, lng, panoId };
    }
    // Fallback: fish the panorama id out of the raw payload.
    const match = JSON.stringify(data).match(/\[2,"([A-Za-z0-9_-]{20,24})"\]/);
    if (match && typeof lat === "number" && typeof lng === "number") {
      return { lat, lng, panoId: match[1] };
    }
    return null;
  } catch {
    return null;
  }
}

/** Find the official panorama closest to a point, within `radiusM` meters. */
export function findPano(
  lat: number,
  lng: number,
  radiusM = 10000
): Promise<GameLocation | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    const w = window as unknown as JsonpWindow;
    const cbName = `__geogessPano${jsonpCounter++}`;
    const script = document.createElement("script");
    let settled = false;

    const finish = (result: GameLocation | null) => {
      if (settled) return;
      settled = true;
      delete w[cbName];
      script.remove();
      resolve(result);
    };

    const timeout = setTimeout(() => finish(null), 8000);
    w[cbName] = (data: unknown) => {
      clearTimeout(timeout);
      finish(parsePanoResponse(data));
    };
    const pb =
      `!1m5!1sapiv3!5sUS!11m2!1m1!1b0!2m4!1m2!3d${lat}!4d${lng}!2d${radiusM}` +
      `!3m10!2m2!1sen!2sGB!9m1!1e2!11m4!1m3!1e2!2b1!3e2!4m10!1e1!1e2!1e3!1e4!1e8!1e6!5m1!1e2!6m1!1e2`;
    script.src = `https://maps.googleapis.com/maps/api/js/GeoPhotoService.SingleImageSearch?pb=${pb}&callback=${cbName}`;
    script.onerror = () => {
      clearTimeout(timeout);
      finish(null);
    };
    document.head.appendChild(script);
  });
}

/**
 * Deterministic per-location starting heading, so every player in a
 * multiplayer round faces the same way.
 */
export function panoHeading(loc: GameLocation): number {
  const key = loc.panoId ?? `${loc.lat},${loc.lng}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

/** Keyless street view embed URL for a resolved panorama. */
export function panoEmbedSrc(loc: GameLocation, headingDeg: number): string {
  if (loc.panoId) {
    const pb =
      `!4v1!6m8!1m7!1s${loc.panoId}` +
      `!2m2!1d${loc.lat}!2d${loc.lng}!3f${headingDeg}!4f0!5f0.7820865974627469`;
    return `https://www.google.com/maps/embed?pb=${pb}`;
  }
  // Legacy keyless fallback when only coordinates are known.
  return `https://maps.google.com/maps?layer=c&cbll=${loc.lat},${loc.lng}&cbp=11,${headingDeg},0,0,0&output=svembed`;
}
