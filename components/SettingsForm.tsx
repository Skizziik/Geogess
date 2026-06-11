"use client";

import type { GameSettings, MoveMode } from "@/lib/types";

const ROUND_OPTIONS = [3, 5, 10];
const TIMER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "No limit" },
  { value: 30, label: "0:30" },
  { value: 60, label: "1:00" },
  { value: 120, label: "2:00" },
  { value: 300, label: "5:00" },
];
const MOVE_OPTIONS: { value: MoveMode; label: string; hint: string }[] = [
  { value: "move", label: "Move", hint: "Walk, pan and zoom freely" },
  { value: "no-move", label: "No move", hint: "Look around, but stay put" },
  { value: "nmpz", label: "NMPZ", hint: "No move, no pan, no zoom" },
];

type Props = {
  value: GameSettings;
  onChange: (s: GameSettings) => void;
};

export default function SettingsForm({ value, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <p className="label-caps mb-2">Rounds</p>
        <div className="seg">
          {ROUND_OPTIONS.map((r) => (
            <button
              key={r}
              data-active={value.rounds === r}
              onClick={() => onChange({ ...value, rounds: r })}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="label-caps mb-2">Time per round</p>
        <div className="seg">
          {TIMER_OPTIONS.map((t) => (
            <button
              key={String(t.value)}
              data-active={value.timerSec === t.value}
              onClick={() => onChange({ ...value, timerSec: t.value })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="label-caps mb-2">Movement</p>
        <div className="seg">
          {MOVE_OPTIONS.map((m) => (
            <button
              key={m.value}
              data-active={value.moveMode === m.value}
              onClick={() => onChange({ ...value, moveMode: m.value })}
              title={m.hint}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-paper-faint">
          {MOVE_OPTIONS.find((m) => m.value === value.moveMode)?.hint}
        </p>
      </div>
    </div>
  );
}
