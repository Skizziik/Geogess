export type LatLng = { lat: number; lng: number };

export type MoveMode = "move" | "no-move" | "nmpz";

export type GameSettings = {
  rounds: number;
  /** Seconds per round; null = no time limit. */
  timerSec: number | null;
  moveMode: MoveMode;
};

export const DEFAULT_SETTINGS: GameSettings = {
  rounds: 5,
  timerSec: null,
  moveMode: "move",
};

export type PlayerInfo = {
  id: string;
  nick: string;
  /** Hue 0-360 used for the player's marker and avatar. */
  hue: number;
};

export type Guess = {
  playerId: string;
  round: number;
  /** null = round timed out before the player placed a pin. */
  point: LatLng | null;
  distanceKm: number | null;
  score: number;
  timeMs: number;
};

export type RoomStatus = "waiting" | "playing";

export type RoomMeta = {
  id: string;
  name: string;
  hostNick: string;
  players: number;
  settings: GameSettings;
  status: RoomStatus;
  createdAt: number;
};

export type StartPayload = {
  locations: LatLng[];
  settings: GameSettings;
  /** Epoch ms when round 1 opens (gives everyone a synced countdown). */
  startAt: number;
  /** Player ids that are part of this match (late joiners spectate). */
  roster: string[];
};

/** What each member tracks as presence inside a room channel. */
export type RoomPresence = PlayerInfo & {
  isHost: boolean;
  /** Host-only fields so late joiners learn the room config. */
  roomName?: string;
  settings?: GameSettings;
  status?: RoomStatus;
  createdAt?: number;
};
