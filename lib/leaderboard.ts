import { getSupabase, multiplayerConfigured } from "./supabase";

export type ScoreMode = "solo" | "multi";

export type ScoreRow = {
  id: string;
  nick: string;
  total: number;
  rounds: number;
  mode: ScoreMode;
  /** total / rounds, computed by the database — the ranking key. */
  avg_round: number;
  created_at: string;
};

export type ScoreEntry = {
  nick: string;
  total: number;
  rounds: number;
  mode: ScoreMode;
};

/** Record a finished game. Fire-and-forget; no-op when Supabase is absent. */
export async function submitScore(entry: ScoreEntry): Promise<void> {
  if (!multiplayerConfigured()) return;
  try {
    await getSupabase().from("scores").insert(entry);
  } catch {
    // Leaderboard is best-effort — never break the results screen.
  }
}

/** Top players by average points per round for a mode. */
export async function fetchTop(
  mode: ScoreMode,
  limit = 10
): Promise<ScoreRow[]> {
  if (!multiplayerConfigured()) return [];
  const { data, error } = await getSupabase()
    .from("scores")
    .select("*")
    .eq("mode", mode)
    .order("avg_round", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ScoreRow[];
}
