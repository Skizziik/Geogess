import type { PlayerInfo } from "./types";

const STORAGE_KEY = "geogess:player";

const NICK_PARTS: [string[], string[]] = [
  ["Polar", "Dune", "Atlas", "Compass", "Meridian", "Tundra", "Basalt", "Monsoon", "Cedar", "Fjord"],
  ["Scout", "Drifter", "Pilot", "Nomad", "Cartographer", "Ranger", "Voyager", "Pathfinder", "Wanderer", "Surveyor"],
];

function randomNick(): string {
  const a = NICK_PARTS[0][Math.floor(Math.random() * NICK_PARTS[0].length)];
  const b = NICK_PARTS[1][Math.floor(Math.random() * NICK_PARTS[1].length)];
  return `${a} ${b}`;
}

export function getPlayer(): PlayerInfo {
  if (typeof window === "undefined") {
    return { id: "ssr", nick: "Player", hue: 40 };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlayerInfo;
      if (parsed.id && parsed.nick) return parsed;
    }
  } catch {
    // Corrupt storage — regenerate below.
  }
  const player: PlayerInfo = {
    id: crypto.randomUUID(),
    nick: randomNick(),
    hue: Math.floor(Math.random() * 360),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  return player;
}

export function savePlayer(player: PlayerInfo): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}

export function makeRoomId(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}
