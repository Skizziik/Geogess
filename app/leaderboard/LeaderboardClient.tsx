"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTop, type ScoreMode, type ScoreRow } from "@/lib/leaderboard";
import { multiplayerConfigured } from "@/lib/supabase";

const MODES: { value: ScoreMode; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "multi", label: "Multiplayer" },
];

export default function LeaderboardClient() {
  const [mode, setMode] = useState<ScoreMode>("solo");
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const configured = multiplayerConfigured();

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    setRows(null);
    setError(null);
    fetchTop(mode)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, configured]);

  return (
    <main className="graticule relative min-h-screen">
      <div className="vignette pointer-events-none fixed inset-0" />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="font-display text-xl tracking-tight">
          Geogess<span className="text-brass">.</span>
        </Link>
        <Link href="/" className="label-caps transition-colors hover:text-paper">
          ← home
        </Link>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-20 pt-6 md:px-8">
        <p className="label-caps fadeup mb-1">Top 10 · points per round</p>
        <h1 className="fadeup mb-7 font-display text-4xl">Leaderboard</h1>

        <div className="seg fadeup mb-6 max-w-xs">
          {MODES.map((m) => (
            <button
              key={m.value}
              data-active={mode === m.value}
              onClick={() => setMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <section className="panel-raised ticks fadeup min-h-[20rem] p-6">
          {!configured ? (
            <p className="py-12 text-center text-sm text-paper-dim">
              The leaderboard needs Supabase env vars — see the README.
            </p>
          ) : error ? (
            <p className="py-12 text-center text-sm text-signal">{error}</p>
          ) : rows === null ? (
            <p className="label-caps pulse-dot py-12 text-center">
              Charting the rankings…
            </p>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="label-caps mb-2">No expeditions logged yet</p>
              <p className="text-sm text-paper-faint">
                Finish a {mode === "solo" ? "solo" : "multiplayer"} game and your
                result lands here.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-line">
              {rows.map((row, i) => (
                <li key={row.id} className="flex items-center gap-4 px-1 py-3">
                  <span
                    className={`w-8 text-center font-mono text-sm ${
                      i === 0 ? "text-brass-bright" : "text-paper-faint"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {row.nick}
                  </span>
                  <span className="hidden text-right font-mono text-xs text-paper-faint sm:block">
                    {row.total.toLocaleString("en-US")} pts · {row.rounds} rds
                  </span>
                  <span
                    className={`w-20 text-right font-mono text-base ${
                      i === 0 ? "text-brass-bright" : "text-paper"
                    }`}
                  >
                    {Math.round(row.avg_round).toLocaleString("en-US")}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <p className="mt-3 text-right font-mono text-[11px] text-paper-faint">
          ranked by average points per round · max 5,000
        </p>
      </div>
    </main>
  );
}
