'use client';

import type { CachedPlayerScan } from '@/types';

const STORAGE_KEY = 'slurs-tf-player-cache-v2';
const MAX_CACHED_USERS = 10;

let didHydrate = false;
const cache = new Map<string, CachedPlayerScan>();

function cloneEntry(entry: CachedPlayerScan): CachedPlayerScan {
  return {
    ...entry,
    classTotals: { ...entry.classTotals },
    progress: { ...entry.progress },
    stats: { ...entry.stats },
    messages: entry.messages.map((message) => ({
      ...message,
      matches: message.matches.map((match) => ({ ...match }))
    }))
  };
}

function persistCache() {
  if (typeof window === 'undefined') {
    return;
  }

  while (true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...cache.values()]));
      return;
    } catch {
      if (cache.size <= 1) {
        return;
      }

      const oldestKey = cache.keys().next().value;

      if (!oldestKey) {
        return;
      }

      cache.delete(oldestKey);
    }
  }
}

function trimCache() {
  while (cache.size > MAX_CACHED_USERS) {
    const oldestKey = cache.keys().next().value;

    if (!oldestKey) {
      break;
    }

    cache.delete(oldestKey);
  }
}

function hydrateCache() {
  if (didHydrate || typeof window === 'undefined') {
    return;
  }

  didHydrate = true;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return;
    }

    const entries = JSON.parse(raw) as CachedPlayerScan[];

    for (const entry of entries) {
      if (!entry?.steamId) {
        continue;
      }

      cache.set(entry.steamId, entry);
    }

    trimCache();
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getCachedPlayerScan(steamId: string): CachedPlayerScan | null {
  hydrateCache();

  const entry = cache.get(steamId);

  if (!entry) {
    return null;
  }

  cache.delete(steamId);

  const touchedEntry = {
    ...entry,
    lastAccessedAt: Date.now()
  };

  cache.set(steamId, touchedEntry);
  persistCache();
  return cloneEntry(touchedEntry);
}

export function setCachedPlayerScan(entry: CachedPlayerScan) {
  hydrateCache();
  cache.delete(entry.steamId);
  cache.set(entry.steamId, cloneEntry(entry));
  trimCache();
  persistCache();
}

export function removeCachedPlayerScan(steamId: string) {
  hydrateCache();
  cache.delete(steamId);
  persistCache();
}

export function clearPlayerCache() {
  cache.clear();
  didHydrate = false;

  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
