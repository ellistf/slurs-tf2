# Runtime And Data Flow

## End-To-End Flow

### Home search

1. The user enters either a `SteamID64`, vanity name, or a pasted Steam profile URL.
2. If the app has a Steam key and the input is a vanity name, the browser calls `/api/resolve`.
3. The app navigates to `/player/[steamid]`.

If no Steam key exists, the home page is intentionally restricted to numeric `SteamID64` input.

## Player page flow

### Server render phase

`app/player/[steamid]/page.tsx`:

1. validates the route parameter
2. fetches the profile summary
3. renders the page shell and header
4. mounts `PlayerData`

### Client scan phase

`components/PlayerData.tsx` then:

1. checks the browser cache for a completed scan
2. if cached, restores it instantly
3. otherwise requests `/api/logs` until the full log list is collected
4. requests individual log details with fixed concurrency
5. extracts only the target player's messages
6. analyzes every message with `analyzeMessage`
7. derives class totals from per-log player data
8. stores the finished result in the local browser cache

The full table is shown after the complete scan finishes. Once shown, rendering is still chunked to keep the page responsive.

## Scan Progress States

The scan state is represented with a `ScanProgress` object.

Major phases:

- `listing`
- `scanning`
- `retrying`
- `complete`
- `cached`

The UI uses those phases to show the progress label and progress bar.

## Retry Behavior

There are two retry layers:

### Server-side fetch helper retries

`lib/http.ts` retries transient upstream failures such as:

- `429`
- `500`
- `502`
- `503`
- `504`
- network timeouts

### Client-side scan retries

`PlayerData` also retries calls to:

- `/api/logs`
- `/api/log`

After the first scan pass, any log details that still failed are retried in one more pass. Successful results remain intact even if some logs never recover.

## Caching Model

The cache is intentionally client-only.

Important details:

- no server cache exists
- completed scans are stored in `localStorage`
- only the last 10 players are kept
- scans can be manually refreshed per player
- the refresh action deletes the player's cache entry and re-runs the live scan

This keeps the deployment simple while still making repeat lookups feel much faster.

## Region And Flag Resolution

Player region is not taken from Steam alone.

Current priority:

1. ETF2L region if available
2. Steam country fallback
3. unknown if neither source returns usable data

Flags are rendered using the resolved flag code, including sub-flags such as:

- `gb-wls`
- `gb-eng`
- `gb-sct`
- `gb-nir`

## Message Categorization

`lib/categorize.ts` builds tolerant regex patterns from the term list.

The matcher handles:

- separators inserted between characters
- common leetspeak substitutions
- spaced multi-word phrases
- overlapping matches with category priority

The returned match ranges are then used by `MessageTable` to highlight exact offending spans instead of recoloring the full message.

## Operational Notes

### Local production tunnel

`npm run startp`:

- starts the production app
- waits for the port to open
- launches a Cloudflared quick tunnel

This is meant for local sharing and smoke testing, not as a replacement for a real production deployment.

### Vercel

The app deploys cleanly to Vercel because it does not depend on any external stateful infrastructure.

The only required secret is:

- `STEAM_API_KEY`

Without it, the deployed app still works for direct `SteamID64` lookups.
