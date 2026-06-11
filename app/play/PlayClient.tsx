"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GameView from "@/components/GameView";
import SettingsForm from "@/components/SettingsForm";
import { pickLocations } from "@/lib/locations";
import { getPlayer } from "@/lib/player";
import {
  DEFAULT_SETTINGS,
  type GameLocation,
  type GameSettings,
  type PlayerInfo,
} from "@/lib/types";

type Stage = "setup" | "loading" | "play";

export default function PlayClient() {
  const router = useRouter();
  const [me, setMe] = useState<PlayerInfo | null>(null);
  const [stage, setStage] = useState<Stage>("setup");
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [locations, setLocations] = useState<GameLocation[]>([]);
  const [gameKey, setGameKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMe(getPlayer());
  }, []);

  async function startGame(s: GameSettings) {
    setError(null);
    setStage("loading");
    try {
      const locs = await pickLocations(s.rounds);
      setLocations(locs);
      setGameKey((k) => k + 1);
      setStage("play");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start the game");
      setStage("setup");
    }
  }

  if (stage === "play" && me) {
    return (
      <GameView
        key={gameKey}
        locations={locations}
        settings={settings}
        players={[me]}
        me={me}
        onExit={() => router.push("/")}
        exitLabel="Back home"
        onRestart={() => startGame(settings)}
        restartLabel="Play again"
      />
    );
  }

  return (
    <main className="graticule relative flex min-h-screen flex-col">
      <div className="vignette pointer-events-none absolute inset-0" />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="font-display text-xl tracking-tight">
          Geogess<span className="text-brass">.</span>
        </Link>
        <span className="label-caps">Solo expedition</span>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        {stage === "loading" ? (
          <div className="text-center">
            <p className="label-caps pulse-dot mb-3">Charting your route</p>
            <p className="font-mono text-sm text-paper-faint">
              snapping {settings.rounds} panoramas across the globe…
            </p>
          </div>
        ) : (
          <div className="panel-raised ticks w-full max-w-md p-8 fadeup">
            <p className="label-caps mb-1">Set the rules</p>
            <h1 className="mb-7 font-display text-4xl">Solo game</h1>

            <SettingsForm value={settings} onChange={setSettings} />

            {error && (
              <p className="mt-5 border border-signal/40 bg-signal/10 p-3 text-xs text-signal">
                {error}
              </p>
            )}

            <button
              onClick={() => startGame(settings)}
              className="btn btn-primary mt-7 w-full !py-3.5"
            >
              Drop me in
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
