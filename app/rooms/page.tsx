import type { Metadata } from "next";
import RoomsClient from "./RoomsClient";

export const metadata: Metadata = {
  title: "Multiplayer lobby — Geogess",
};

export default function RoomsPage() {
  return <RoomsClient />;
}
