let loader: Promise<typeof google> | null = null;

export function hasMapsKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
}

/** Load the Google Maps JS API once and share the instance. */
export function loadGoogleMaps(): Promise<typeof google> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google Maps can only load in the browser"));
      return;
    }
    if (window.google?.maps) {
      resolve(window.google);
      return;
    }
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set"));
      return;
    }
    const callbackName = "__geogessMapsReady";
    (window as unknown as Record<string, unknown>)[callbackName] = () =>
      resolve(window.google);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&v=weekly&loading=async&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      loader = null;
      reject(new Error("Failed to load Google Maps JS API"));
    };
    document.head.appendChild(script);
  });
  return loader;
}
