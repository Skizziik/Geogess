"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  round: number;
  totalRounds: number;
  totalScore: number;
  /** Epoch ms when the round closes; null = no timer. */
  deadline: number | null;
  onExpire: () => void;
};

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Hud({ round, totalRounds, totalScore, deadline, onExpire }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    expiredRef.current = false;
  }, [deadline, round]);

  useEffect(() => {
    if (deadline === null) return;
    const t = setInterval(() => {
      const ts = Date.now();
      setNow(ts);
      if (ts >= deadline && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
    }, 200);
    return () => clearInterval(t);
  }, [deadline]);

  const remaining = deadline === null ? null : deadline - now;
  const urgent = remaining !== null && remaining < 10_000;

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2">
      <div className="panel-raised flex items-stretch divide-x divide-line text-center">
        <div className="px-5 py-2.5">
          <p className="label-caps">Round</p>
          <p className="font-mono text-lg leading-tight">
            {round + 1}<span className="text-paper-faint">/{totalRounds}</span>
          </p>
        </div>
        <div className="px-5 py-2.5">
          <p className="label-caps">Score</p>
          <p className="font-mono text-lg leading-tight text-brass-bright">
            {totalScore.toLocaleString("en-US")}
          </p>
        </div>
        {remaining !== null && (
          <div className="px-5 py-2.5">
            <p className="label-caps">Time</p>
            <p
              className={`font-mono text-lg leading-tight ${
                urgent ? "text-signal" : ""
              } ${urgent && remaining < 5_000 ? "pulse-dot" : ""}`}
            >
              {formatRemaining(remaining)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
