"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import GameView from "@/components/GameView";
import SettingsForm from "@/components/SettingsForm";
import { playerColor } from "@/lib/mapStyle";
import { loadGoogleMaps } from "@/lib/maps";
import { pickLocations } from "@/lib/locations";
import { getPlayer } from "@/lib/player";
import {
  getSupabase,
  multiplayerConfigured,
  roomChannelName,
  LOBBY_CHANNEL,
} from "@/lib/supabase";
import {
  DEFAULT_SETTINGS,
  type GameSettings,
  type Guess,
  type PlayerInfo,
  type RoomMeta,
  type RoomPresence,
  type RoomStatus,
  type StartPayload,
} from "@/lib/types";

const COUNTDOWN_MS = 4000;

export default function RoomClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomId = (params.id ?? "").toUpperCase();

  const [me, setMe] = useState<PlayerInfo | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [createdAt] = useState(() => Date.now());
  const [status, setStatus] = useState<RoomStatus>("waiting");
  const [members, setMembers] = useState<RoomPresence[]>([]);
  const [connected, setConnected] = useState(false);
  const [start, setStart] = useState<StartPayload | null>(null);
  const [remoteGuesses, setRemoteGuesses] = useState<Guess[]>([]);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const lobbyRef = useRef<RealtimeChannel | null>(null);
  const [sawHost, setSawHost] = useState(false);
  const hostStateRef = useRef({ roomName: "", settings: DEFAULT_SETTINGS, status: "waiting" as RoomStatus });

  // Resolve identity + host role (the creator stashed config in sessionStorage).
  useEffect(() => {
    const p = getPlayer();
    setMe(p);
    const raw = sessionStorage.getItem(`geogess:create:${roomId}`);
    if (raw) {
      try {
        const cfg = JSON.parse(raw) as { name: string; settings: GameSettings };
        setIsHost(true);
        setRoomName(cfg.name);
        setSettings(cfg.settings);
        hostStateRef.current = { roomName: cfg.name, settings: cfg.settings, status: "waiting" };
      } catch {
        sessionStorage.removeItem(`geogess:create:${roomId}`);
      }
    }
  }, [roomId]);

  const hostPresence = useMemo(
    () => members.find((m) => m.isHost && m.id !== me?.id),
    [members, me?.id]
  );

  // Guests mirror the host's room config.
  useEffect(() => {
    if (isHost || !hostPresence) return;
    if (hostPresence.roomName) setRoomName(hostPresence.roomName);
    if (hostPresence.settings) setSettings(hostPresence.settings);
    if (hostPresence.status) setStatus(hostPresence.status);
  }, [isHost, hostPresence]);

  const trackPresence = useCallback(async () => {
    const ch = channelRef.current;
    if (!ch || !me) return;
    const payload: RoomPresence = isHost
      ? {
          ...me,
          isHost: true,
          roomName: hostStateRef.current.roomName,
          settings: hostStateRef.current.settings,
          status: hostStateRef.current.status,
          createdAt,
        }
      : { ...me, isHost: false };
    await ch.track(payload);
  }, [me, isHost, createdAt]);

  // Join the room channel.
  useEffect(() => {
    if (!me || !multiplayerConfigured()) return;
    const supabase = getSupabase();
    const ch = supabase.channel(roomChannelName(roomId), {
      config: { presence: { key: me.id }, broadcast: { self: false } },
    });
    channelRef.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<RoomPresence>();
      const list = Object.values(state).flat() as RoomPresence[];
      setMembers(list);
      if (list.some((m) => m.isHost)) setSawHost(true);
    });
    ch.on("broadcast", { event: "start" }, ({ payload }) => {
      setRemoteGuesses([]);
      setStart(payload as StartPayload);
      setStatus("playing");
    });
    ch.on("broadcast", { event: "guess" }, ({ payload }) => {
      setRemoteGuesses((prev) => [...prev, payload as Guess]);
    });
    ch.on("broadcast", { event: "lobby-return" }, () => {
      setStatus("waiting");
      setStart(null);
      setRemoteGuesses([]);
    });
    ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED") {
        setConnected(true);
        await trackPresence();
      }
    });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, roomId]);

  // Host: advertise the room in the public lobby and keep it fresh.
  useEffect(() => {
    if (!isHost || !me || !multiplayerConfigured()) return;
    const supabase = getSupabase();
    if (!lobbyRef.current) {
      lobbyRef.current = supabase.channel(LOBBY_CHANNEL, {
        config: { presence: { key: roomId } },
      });
      lobbyRef.current.subscribe();
    }
    const lobby = lobbyRef.current;
    const meta: RoomMeta = {
      id: roomId,
      name: roomName || `${me.nick}'s room`,
      hostNick: me.nick,
      players: Math.max(1, members.length),
      settings,
      status,
      createdAt,
    };
    const t = setTimeout(() => {
      if (lobby.state === "joined") void lobby.track(meta);
    }, 300);
    return () => clearTimeout(t);
  }, [isHost, me, roomId, roomName, settings, status, members.length, createdAt]);

  useEffect(() => {
    return () => {
      if (lobbyRef.current) {
        getSupabase().removeChannel(lobbyRef.current);
        lobbyRef.current = null;
      }
    };
  }, []);

  // Host: push config changes to my presence so guests see them live.
  useEffect(() => {
    if (!isHost) return;
    hostStateRef.current = { roomName, settings, status };
    if (channelRef.current?.state === "joined") void trackPresence();
  }, [isHost, roomName, settings, status, trackPresence]);

  const hostGone =
    !isHost && connected && sawHost && !hostPresence && status === "waiting";

  async function launchGame() {
    if (!me || launching) return;
    setLaunching(true);
    setError(null);
    try {
      const g = await loadGoogleMaps();
      const locations = await pickLocations(g, settings.rounds);
      const payload: StartPayload = {
        locations,
        settings,
        startAt: Date.now() + COUNTDOWN_MS,
        roster: members.map((m) => m.id),
      };
      await channelRef.current?.send({
        type: "broadcast",
        event: "start",
        payload,
      });
      setRemoteGuesses([]);
      setStart(payload);
      setStatus("playing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start the game");
    } finally {
      setLaunching(false);
    }
  }

  function backToRoom() {
    setStart(null);
    setRemoteGuesses([]);
    setStatus("waiting");
    if (isHost) {
      void channelRef.current?.send({ type: "broadcast", event: "lobby-return", payload: {} });
    }
  }

  function copyCode() {
    void navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  /* ---------- guards ---------- */

  if (!multiplayerConfigured()) {
    return (
      <Shell>
        <Notice title="Realtime is not configured">
          Multiplayer needs Supabase env vars. See the README, or{" "}
          <Link href="/play" className="text-brass underline">play solo</Link>.
        </Notice>
      </Shell>
    );
  }

  if (!me) return <Shell />;

  /* ---------- in game ---------- */

  if (start && status === "playing") {
    const roster = members
      .filter((m) => start.roster.includes(m.id))
      .map((m) => ({ id: m.id, nick: m.nick, hue: m.hue }));
    const iAmPlaying = start.roster.includes(me.id);
    if (iAmPlaying) {
      return (
        <GameView
          locations={start.locations}
          settings={start.settings}
          players={roster.length ? roster : [me]}
          me={me}
          multiplayer
          startAt={start.startAt}
          remoteGuesses={remoteGuesses}
          onMyGuess={(guess) =>
            void channelRef.current?.send({ type: "broadcast", event: "guess", payload: guess })
          }
          onExit={() => router.push("/rooms")}
          exitLabel="Leave room"
          onRestart={backToRoom}
          restartLabel="Back to room"
        />
      );
    }
  }

  /* ---------- joined while a match is running ---------- */

  if (status === "playing") {
    return (
      <Shell>
        <Notice title="Match in progress">
          <span className="pulse-dot label-caps mb-2 block">round underway</span>
          A game is currently being played in this room. Hang tight — the room
          reopens as soon as it ends.
          <div className="mt-6">
            <Link href="/rooms" className="btn">Back to lobby</Link>
          </div>
        </Notice>
      </Shell>
    );
  }

  /* ---------- host left ---------- */

  if (hostGone) {
    return (
      <Shell>
        <Notice title="The host closed this room">
          <div className="mt-6">
            <Link href="/rooms" className="btn btn-primary">Find another room</Link>
          </div>
        </Notice>
      </Shell>
    );
  }

  /* ---------- waiting room ---------- */

  return (
    <Shell>
      <div className="relative z-10 mx-auto grid w-full max-w-4xl gap-6 px-4 pb-16 md:grid-cols-[1.2fr_1fr] md:px-8">
        <section className="panel-raised ticks p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="label-caps mb-1">Waiting room</p>
              <h1 className="truncate font-display text-3xl">
                {roomName || "Unnamed room"}
              </h1>
            </div>
            <button
              onClick={copyCode}
              className="btn shrink-0 !px-4 !py-2 font-mono !text-sm !tracking-[0.25em]"
              title="Copy room code"
            >
              {copied ? "copied" : roomId}
            </button>
          </div>

          <p className="label-caps mb-3">
            Players · {members.length || 1}
          </p>
          <ul className="mb-8 space-y-2">
            {(members.length ? members : [{ ...me, isHost }]).map((m) => (
              <li key={m.id} className="flex items-center gap-3 border-b border-line pb-2">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-ink-950"
                  style={{ background: playerColor(m.hue) }}
                >
                  {m.nick.slice(0, 1).toUpperCase()}
                </span>
                <span className="flex-1 truncate text-sm">
                  {m.nick}
                  {m.id === me.id && <span className="text-paper-faint"> (you)</span>}
                </span>
                {m.isHost && <span className="label-caps text-brass">host</span>}
              </li>
            ))}
          </ul>

          {isHost ? (
            <>
              {error && (
                <p className="mb-4 border border-signal/40 bg-signal/10 p-3 text-xs text-signal">
                  {error}
                </p>
              )}
              <button
                onClick={launchGame}
                disabled={launching || !connected}
                className="btn btn-primary w-full !py-3.5"
              >
                {launching ? "Charting locations…" : "Start game"}
              </button>
              <p className="mt-3 text-center text-xs text-paper-faint">
                Everyone in the room drops into the same {settings.rounds} locations.
              </p>
            </>
          ) : (
            <p className="label-caps pulse-dot text-center">
              waiting for the host to start
            </p>
          )}
        </section>

        <section className="panel h-fit p-7">
          <p className="label-caps mb-4">Match settings</p>
          {isHost ? (
            <SettingsForm value={settings} onChange={setSettings} />
          ) : (
            <dl className="space-y-3 text-sm">
              <SettingRow label="Rounds" value={String(settings.rounds)} />
              <SettingRow
                label="Time per round"
                value={settings.timerSec ? `${settings.timerSec}s` : "No limit"}
              />
              <SettingRow
                label="Movement"
                value={
                  settings.moveMode === "move"
                    ? "Free"
                    : settings.moveMode === "no-move"
                      ? "No move"
                      : "NMPZ"
                }
              />
            </dl>
          )}
          <div className="mt-8 border-t border-line pt-5">
            <Link href="/rooms" className="btn btn-danger w-full">
              Leave room
            </Link>
          </div>
        </section>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="graticule relative min-h-screen">
      <div className="vignette pointer-events-none fixed inset-0" />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="font-display text-xl tracking-tight">
          Geogess<span className="text-brass">.</span>
        </Link>
        <Link href="/rooms" className="label-caps transition-colors hover:text-paper">
          ← lobby
        </Link>
      </header>
      {children}
    </main>
  );
}

function Notice({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="relative z-10 flex justify-center px-4 pt-20">
      <div className="panel-raised ticks max-w-lg p-8 text-center">
        <h1 className="mb-4 font-display text-3xl">{title}</h1>
        <div className="text-sm leading-relaxed text-paper-dim">{children}</div>
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-2">
      <dt className="label-caps">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
