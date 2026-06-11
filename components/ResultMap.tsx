"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/maps";
import { MAP_STYLE, actualLocationIcon, guessPinIcon, playerColor } from "@/lib/mapStyle";
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
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<(google.maps.Marker | google.maps.Polyline)[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((g) => {
      if (cancelled || !containerRef.current) return;
      if (!mapRef.current) {
        mapRef.current = new g.maps.Map(containerRef.current, {
          center: actual,
          zoom: 3,
          styles: MAP_STYLE,
          backgroundColor: "#0a0d12",
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          keyboardShortcuts: false,
        });
      }
      const map = mapRef.current;
      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];

      const bounds = new g.maps.LatLngBounds();
      bounds.extend(actual);

      overlaysRef.current.push(
        new g.maps.Marker({
          map,
          position: actual,
          icon: actualLocationIcon(g),
          title: "Actual location",
          zIndex: 100,
        })
      );

      for (const m of markers) {
        if (!m.point) continue;
        bounds.extend(m.point);
        overlaysRef.current.push(
          new g.maps.Marker({
            map,
            position: m.point,
            icon: guessPinIcon(g, m.hue),
            title: m.nick,
          }),
          new g.maps.Polyline({
            map,
            path: [m.point, actual],
            geodesic: true,
            strokeOpacity: 0,
            icons: [
              {
                icon: {
                  path: "M 0,-1 0,1",
                  strokeOpacity: 0.7,
                  strokeColor: playerColor(m.hue),
                  scale: 2,
                },
                offset: "0",
                repeat: "12px",
              },
            ],
          })
        );
      }

      map.fitBounds(bounds, 80);
    });
    return () => {
      cancelled = true;
    };
  }, [actual, markers]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
