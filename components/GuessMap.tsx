"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps";
import { MAP_STYLE, guessPinIcon } from "@/lib/mapStyle";
import { formatCoord } from "@/lib/geo";
import type { LatLng } from "@/lib/types";

type Props = {
  round: number;
  hue: number;
  disabled: boolean;
  onSubmit: (point: LatLng) => void;
};

export default function GuessMap({ round, hue, disabled, onSubmit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const googleRef = useRef<typeof google | null>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [locked, setLocked] = useState(false);

  const placePin = useCallback(
    (point: LatLng) => {
      const g = googleRef.current;
      const map = mapRef.current;
      if (!g || !map) return;
      if (!markerRef.current) {
        markerRef.current = new g.maps.Marker({
          map,
          position: point,
          icon: guessPinIcon(g, hue),
        });
      } else {
        markerRef.current.setPosition(point);
        markerRef.current.setMap(map);
      }
      setPin(point);
    },
    [hue]
  );

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((g) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      googleRef.current = g;
      const map = new g.maps.Map(containerRef.current, {
        center: { lat: 18, lng: 8 },
        zoom: 1,
        styles: MAP_STYLE,
        backgroundColor: "#0a0d12",
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        minZoom: 1,
        draggableCursor: "crosshair",
        keyboardShortcuts: false,
      });
      mapRef.current = map;
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        placePin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [placePin]);

  // New round: clear the pin and zoom back out.
  useEffect(() => {
    setPin(null);
    markerRef.current?.setMap(null);
    mapRef.current?.setCenter({ lat: 18, lng: 8 });
    mapRef.current?.setZoom(1);
  }, [round]);

  // Tell the map its viewport changed after the expand/collapse transition.
  useEffect(() => {
    const t = setTimeout(() => {
      const g = googleRef.current;
      if (g && mapRef.current) g.maps.event.trigger(mapRef.current, "resize");
    }, 320);
    return () => clearTimeout(t);
  }, [expanded]);

  const open = expanded || locked;

  return (
    <div
      className={`pointer-events-auto absolute bottom-5 right-5 z-30 flex flex-col transition-all duration-300 ${
        open
          ? "h-[min(24rem,55vh)] w-[min(36rem,calc(100vw-2.5rem))]"
          : "h-44 w-64 opacity-90"
      }`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <button
          onClick={() => setLocked((v) => !v)}
          className="label-caps bg-ink-950/80 px-2 py-1 backdrop-blur transition-colors hover:text-paper"
          title={locked ? "Unpin map size" : "Keep map open"}
        >
          {locked ? "◉ pinned" : "○ pin map"}
        </button>
        {pin && (
          <span className="bg-ink-950/80 px-2 py-1 font-mono text-[10px] text-paper-dim backdrop-blur">
            {formatCoord(pin)}
          </span>
        )}
      </div>
      <div className="ticks relative flex-1 border border-line-strong">
        <div ref={containerRef} className="absolute inset-0" />
      </div>
      <button
        onClick={() => pin && onSubmit(pin)}
        disabled={!pin || disabled}
        className="btn btn-primary mt-1.5 w-full !py-3"
      >
        {pin ? "Make your guess" : "Place a pin on the map"}
      </button>
    </div>
  );
}
