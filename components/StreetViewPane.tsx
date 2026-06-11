"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { panoEmbedSrc, panoHeading } from "@/lib/pano";
import type { GameLocation, MoveMode } from "@/lib/types";

type Props = {
  location: GameLocation;
  moveMode: MoveMode;
};

/**
 * Keyless Street View: Google's public embed iframe.
 * The iframe is taller than the container and shifted up so the
 * address card in the top-left corner stays out of sight.
 */
const OVERFLOW_PX = 300;
const SHIFT_PX = 285;

export default function StreetViewPane({ location, moveMode }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  const src = useMemo(
    () => panoEmbedSrc(location, panoHeading(location)),
    [location]
  );

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  function returnToStart() {
    // Re-assigning src reloads the iframe at the original panorama.
    if (iframeRef.current) {
      setLoaded(false);
      iframeRef.current.src = src;
    }
  }

  const frozen = moveMode === "nmpz";

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink-950">
      <iframe
        ref={iframeRef}
        src={src}
        onLoad={() => setLoaded(true)}
        referrerPolicy="no-referrer-when-downgrade"
        allow="accelerometer; gyroscope"
        className={`absolute left-0 w-full border-0 transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        style={{
          top: -SHIFT_PX,
          height: `calc(100% + ${OVERFLOW_PX}px)`,
          backgroundColor: "#07090c",
        }}
        title="Street view panorama"
      />
      {frozen && <div className="absolute inset-0 z-10" aria-hidden />}
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center bg-ink-950">
          <p className="label-caps pulse-dot">Dropping you in…</p>
        </div>
      )}
      {!frozen && loaded && (
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
