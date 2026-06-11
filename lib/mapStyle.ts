/** Dark cartographic style shared by the guess map and result map. */
export const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#10141a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9b937f" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#07090c" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2a3340" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#c2b89e" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c232c" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0d12" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4d5868" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#11161d" }] },
];

export function playerColor(hue: number): string {
  return `hsl(${hue} 65% 62%)`;
}

export function guessPinIcon(g: typeof google, hue: number): google.maps.Symbol {
  return {
    path: "M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z",
    fillColor: playerColor(hue),
    fillOpacity: 1,
    strokeColor: "#07090c",
    strokeWeight: 1.5,
    scale: 1,
    anchor: new g.maps.Point(0, 0),
  };
}

export function actualLocationIcon(g: typeof google): google.maps.Symbol {
  return {
    path: "M 0 -28 L 6.5 -8.5 L 27 -8.5 L 10.5 4 L 16.5 24 L 0 11.5 L -16.5 24 L -10.5 4 L -27 -8.5 L -6.5 -8.5 Z",
    fillColor: "#c9a14a",
    fillOpacity: 1,
    strokeColor: "#07090c",
    strokeWeight: 1.5,
    scale: 0.55,
    anchor: new g.maps.Point(0, 0),
  };
}
