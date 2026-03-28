# Architecture

## Overview

The app is a Next.js 14 App Router project with a split between:

- server-only upstream helpers in `lib/`
- thin API proxy routes in `app/api/`
- server-rendered page shell in `app/player/[steamid]/page.tsx`
- client-side scan and presentation logic in `components/PlayerData.tsx`

The design goal is to stay stateless on the server. The app does not store scan results in a database. Completed scans are only cached in the browser.

## Main Pieces

### `app/page.tsx`

Home page. Renders the logo and search bar. It also decides whether vanity lookup is enabled by checking for `STEAM_API_KEY`.

### `app/player/[steamid]/page.tsx`

Server component for the player route.

Responsibilities:

- validate the route param as a `SteamID64`
- fetch profile data server-side
- render the player header immediately
- hand the actual scan work off to `PlayerData`

This route is marked `force-dynamic` because the content depends on live upstream requests.

### `app/api/*`

Thin proxy endpoints used by the browser:

- `/api/resolve`
- `/api/profile`
- `/api/logs`
- `/api/log`

These keep Steam keys off the client and give the frontend a consistent same-origin API surface.

### `lib/steam.ts`

Server-only Steam logic.

Responsibilities:

- check whether `STEAM_API_KEY` exists
- resolve vanity URLs
- fetch Steam player summaries
- fall back to ETF2L profile data when no Steam key is available

### `lib/league.ts`

ETF2L integration and region handling.

Responsibilities:

- load ETF2L player data
- prefer league country/region over Steam country when available
- map region names to FlagCDN-compatible flag codes

### `lib/logstf.ts`

Logs.tf helpers and ID conversion logic.

Responsibilities:

- fetch log lists
- fetch individual logs
- convert between SteamID formats used by logs.tf and the app
- normalize class names for class image selection

### `lib/categorize.ts` and `lib/slur-list.ts`

Message analysis lives here.

`slur-list.ts` now acts as the typed loader for the category JSON files in `lib/slur-data/`.

`categorize.ts`:

- builds regex patterns from the list
- tolerates punctuation, separators, and basic leetspeak
- returns both the winning category and exact matched ranges for UI highlighting

### `components/PlayerData.tsx`

This is the main runtime engine on the client.

Responsibilities:

- fetch all log pages for the player
- scan all log details with concurrency limits
- retry failed log requests
- accumulate stats and class totals
- store completed scans in client cache
- filter/search messages in-memory
- progressively render rows to avoid UI lag on large result sets

### `lib/player-cache.ts`

Browser-only LRU-style cache backed by `localStorage`.

Behavior:

- caches completed scans only
- stores up to 10 users
- bumps the most recently accessed entry
- allows per-player manual refresh by deleting a single cache entry

## Why The Split Matters

The app keeps server code and browser code intentionally separate:

- server components can call helpers directly
- client components only call the app's own API routes

That avoids leaking secrets and keeps the client runtime small and predictable.

## Error Handling Model

- upstream fetch helpers retry transient errors
- the browser retries `/api/logs` and `/api/log`
- failed individual logs do not erase successful results
- a failed full log-list fetch is still fatal because the scan cannot continue without the list

## UI Performance Strategy

Large message sets can easily reach into the thousands. To keep the page responsive:

- the app scans all logs first
- search and filtering are done locally
- only a batch of rows is rendered initially
- more rows are revealed as the user scrolls

This is simpler than virtualizing the table and has been enough for the current UI.
