import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function multiplayerConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Realtime-only Supabase client (presence + broadcast channels).
 * No database tables are used anywhere in the app.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Supabase env vars are not configured");
    }
    client = createClient(url, key, {
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }
  return client;
}

export const LOBBY_CHANNEL = "geogess:lobby";

export function roomChannelName(roomId: string): string {
  return `geogess:room:${roomId}`;
}
