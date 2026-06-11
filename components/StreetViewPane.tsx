"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps";
import type { LatLng, MoveMode } from "@/lib/types";

type Props = {
  location: LatLng;
  moveMode: MoveMode;
};

export default function StreetViewPane({ location, moveMode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const startRef = useRef<{ position: LatLng; heading: number }>({
    position: location,
    heading: 0,
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canMove = moveMode === "move";
  const frozen = moveMode === "nmpz";

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        const heading = Math.floor(Math.random() * 360);
        startRef.current = { position: location, heading };
        const pano = new g.maps.StreetViewPanorama(containerRef.current, {
          position: location,
          pov: { heading, pitch: 0 },
          zoom: frozen ? 0.6 : 1,
          addressControl: false,
          showRoadLabels: false,
          fullscreenControl: false,
          motionTracking: false,
          motionTrackingControl: false,
          panControl: false,
          zoomControl: !frozen,
          scrollwheel: !frozen,
          disableDoubleClickZoom: frozen,
          linksControl: canMove,
          clickToGo: canMove,
          enableCloseButton: false,
        });
        panoRef.current = pano;
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
      panoRef.current = null;
    };
    // The panorama is created once; location changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const pano = panoRef.current;
    if (!pano || !ready) return;
    const heading = Math.floor(Math.random() * 360);
    startRef.current = { position: location, heading };
    pano.setPosition(location);
    pano.setPov({ heading, pitch: 0 });
    pano.setZoom(frozen ? 0.6 : 1);
  }, [location, ready, frozen]);

  function returnToStart() {
    const pano = panoRef.current;
    if (!pano) return;
    pano.setPosition(startRef.current.position);
    pano.setPov({ heading: startRef.current.heading, pitch: 0 });
  }

  if (error) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-ink-950 p-8 text-center">
        <div className="max-w-md">
          <p className="label-caps mb-3">Street View unavailable</p>
          <p className="text-sm text-paper-dim">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" />
      {frozen && <div className="absolute inset-0 z-10" aria-hidden />}
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-ink-950">
          <p className="label-caps pulse-dot">Dropping you in…</p>
        </div>
      )}
      {canMove && ready && (
        <button
          onClick={returnToStart}
          className="btn absolute left-4 top-4 z-20 bg-ink-950/80 !px-4 !py-2 text-xs backdrop-blur"
          title="Return to the starting position"
        >
          ⌖ Start
        </button>
      )}
    </div>
  );
}
