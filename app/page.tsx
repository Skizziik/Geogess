import Link from "next/link";

function CompassRose() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-full w-full"
      fill="none"
      aria-hidden
    >
      <circle cx="100" cy="100" r="96" stroke="currentColor" strokeOpacity="0.25" />
      <circle cx="100" cy="100" r="72" stroke="currentColor" strokeOpacity="0.18" />
      <circle cx="100" cy="100" r="3" fill="currentColor" />
      {Array.from({ length: 72 }).map((_, i) => {
        const a = (i * 5 * Math.PI) / 180;
        const long = i % 18 === 0;
        const r1 = long ? 82 : 90;
        return (
          <line
            key={i}
            x1={100 + r1 * Math.sin(a)}
            y1={100 - r1 * Math.cos(a)}
            x2={100 + 96 * Math.sin(a)}
            y2={100 - 96 * Math.cos(a)}
            stroke="currentColor"
            strokeOpacity={long ? 0.6 : 0.25}
          />
        );
      })}
      <path d="M100 18 L106 100 L100 110 L94 100 Z" fill="currentColor" fillOpacity="0.8" />
      <path d="M100 182 L94 100 L100 90 L106 100 Z" fill="currentColor" fillOpacity="0.25" />
      <text x="100" y="14" textAnchor="middle" fontSize="11" fill="currentColor" fontFamily="monospace">N</text>
    </svg>
  );
}

const MECHANICS = [
  {
    title: "Read the world",
    body: "Dropped at street level somewhere on Earth. Road signs, plates, language, sun, vegetation — everything is a clue.",
  },
  {
    title: "Pin your guess",
    body: "Open the map, commit to a point. Up to 5,000 points per round — the closer the pin, the steeper the reward.",
  },
  {
    title: "Set the rules",
    body: "3 to 10 rounds, optional round timers, and movement restrictions up to full NMPZ for purists.",
  },
  {
    title: "Bring rivals",
    body: "Host a room, watch it appear in the public lobby, and drop everyone into the same five locations at once.",
  },
];

export default function Home() {
  return (
    <main className="graticule relative min-h-screen overflow-hidden">
      <div className="vignette pointer-events-none absolute inset-0" />

      {/* deco compass */}
      <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 text-brass opacity-[0.15] md:opacity-25">
        <CompassRose />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <span className="font-display text-xl tracking-tight">
          Geogess<span className="text-brass">.</span>
        </span>
        <div className="flex items-center gap-6">
          <Link
            href="/leaderboard"
            className="label-caps transition-colors hover:text-brass-bright md:hidden"
          >
            Leaderboard
          </Link>
          <span className="hidden font-mono text-xs text-paper-faint md:block">
            EST. 2026 · FIELD ATLAS DIVISION
          </span>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-16 md:grid md:grid-cols-[8.5rem_1fr] md:gap-12 md:px-10 md:pt-24">
        <nav className="fadeup mb-10 hidden md:block md:pt-2" aria-label="Site index">
          <p className="label-caps mb-5 text-paper-faint">Index</p>
          <ul className="space-y-4 border-l border-line pl-4">
            {[
              { n: "01", label: "Solo", href: "/play" },
              { n: "02", label: "Multiplayer", href: "/rooms" },
              { n: "03", label: "Leaderboard", href: "/leaderboard" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="label-caps block transition-colors hover:text-brass-bright"
                >
                  <span className="mr-2 font-mono text-brass">{item.n}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
        <p className="label-caps fadeup mb-5">A street-level geography game</p>
        <h1
          className="fadeup max-w-3xl font-display text-6xl leading-[0.95] tracking-tight md:text-8xl"
          style={{ animationDelay: "60ms" }}
        >
          Where in the world are you<span className="text-brass">?</span>
        </h1>
        <p
          className="fadeup mt-6 max-w-xl text-base leading-relaxed text-paper-dim"
          style={{ animationDelay: "120ms" }}
        >
          One panorama, one pin, five thousand points on the line. Wander the
          planet alone — or open a room and out-guess your friends in real time.
        </p>

        <div
          className="fadeup mt-12 grid gap-4 sm:grid-cols-2"
          style={{ animationDelay: "180ms" }}
        >
          <Link
            href="/play"
            className="ticks group panel-raised flex flex-col p-7 transition-colors hover:border-brass"
          >
            <span className="label-caps mb-2">01 — Singleplayer</span>
            <span className="font-display text-3xl group-hover:text-brass-bright">
              Solo expedition
            </span>
            <span className="mt-3 text-sm text-paper-dim">
              Your rules, your pace. Beat your own 25,000.
            </span>
            <span className="label-caps mt-6 text-brass">play →</span>
          </Link>

          <Link
            href="/rooms"
            className="ticks group panel-raised flex flex-col p-7 transition-colors hover:border-brass"
          >
            <span className="label-caps mb-2">02 — Multiplayer</span>
            <span className="font-display text-3xl group-hover:text-brass-bright">
              Versus rooms
            </span>
            <span className="mt-3 text-sm text-paper-dim">
              Create a room or join one from the live lobby. Same spots, one winner.
            </span>
            <span className="label-caps mt-6 text-brass">enter lobby →</span>
          </Link>
        </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-24 w-full max-w-5xl px-6 pb-20 md:px-10">
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {MECHANICS.map((m, i) => (
            <div key={m.title} className="bg-ink-900 p-6">
              <p className="mb-3 font-mono text-xs text-brass">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mb-2 font-display text-lg">{m.title}</h3>
              <p className="text-sm leading-relaxed text-paper-dim">{m.body}</p>
            </div>
          ))}
        </div>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <span className="font-mono text-xs text-paper-faint">
            geogess — open source · built on street view
          </span>
          <span className="font-mono text-xs text-paper-faint">
            54.6872°N 25.2797°E
          </span>
        </footer>
      </section>
    </main>
  );
}
