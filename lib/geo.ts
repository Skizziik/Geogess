import type { LatLng } from "./types";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const MAX_SCORE = 5000;

/** GeoGuessr-style world scoring: 5000 at 0 km, exponential decay. */
export function scoreForDistance(distanceKm: number): number {
  if (distanceKm < 0.025) return MAX_SCORE;
  return Math.round(MAX_SCORE * Math.exp(-distanceKm / 1492.7));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString("en-US")} km`;
}

export function formatCoord(p: LatLng): string {
  const lat = `${Math.abs(p.lat).toFixed(4)}°${p.lat >= 0 ? "N" : "S"}`;
  const lng = `${Math.abs(p.lng).toFixed(4)}°${p.lng >= 0 ? "E" : "W"}`;
  return `${lat} ${lng}`;
}
