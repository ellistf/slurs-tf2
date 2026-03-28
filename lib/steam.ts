import 'server-only';

import type { PlayerProfile } from '@/types';

import { fetchJson } from '@/lib/http';
import { getLeagueProfileFallback, getLeagueRegion } from '@/lib/league';

interface ResolveVanityResponse {
  response?: {
    success?: number;
    steamid?: string;
  };
}

interface GetPlayerSummariesResponse {
  response?: {
    players?: Array<{
      steamid?: string;
      personaname?: string;
      avatarfull?: string;
      loccountrycode?: string;
    }>;
  };
}

function getSteamKey(): string {
  const key = process.env.STEAM_API_KEY;

  if (!key) {
    throw new Error('STEAM_API_KEY is not configured');
  }

  return key;
}

export function hasSteamApiKey(): boolean {
  return Boolean(process.env.STEAM_API_KEY?.trim());
}

export async function resolveVanity(vanity: string): Promise<string | null> {
  const searchParams = new URLSearchParams({
    key: getSteamKey(),
    vanityurl: vanity
  });

  const payload = await fetchJson<ResolveVanityResponse>(
    `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?${searchParams.toString()}`,
    { retries: 1, timeoutMs: 8000 }
  );

  if (payload.response?.success !== 1 || !payload.response.steamid) {
    return null;
  }

  return payload.response.steamid;
}

export async function getPlayerSummary(steamId: string): Promise<PlayerProfile | null> {
  if (!hasSteamApiKey()) {
    const leagueProfile = await getLeagueProfileFallback(steamId);

    if (!leagueProfile) {
      return null;
    }

    return {
      steamId,
      name: leagueProfile.name,
      avatarUrl: leagueProfile.avatarUrl,
      countryCode: leagueProfile.countryCode,
      regionLabel: leagueProfile.regionLabel,
      flagCode: leagueProfile.flagCode,
      regionSource: leagueProfile.regionSource
    };
  }

  const searchParams = new URLSearchParams({
    key: getSteamKey(),
    steamids: steamId
  });

  const payload = await fetchJson<GetPlayerSummariesResponse>(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?${searchParams.toString()}`,
    { retries: 1, timeoutMs: 8000 }
  );

  const player = payload.response?.players?.[0];

  if (!player) {
    return null;
  }

  const countryCode = player.loccountrycode || '';
  const leagueRegion = await getLeagueRegion(steamId, countryCode);

  return {
    steamId,
    name: player.personaname || steamId,
    avatarUrl: player.avatarfull || '',
    countryCode,
    regionLabel: leagueRegion.regionLabel,
    flagCode: leagueRegion.flagCode,
    regionSource: leagueRegion.regionSource
  };
}
