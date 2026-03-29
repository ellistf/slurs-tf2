# Architecture

## Overview

The app now runs as an Electron desktop app with a Vite + React renderer.

The main split is:

- Electron main/preload code in `electron/`
- shared upstream helpers in `lib/`
- React route shells in `src/pages/`
- client-side scan and presentation logic in `components/PlayerData.tsx`

The design goal is still to stay stateless. The app does not store scan results in a database. Completed scans are only cached in the browser.

## Main Pieces

### `src/pages/HomeRoute.tsx`

Home route for the renderer. It loads Electron runtime info and renders the logo, search bar, and desktop-only settings button.

### `src/pages/PlayerRoute.tsx`

Client-side player route shell.

Responsibilities:

- validate the route param as a `SteamID64`
- fetch the player profile through the preload bridge
- render the player header immediately
- hand the scan work off to `PlayerData`

### `electron/main.cjs`

Electron desktop entry point.

Responsibilities:

- create the browser window
- load the Vite dev server or built renderer
- register IPC handlers
- expose the desktop icon, settings path, and other desktop-only behavior

### `electron/preload.cjs`

The safe bridge between the renderer and Electron.

Responsibilities:

- expose `window.slursApi`
- keep Node/Electron APIs out of the React renderer
- route requests through IPC

### `electron/services.cjs`

Shared service layer behind the IPC handlers.

Responsibilities:

- resolve vanity URLs
- fetch player summaries
- prefer ETF2L region/profile data when Steam data is missing or less accurate
- read/write Electron settings
- fetch logs.tf list/detail payloads

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

This is the main runtime engine in the renderer.

Responsibilities:

- fetch all log pages for the player through `window.slursApi`
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

The app keeps desktop/runtime code and renderer code intentionally separate:

- Electron services own network access and settings persistence
- the React renderer only talks to the preload bridge

That keeps the renderer simple and avoids exposing Node APIs directly to the page.

## Error Handling Model

- upstream fetch helpers retry transient errors
- the renderer retries preload-backed log requests
- failed individual logs do not erase successful results
- a failed full log-list fetch is still fatal because the scan cannot continue without the list

## UI Performance Strategy

Large message sets can easily reach into the thousands. To keep the page responsive:

- the app scans all logs first
- search and filtering are done locally
- only a batch of rows is rendered initially
- more rows are revealed as the user scrolls

This is simpler than virtualizing the table and has been enough for the current UI.
