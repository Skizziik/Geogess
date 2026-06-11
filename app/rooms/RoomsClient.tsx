"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SettingsForm from "@/components/SettingsForm";
import { multiplayerConfigured } from "@/lib/supabase";
import { watchLobby } from "@/lib/lobby";
import { getPlayer, savePlayer, makeRoomId } from "@/lib/player";
import {
  DEFAULT_SETTINGS,
  type GameSettings,
  type PlayerInfo,
  type RoomMeta,
} from "@/lib/types";

export default function RoomsClient() {
  const router = useRouter();
  const [me, setMe] = useState<PlayerInfo | null>(null);
  const [nickDraft, setNickDraft] = useState("");
  const [rooms, setRooms] = useState<RoomMeta[]>([]);
  const [connected, setConnected] = useState(false);
  const [creating, setCreating] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [joinCode, setJoinCode] = useState("");
  const configured = multiplayerConfigured();

  useEffect(() => {
    const p = getPlayer();
    setMe(p);
    setNickDraft(p.nick);
  }, []);

  // Watch the lobby: every open room is a presence entry tracked by its host.
  useEffect(() => {
    if (!configured) return;
    return watchLobby((list, joined) => {
      setRooms(list);
      setConnected(joined);
    });
  }, [configured]);

  function commitNick() {
    if (!me) return;
    const nick = nickDraft.trim().slice(0, 24) || me.nick;
    const updated = { ...me, nick };
    setMe(updated);
    setNickDraft(nick);
    savePlayer(updated);
  }

  function createRoom() {
    if (!me) return;
    commitNick();
    const id = makeRoomId();
    const name = roomName.trim().slice(0, 32) || `${nickDraft.trim() || me.nick}'s room`;
    sessionStorage.setItem(
      `geogess:create:${id}`,
      JSON.stringify({ name, settings })
    );
    router.push(`/room/${id}`);
  }

  function joinByCode() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    commitNick();
    router.push(`/room/${code}`);
  }

  const openRooms = useMemo(() => rooms.filter((r) => r.status === "waiting"), [rooms]);
  const liveRooms = useMemo(() => rooms.filter((r) => r.status === "playing"), [rooms]);

  if (!configured) {
    return (
      <main className="graticule relative flex min-h-screen items-center justify-center px-4">
        <div className="panel-raised ticks max-w-lg p-8 text-center">
          <p className="label-caps mb-2">Multiplayer offline</p>
          <h1 className="mb-4 font-display text-3xl">Realtime is not configured</h1>
          <p className="text-sm leading-relaxed text-paper-dim">
            Set <span className="font-mono text-paper">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
            <span className="font-mono text-paper">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to
            enable rooms. Solo mode works without it — see the README for the
            two-minute setup.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/play" className="btn btn-primary">Play solo</Link>
            <Link href="/" className="btn">Home</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="graticule relative min-h-screen">
      <div className="vignette pointer-events-none fixed inset-0" />
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="font-display text-xl tracking-tight">
          Geogess<span className="text-brass">.</span>
        </Link>
        <span className="label-caps flex items-center gap-2">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              connected ? "bg-pine" : "bg-signal pulse-dot"
            }`}
          />
          {connected ? "lobby live" : "connecting"}
        </span>
      </header>

      <div className="relative z-10 mx-auto grid w-full max-w-5xl gap-6 px-4 pb-16 md:grid-cols-[1fr_minmax(0,1.4fr)] md:px-10">
        {/* Left column — identity + create + join by code */}
        <div className="space-y-6">
          <section className="panel p-6">
            <p className="label-caps mb-3">Call sign</p>
            <div className="flex gap-2">
              <input
                className="input"
                value={nickDraft}
                maxLength={24}
                onChange={(e) => setNickDraft(e.target.value)}
                onBlur={commitNick}
                onKeyDown={(e) => e.key === "Enter" && commitNick()}
                placeholder="Your nickname"
              />
            </div>
            <p className="mt-2 text-xs text-paper-faint">
              This is the name other players will see.
            </p>
          </section>

          <section className="panel-raised ticks p-6">
            <p className="label-caps mb-1">Host a game</p>
            <h2 className="mb-5 font-display text-2xl">Create a room</h2>
            {creating ? (
              <div className="space-y-5 fadeup">
                <input
                  className="input"
                  value={roomName}
                  maxLength={32}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder={`${nickDraft || "Player"}'s room`}
                  autoFocus
                />
                <SettingsForm value={settings} onChange={setSettings} />
                <div className="flex gap-2">
                  <button onClick={createRoom} className="btn btn-primary flex-1">
                    Open room
                  </button>
                  <button onClick={() => setCreating(false)} className="btn">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setCreating(true)} className="btn btn-primary w-full">
                New room
              </button>
            )}
          </section>

          <section className="panel p-6">
            <p className="label-caps mb-3">Join by code</p>
            <div className="flex gap-2">
              <input
                className="input font-mono uppercase tracking-[0.3em]"
                value={joinCode}
                maxLength={6}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && joinByCode()}
                placeholder="ABC123"
              />
              <button onClick={joinByCode} className="btn">Join</button>
            </div>
          </section>
        </div>

        {/* Right column — live room list */}
        <section className="panel min-h-[24rem] p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Open rooms</h2>
            <span className="font-mono text-xs text-paper-faint">
              {openRooms.length} waiting · {liveRooms.length} in game
            </span>
          </div>

          {openRooms.length === 0 && liveRooms.length === 0 && (
            <div className="grid h-64 place-items-center text-center">
              <div>
                <p className="label-caps mb-2">{connected ? "No rooms yet" : "Connecting…"}</p>
                <p className="text-sm text-paper-faint">
                  {connected
                    ? "Create one and it will appear here for everyone."
                    : "Reaching the lobby."}
                </p>
              </div>
            </div>
          )}

          <ul className="space-y-2">
            {openRooms.map((room) => (
              <li key={room.id} className="fadeup">
                <button
                  onClick={() => {
                    commitNick();
                    router.push(`/room/${room.id}`);
                  }}
                  className="group flex w-full items-center gap-4 border border-line bg-ink-850 px-5 py-4 text-left transition-colors hover:border-brass"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium group-hover:text-brass-bright">
                      {room.name}
                    </p>
                    <p className="mt-0.5 text-xs text-paper-faint">
                      host {room.hostNick} · {room.settings.rounds} rounds ·{" "}
                      {room.settings.timerSec ? `${room.settings.timerSec}s` : "no timer"} ·{" "}
                      {room.settings.moveMode === "move"
                        ? "moving"
                        : room.settings.moveMode === "no-move"
                          ? "no move"
                          : "NMPZ"}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-paper-dim">
                    {room.players} {room.players === 1 ? "player" : "players"}
                  </span>
                  <span className="label-caps text-brass">join →</span>
                </button>
              </li>
            ))}
            {liveRooms.map((room) => (
              <li
                key={room.id}
                className="flex w-full items-center gap-4 border border-line px-5 py-4 opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{room.name}</p>
                  <p className="mt-0.5 text-xs text-paper-faint">host {room.hostNick}</p>
                </div>
                <span className="label-caps pulse-dot">in game</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
