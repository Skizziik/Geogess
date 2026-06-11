"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StreetViewPane from "./StreetViewPane";
import GuessMap from "./GuessMap";
import ResultMap from "./ResultMap";
import Hud from "./Hud";
import {
  MAX_SCORE,
  formatDistance,
  haversineKm,
  scoreForDistance,
} from "@/lib/geo";
import { playerColor } from "@/lib/mapStyle";
import type { GameSettings, Guess, LatLng, PlayerInfo } from "@/lib/types";

const RESULT_SECONDS = 12;

type Phase = "intro" | "round" | "result" | "final";

type Props = {
  locations: LatLng[];
  settings: GameSettings;
  /** Live participant list — shrinks in multiplayer when someone leaves. */
  players: PlayerInfo[];
  me: PlayerInfo;
  multiplayer?: boolean;
  /** Epoch ms when round 1 opens (multiplayer synced countdown). */
  startAt?: number;
  /** Guesses received over the wire (may echo my own — deduped locally). */
  remoteGuesses?: Guess[];
  onMyGuess?: (g: Guess) => void;
  onExit: () => void;
  exitLabel: string;
  onRestart?: () => void;
  restartLabel?: string;
};

export default function GameView({
  locations,
  settings,
  players,
  me,
  multiplayer = false,
  startAt,
  remoteGuesses = [],
  onMyGuess,
  onExit,
  exitLabel,
  onRestart,
  restartLabel,
}: Props) {
  const [phase, setPhase] = useState<Phase>(() =>
    startAt && startAt > Date.now() ? "intro" : "round"
  );
  const [round, setRound] = useState(0);
  const [roundStartAt, setRoundStartAt] = useState(() =>
    Math.max(Date.now(), startAt ?? 0)
  );
  const [localGuesses, setLocalGuesses] = useState<Guess[]>([]);
  const [tick, setTick] = useState(0); // drives intro/result countdowns
  const resultEndsRef = useRef<number | null>(null);

  // Merge wire + local guesses; local copy wins on conflict.
  const allGuesses = useMemo(() => {
    const map = new Map<string, Guess>();
    for (const g of remoteGuesses) map.set(`${g.playerId}:${g.round}`, g);
    for (const g of localGuesses) map.set(`${g.playerId}:${g.round}`, g);
    return [...map.values()];
  }, [remoteGuesses, localGuesses]);

  const guessFor = useCallback(
    (playerId: string, r: number) =>
      allGuesses.find((g) => g.playerId === playerId && g.round === r),
    [allGuesses]
  );

  const myGuess = guessFor(me.id, round);
  const myTotal = useMemo(
    () =>
      allGuesses
        .filter((g) => g.playerId === me.id)
        .reduce((sum, g) => sum + g.score, 0),
    [allGuesses, me.id]
  );

  const totals = useMemo(() => {
    return players
      .map((p) => ({
        player: p,
        total: allGuesses
          .filter((g) => g.playerId === p.id)
          .reduce((s, g) => s + g.score, 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [players, allGuesses]);

  const deadline =
    phase === "round" && settings.timerSec !== null
      ? roundStartAt + settings.timerSec * 1000
      : null;

  const submitGuess = useCallback(
    (point: LatLng | null) => {
      if (guessFor(me.id, round)) return;
      const actual = locations[round];
      const distanceKm = point ? haversineKm(point, actual) : null;
      const guess: Guess = {
        playerId: me.id,
        round,
        point,
        distanceKm,
        score: distanceKm === null ? 0 : scoreForDistance(distanceKm),
        timeMs: Date.now() - roundStartAt,
      };
      setLocalGuesses((prev) => [...prev, guess]);
      onMyGuess?.(guess);
      if (!multiplayer) setPhase("result");
    },
    [guessFor, me.id, round, locations, roundStartAt, onMyGuess, multiplayer]
  );

  // Intro countdown → round.
  useEffect(() => {
    if (phase !== "intro") return;
    const t = setInterval(() => {
      setTick((v) => v + 1);
      if (startAt && Date.now() >= startAt) {
        setRoundStartAt(startAt);
        setPhase("round");
      }
    }, 250);
    return () => clearInterval(t);
  }, [phase, startAt]);

  // Multiplayer: close the round once every connected player has guessed.
  useEffect(() => {
    if (!multiplayer || phase !== "round" || players.length === 0) return;
    const everyone = players.every((p) => guessFor(p.id, round));
    if (everyone) setPhase("result");
  }, [multiplayer, phase, players, guessFor, round]);

  // Multiplayer: safety net — never hang more than 8s past the deadline.
  useEffect(() => {
    if (!multiplayer || phase !== "round" || deadline === null) return;
    const ms = deadline + 8000 - Date.now();
    const t = setTimeout(() => setPhase("result"), Math.max(0, ms));
    return () => clearTimeout(t);
  }, [multiplayer, phase, deadline]);

  // Result phase: multiplayer auto-advances on a shared countdown.
  useEffect(() => {
    if (phase !== "result") {
      resultEndsRef.current = null;
      return;
    }
    if (!multiplayer) return;
    resultEndsRef.current = Date.now() + RESULT_SECONDS * 1000;
    const t = setInterval(() => {
      setTick((v) => v + 1);
      if (resultEndsRef.current && Date.now() >= resultEndsRef.current) {
        advance();
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, multiplayer]);

  function advance() {
    if (round + 1 >= settings.rounds) {
      setPhase("final");
    } else {
      setRound((r) => r + 1);
      setRoundStartAt(Date.now());
      setPhase("round");
    }
  }

  const guessedCount = players.filter((p) => guessFor(p.id, round)).length;

  /* ---------- intro ---------- */
  if (phase === "intro" && startAt) {
    void tick;
    const seconds = Math.max(0, Math.ceil((startAt - Date.now()) / 1000));
    return (
      <div className="graticule fixed inset-0 z-40 grid place-items-center bg-ink-950">
        <div className="text-center">
          <p className="label-caps mb-4">Game starting</p>
          <p className="font-display text-8xl text-brass-bright">{seconds}</p>
        </div>
      </div>
    );
  }

  /* ---------- final ---------- */
  if (phase === "final") {
    const myRounds = locations.map((_, r) => guessFor(me.id, r));
    return (
      <div className="graticule fixed inset-0 z-40 overflow-y-auto bg-ink-950">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-6 py-12">
          <p className="label-caps fadeup mb-2 text-center">Final result</p>
          <h1 className="fadeup mb-1 text-center font-display text-6xl">
            {myTotal.toLocaleString("en-US")}
          </h1>
          <p className="fadeup mb-10 text-center text-sm text-paper-dim">
            out of {(MAX_SCORE * settings.rounds).toLocaleString("en-US")} points
          </p>

          {multiplayer && totals.length > 1 && (
            <div className="panel-raised fadeup mb-8 p-6">
              <p className="label-caps mb-4">Standings</p>
              <ol className="space-y-2">
                {totals.map(({ player, total }, i) => (
                  <li
                    key={player.id}
                    className={`flex items-center gap-3 border-b border-line pb-2 last:border-0 ${
                      player.id === me.id ? "text-brass-bright" : ""
                    }`}
                  >
                    <span className="w-6 font-mono text-sm text-paper-faint">
                      {i + 1}.
                    </span>
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: playerColor(player.hue) }}
                    />
                    <span className="flex-1 truncate text-sm">{player.nick}</span>
                    <span className="font-mono text-sm">
                      {total.toLocaleString("en-US")}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="panel fadeup mb-10 divide-y divide-line">
            {myRounds.map((g, r) => (
              <div key={r} className="flex items-center gap-4 px-5 py-3 text-sm">
                <span className="label-caps w-20">Round {r + 1}</span>
                <span className="flex-1 font-mono text-paper-dim">
                  {g?.distanceKm != null ? formatDistance(g.distanceKm) : "no guess"}
                </span>
                <span className="font-mono text-brass-bright">
                  {(g?.score ?? 0).toLocaleString("en-US")}
                </span>
              </div>
            ))}
          </div>

          <div className="fadeup flex justify-center gap-3">
            {onRestart && (
              <button onClick={onRestart} className="btn btn-primary">
                {restartLabel ?? "Play again"}
              </button>
            )}
            <button onClick={onExit} className="btn">
              {exitLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- result ---------- */
  if (phase === "result") {
    void tick;
    const actual = locations[round];
    const markers = players.map((p) => {
      const g = guessFor(p.id, round);
      return { point: g?.point ?? null, nick: p.nick, hue: p.hue };
    });
    const mine = guessFor(me.id, round);
    const secondsLeft = resultEndsRef.current
      ? Math.max(0, Math.ceil((resultEndsRef.current - Date.now()) / 1000))
      : null;

    return (
      <div className="fixed inset-0 z-40 bg-ink-950">
        <ResultMap actual={actual} markers={markers} />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-4">
          <div className="panel-raised px-6 py-2.5 text-center">
            <p className="label-caps">
              Round {round + 1} of {settings.rounds}
            </p>
          </div>
        </div>

        {multiplayer && totals.length > 1 && (
          <div className="panel-raised absolute right-4 top-4 z-10 w-64 p-4">
            <p className="label-caps mb-3">Standings</p>
            <ol className="space-y-1.5">
              {totals.map(({ player, total }, i) => (
                <li
                  key={player.id}
                  className={`flex items-center gap-2 text-sm ${
                    player.id === me.id ? "text-brass-bright" : ""
                  }`}
                >
                  <span className="w-4 font-mono text-xs text-paper-faint">
                    {i + 1}
                  </span>
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: playerColor(player.hue) }}
                  />
                  <span className="flex-1 truncate">{player.nick}</span>
                  <span className="font-mono text-xs">
                    {total.toLocaleString("en-US")}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-6">
          <div className="panel-raised fadeup w-[min(34rem,calc(100vw-2rem))] p-6 text-center">
            {mine?.distanceKm != null ? (
              <>
                <p className="font-display text-5xl text-brass-bright">
                  {mine.score.toLocaleString("en-US")}
                  <span className="ml-2 text-lg text-paper-faint">pts</span>
                </p>
                <p className="mt-2 text-sm text-paper-dim">
                  Your guess landed{" "}
                  <span className="font-mono text-paper">
                    {formatDistance(mine.distanceKm)}
                  </span>{" "}
                  from the location.
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-5xl text-signal">0</p>
                <p className="mt-2 text-sm text-paper-dim">
                  Time ran out before you placed a pin.
                </p>
              </>
            )}
            <div className="mt-4 h-1.5 w-full bg-ink-700">
              <div
                key={round}
                className="scorebar-fill h-full bg-brass"
                style={{ width: `${((mine?.score ?? 0) / MAX_SCORE) * 100}%` }}
              />
            </div>
            <div className="mt-5">
              {multiplayer ? (
                <p className="label-caps">
                  {round + 1 >= settings.rounds ? "Final results" : "Next round"} in{" "}
                  <span className="font-mono text-brass-bright">{secondsLeft}s</span>
                </p>
              ) : (
                <button onClick={advance} className="btn btn-primary w-full">
                  {round + 1 >= settings.rounds ? "See final results" : "Next round"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- round ---------- */
  return (
    <div className="fixed inset-0 z-40 bg-ink-950">
      <StreetViewPane location={locations[round]} moveMode={settings.moveMode} />
      <Hud
        round={round}
        totalRounds={settings.rounds}
        totalScore={myTotal}
        deadline={deadline}
        onExpire={() => submitGuess(null)}
      />
      <button
        onClick={onExit}
        className="btn btn-danger absolute right-4 top-4 z-30 bg-ink-950/80 !px-4 !py-2 text-xs backdrop-blur"
      >
        Quit
      </button>

      {!myGuess && (
        <GuessMap
          round={round}
          hue={me.hue}
          disabled={Boolean(myGuess)}
          onSubmit={submitGuess}
        />
      )}

      {multiplayer && myGuess && (
        <div className="absolute inset-x-0 bottom-8 z-30 flex justify-center">
          <div className="panel-raised px-6 py-4 text-center">
            <p className="label-caps pulse-dot">
              Guess locked — waiting for players
            </p>
            <p className="mt-1 font-mono text-sm text-paper-dim">
              {guessedCount} / {players.length} guessed
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
