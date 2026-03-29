![Slurs.tf2 banner](public/re-logo.png)

# Slurs-TF2

`Slurs-TF2` is a from-scratch replacement for the old [slurs.tf](https://slurs.tf/) player lookup site.

The original site got shutdown with its source code never being made public, and so I decided to make my own version!

This rebuild is usually slower than the original site because it scans logs live on demand instead of reading from a pre-populated backend database.

## What It Does

- Looks up a TF2 player by `SteamID64`
- Resolves vanity URLs when `STEAM_API_KEY` is configured
- Fetches logs live from [logs.tf](https://logs.tf/)
- Scans chat messages client-side after the shell loads
- Categorizes flagged messages with fuzzy matching for obfuscation and misspellings
- Tracks class usage from logs and shows the most-played class image
- Caches the last 10 completed player scans in the browser for faster revisits
- Runs as an Electron desktop app backed by a Vite + React renderer

## Data Sources

- `logs.tf` for log lists and log details
- Steam Web API for vanity resolution and player summaries when `STEAM_API_KEY` is present
- ETF2L for region fallback and profile fallback when Steam data is unavailable
- FlagCDN for flag rendering

## Stack

- Electron
- Vite
- React
- TypeScript
- Tailwind CSS
- Vitest + Testing Library

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Populate `.env` with:

```bash
STEAM_API_KEY=your_steam_web_api_key_here
```

Steam keys can be created at:

`https://steamcommunity.com/dev/apikey`

### 3. Run in development

```bash
npm run dev
```

That starts the Vite renderer on `http://127.0.0.1:51425` and opens the Electron shell.

## Steam Key Behavior

If `STEAM_API_KEY` is available:

- Vanity URL lookups are enabled
- Steam profile summaries are used directly

If `STEAM_API_KEY` is missing:

- Vanity URL lookup is disabled
- The home page only accepts `SteamID64`
- Profile fallback attempts to use ETF2L data where possible

## Production Build

```bash
npm run build
npm run start
```

## Electron Desktop App

Run the desktop wrapper in development:

```bash
npm run electron:dev
```

Run the desktop wrapper against a production build:

```bash
npm run electron:start
```

Build a portable Windows `.exe`:

```bash
npm run electron:portable
```

The portable build is written to `release/`.

The Electron launcher:

- starts the Vite renderer in development
- loads the built `dist/` files in production
- opens the app in an Electron window
- defaults to local port `51425`
- creates a local `.electron-app.lock` file so a second desktop launch will fail cleanly instead of opening another wrapper
- automatically clears stale lock files if the previous launcher process is no longer running
- stores Electron-specific settings, including the Steam API key, outside the repo through the in-app Settings button on the home page

## Testing

```bash
npm test
```

## Project Structure

```text
components/
electron/
lib/
public/
scripts/
src/
tests/
types/
```

## Notes

- This project does not mirror any original private source code. It is a clean-room rebuild inspired by the public behavior of the old site.
- Upstream failures from `logs.tf` are retried, but they can still happen because the app depends on live external services.
- Cached player scans are client-side only and live in browser storage.

## Internal Documentation

Advanced repo documentation lives in:

- [.docs/README.md](c:/Users/TR/Desktop/projects/nodeJs/reslurs-tf/.docs/README.md)
- [.docs/architecture.md](c:/Users/TR/Desktop/projects/nodeJs/reslurs-tf/.docs/architecture.md)
- [.docs/runtime-and-data-flow.md](c:/Users/TR/Desktop/projects/nodeJs/reslurs-tf/.docs/runtime-and-data-flow.md)
