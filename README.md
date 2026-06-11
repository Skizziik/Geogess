# Geogess

A street-level geography game in the spirit of GeoGuessr. You get dropped into a random Street View panorama somewhere on Earth, read the clues, and pin your guess on the world map. Up to 5,000 points per round — the closer the pin, the higher the score.

**Solo** and **real-time multiplayer**: host a room, it instantly appears in the public lobby, friends join, and the host drops everyone into the same locations at once.

> **No Google API key. No billing account. No credit card.** Panoramas come from Google's public keyless embed (the same code Google hands out via "Share → Embed a map"), panorama lookup uses Google's public GeoPhotoService endpoint, and the guess map runs on Leaflet + OpenStreetMap/CARTO tiles.

## Features

- 🌍 Random locations snapped to real panoramas across ~250 seed regions worldwide
- 🎯 GeoGuessr-style scoring (`5000 · e^(-distance/1492.7)`)
- ⚙️ Configurable matches: 3 / 5 / 10 rounds, round timers (30s–5m or none), movement modes — **Move** and **NMPZ** (frozen view)
- 🧭 Round results with distance line, animated score bar, per-round breakdown
- 🤝 Multiplayer rooms over Supabase Realtime (presence + broadcast — **no database needed**):
  - public lobby with a live room list, join by click or by 6-letter code
  - waiting room with player list and host-editable settings
  - synced countdown, same locations and same starting view for everyone, live "X/Y guessed", standings between rounds, final leaderboard
- 🗺️ Custom dark cartographic UI — no generic template look

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Leaflet + CARTO dark tiles · keyless Google Street View embed · Supabase Realtime (multiplayer transport only)

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | for multiplayer | Realtime websocket endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for multiplayer | Public anon key for Realtime channels |

**Solo mode needs zero configuration.** Without the Supabase vars the lobby simply shows a setup notice.

### Getting Supabase keys (~2 minutes, free, no card)

1. Go to [supabase.com](https://supabase.com), create a free project (any region close to your players).
2. **Project Settings → API**: copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and the **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. That's it. No tables, no SQL, no auth setup — the game only uses Realtime channels.

## Local development

```bash
npm install
cp .env.example .env.local   # optional — only for multiplayer
npm run dev
```

## Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this there).
2. Go to [vercel.com/new](https://vercel.com/new), import `Skizziik/Geogess`. Framework is auto-detected as Next.js — keep all defaults.
3. In the **Environment Variables** step add the two Supabase vars (skip for solo-only).
4. Deploy.

Every push to `main` redeploys automatically.

## How the keyless Street View works

- **Lookup:** `GeoPhotoService.SingleImageSearch` — the public JSONP endpoint google.com/maps itself uses — resolves a random seed coordinate to the nearest official panorama id, no key required.
- **Display:** the panorama renders in Google's public embed iframe (`google.com/maps/embed?pb=…`), the same keyless embed Google generates for any user via "Share → Embed a map". The iframe is oversized and shifted up so the address card stays out of view.
- **Maps:** the guess and result maps are Leaflet with CARTO dark basemap tiles.

This is the same approach used by popular free GeoGuessr alternatives (WorldGuessr, OpenGuessr).

## How multiplayer works (architecture)

There is no game server. Everything runs client-side over two Supabase Realtime channels:

- **Lobby channel** — each room host *tracks presence* with the room metadata (name, players, settings, status). Every browser on the lobby page subscribes and renders the presence state, so rooms appear/disappear live.
- **Room channel** — every member tracks presence (id, nick, color; the host also embeds room config for late joiners). The host resolves the location list and broadcasts a `start` event with a synced start timestamp and the player roster. Each guess is broadcast to everyone; every client independently closes the round when all players have guessed or the timer expires, shows results for 12 seconds, and advances on a shared timeline.

Host leaves the lobby page → the room vanishes from the list. A player leaves mid-match → the round completes without them.
