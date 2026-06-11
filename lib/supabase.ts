import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Accept both key formats: the legacy anon JWT and the new publishable key
 * (`sb_publishable_…`) that the Vercel marketplace integration injects.
 */
function publicKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function multiplayerConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && publicKey());
}

/**
 * Realtime-only Supabase client (presence + broadcast channels).
 * No database tables are used anywhere in the app.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = publicKey();
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
