"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Layer } from "leaflet";
import "leaflet/dist/leaflet.css";
import { playerColor, BRASS, INK } from "@/lib/colors";
import { TILE_URL, TILE_ATTRIBUTION } from "./GuessMap";
import type { LatLng } from "@/lib/types";

export type ResultMarker = {
  point: LatLng | null;
  nick: string;
  hue: number;
};

type Props = {
  actual: LatLng;
  markers: ResultMarker[];
};

export default function ResultMap({ actual, markers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlaysRef = useRef<Layer[]>([]);
  const sigRef = useRef("");

  useEffect(() => {
    // Redraw only when the content really changed — parent re-renders
    // (e.g. countdown ticks) must not reset the user's pan/zoom.
    const sig = JSON.stringify({ actual, markers });
    if (sig === sigRef.current) return;
    sigRef.current = sig;
    let cancelled = false;
    void import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          center: [actual.lat, actual.lng],
          zoom: 3,
          minZoom: 2,
          zoomControl: true,
          worldCopyJump: true,
        });
        L.tileLayer(TILE_URL, {
          attribution: TILE_ATTRIBUTION,
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(mapRef.current);
      }
      const map = mapRef.current;
      overlaysRef.current.forEach((o) => o.remove());
      overlaysRef.current = [];

      const bounds = L.latLngBounds([[actual.lat, actual.lng]]);

      const actualIcon = L.divIcon({
        className: "",
        html: `<div style="font-size:26px;line-height:1;color:${BRASS};text-shadow:0 0 3px ${INK},0 0 6px ${INK};transform:translate(-50%,-55%);position:absolute;">★</div>`,
        iconSize: [0, 0],
      });
      overlaysRef.current.push(
        L.marker([actual.lat, actual.lng], {
          icon: actualIcon,
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindTooltip("Actual location")
      );

      for (const m of markers) {
        if (!m.point) continue;
        bounds.extend([m.point.lat, m.point.lng]);
        overlaysRef.current.push(
          L.circleMarker([m.point.lat, m.point.lng], {
            radius: 8,
            color: INK,
            weight: 2,
            fillColor: playerColor(m.hue),
            fillOpacity: 1,
          })
            .addTo(map)
            .bindTooltip(m.nick),
          L.polyline(
            [
              [m.point.lat, m.point.lng],
              [actual.lat, actual.lng],
            ],
            {
              color: playerColor(m.hue),
              weight: 2,
              opacity: 0.7,
              dashArray: "2 10",
            }
          ).addTo(map)
        );
      }

      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 12 });
    });
    return () => {
      cancelled = true;
    };
  }, [actual, markers]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // z-0 starts a stacking context so Leaflet's internal z-indexes (up to
  // ~1000) can't paint over sibling UI panels.
  return <div ref={containerRef} className="absolute inset-0 z-0 bg-ink-900" />;
}
