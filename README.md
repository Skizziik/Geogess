# Geogess

A street-level geography game in the spirit of GeoGuessr. You get dropped into a random Street View panorama somewhere on Earth, read the clues, and pin your guess on the world map. Up to 5,000 points per round — the closer the pin, the higher the score.

**Solo** and **real-time multiplayer**: host a room, it instantly appears in the public lobby, friends join, and the host drops everyone into the same locations at once.

## Features

- 🌍 Random locations snapped to real outdoor panoramas across ~250 seed regions worldwide
- 🎯 GeoGuessr-style scoring (`5000 · e^(-distance/1492.7)`)
- ⚙️ Configurable matches: 3 / 5 / 10 rounds, round timers (30s–5m or none), movement modes — **Move**, **No Move**, **NMPZ**
- 🧭 Round results with distance line, animated score bar, per-round breakdown
- 🤝 Multiplayer rooms over Supabase Realtime (presence + broadcast — **no database needed**):
  - public lobby with a live room list, join by click or by 6-letter code
  - waiting room with player list and host-editable settings
  - synced countdown, same locations for everyone, live "X/Y guessed", standings between rounds, final leaderboard
- 🗺️ Custom dark cartographic UI — no generic template look

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Google Maps JS API (Street View + maps) · Supabase Realtime (multiplayer transport only)

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | yes | Street View panoramas + guess/result maps |
| `NEXT_PUBLIC_SUPABASE_URL` | for multiplayer | Realtime websocket endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for multiplayer | Public anon key for Realtime channels |

Without the Supabase vars the app still works — solo mode only, the lobby shows a setup notice.

### Getting a Google Maps key (~3 minutes)

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project.
2. Enable billing (required by Google; the free $200/month credit covers casual play comfortably).
3. **APIs & Services → Library** → enable **Maps JavaScript API**.
4. **APIs & Services → Credentials → Create credentials → API key.**
5. Recommended: restrict the key to your domains (`localhost:3001/*`, `your-app.vercel.app/*`) and to the Maps JavaScript API only.

### Getting Supabase keys (~2 minutes)

1. Go to [supabase.com](https://supabase.com), create a free project (any region close to your players).
2. **Project Settings → API**: copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and the **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. That's it. No tables, no SQL, no auth setup — the game only uses Realtime channels.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev
```

## Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this there).
2. Go to [vercel.com/new](https://vercel.com/new), import `Skizziik/Geogess`. Framework is auto-detected as Next.js — keep all defaults.
3. In the **Environment Variables** step add the three vars above.
4. Deploy. Add your `*.vercel.app` domain to the Google Maps key restrictions.

Every push to `main` redeploys automatically.

## How multiplayer works (architecture)

There is no game server. Everything runs client-side over two Supabase Realtime channels:

- **Lobby channel** — each room host *tracks presence* with the room metadata (name, players, settings, status). Every browser on the lobby page subscribes and renders the presence state, so rooms appear/disappear live.
- **Room channel** — every member tracks presence (id, nick, color; the host also embeds room config for late joiners). The host generates the location list and broadcasts a `start` event with a synced start timestamp and the player roster. Each guess is broadcast to everyone; every client independently closes the round when all players have guessed or the timer expires, shows results for 12 seconds, and advances on a shared timeline.

Host leaves the lobby page → the room vanishes from the list. A player leaves mid-match → the round completes without them.
