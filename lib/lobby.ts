import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, LOBBY_CHANNEL } from "./supabase";
import { getPlayer } from "./player";
import type { RoomMeta } from "./types";

/**
 * One lobby channel per browser session, shared by every page.
 *
 * Joining the same realtime topic from two channel instances (lobby page +
 * room page) races their join/leave frames; a lost leave keeps a ghost room
 * advertised for as long as the socket lives. A single long-lived channel
 * can't race with itself, and keying presence by player id (not room id)
 * means one browser can never advertise more than one room.
 */

type Listener = (rooms: RoomMeta[], connected: boolean) => void;

let channel: RealtimeChannel | null = null;
let joined = false;
/** The room this browser currently advertises; re-tracked on every rejoin. */
let currentMeta: RoomMeta | null = null;
let rooms: RoomMeta[] = [];
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((l) => l(rooms, joined));
}

function ensureChannel(): RealtimeChannel {
  if (channel) return channel;
  channel = getSupabase().channel(LOBBY_CHANNEL, {
    config: { presence: { key: getPlayer().id } },
  });
  channel.on("presence", { event: "sync" }, () => {
    const state = channel!.presenceState<RoomMeta>();
    const seen = new Set<string>();
    rooms = (Object.values(state).flat() as RoomMeta[])
      .filter((r) => {
        if (!r.id || !r.name || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    notify();
  });
  channel.subscribe((status) => {
    joined = status === "SUBSCRIBED";
    if (joined && currentMeta) void channel!.track(currentMeta);
    notify();
  });
  return channel;
}

/** Subscribe to the live room list. Returns an unsubscribe function. */
export function watchLobby(listener: Listener): () => void {
  ensureChannel();
  listener(rooms, joined);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Advertise (or update) the room hosted by this browser. */
export function advertiseRoom(meta: RoomMeta): void {
  currentMeta = meta;
  const ch = ensureChannel();
  if (joined) void ch.track(meta);
}

/** Stop advertising this browser's room. */
export function withdrawRoom(): void {
  currentMeta = null;
  if (channel && joined) void channel.untrack();
}
