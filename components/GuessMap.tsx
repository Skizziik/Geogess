"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, CircleMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { playerColor, INK } from "@/lib/colors";
import { formatCoord } from "@/lib/geo";
import type { LatLng } from "@/lib/types";

export const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

type Props = {
  round: number;
  hue: number;
  disabled: boolean;
  onSubmit: (point: LatLng) => void;
};

export default function GuessMap({ round, hue, disabled, onSubmit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        center: [18, 8],
        zoom: 1,
        minZoom: 1,
        zoomControl: true,
        worldCopyJump: true,
        attributionControl: true,
      });
      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (e) => {
        const point = { lat: e.latlng.lat, lng: wrapLng(e.latlng.lng) };
        if (!markerRef.current) {
          markerRef.current = L.circleMarker(e.latlng, {
            radius: 8,
            color: INK,
            weight: 2,
            fillColor: playerColor(hue),
            fillOpacity: 1,
          }).addTo(map);
        } else {
          markerRef.current.setLatLng(e.latlng);
          markerRef.current.addTo(map);
        }
        setPin(point);
      });
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // The map is created once; hue only affects new pins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New round: clear the pin and zoom back out.
  useEffect(() => {
    setPin(null);
    markerRef.current?.remove();
    mapRef.current?.setView([18, 8], 1);
  }, [round]);

  // Tell the map its viewport changed after the expand/collapse transition.
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 320);
    return () => clearTimeout(t);
  }, [expanded, locked]);

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
      <div className="ticks relative flex-1 border border-line-strong bg-ink-900">
        <div ref={containerRef} className="absolute inset-0 cursor-crosshair" />
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
