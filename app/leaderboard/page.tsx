import type { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Leaderboard — Geogess",
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
