import 'server-only';

import { fetchJson } from '@/lib/http';

type RegionSource = 'ETF2L' | 'Steam' | 'Unknown';

interface Etf2lPlayerResponse {
  player?: {
    name?: string;
    country?: string;
    steam?: {
      avatar?: string;
      id64?: string;
    };
  };
  teams?: Array<{
    country?: string;
    end?: number | null;
    type?: string;
  }>;
}

const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

const COUNTRY_TO_FLAG_CODE: Record<string, string> = {
  argentina: 'ar',
  australia: 'au',
  austria: 'at',
  belgium: 'be',
  brazil: 'br',
  bulgaria: 'bg',
  canada: 'ca',
  chile: 'cl',
  croatia: 'hr',
  czechia: 'cz',
  'czech republic': 'cz',
  denmark: 'dk',
  england: 'gb-eng',
  estonia: 'ee',
  europe: 'eu',
  european: 'eu',
  finland: 'fi',
  france: 'fr',
  germany: 'de',
  greece: 'gr',
  hungary: 'hu',
  iceland: 'is',
  ireland: 'ie',
  israel: 'il',
  italy: 'it',
  latvia: 'lv',
  lithuania: 'lt',
  mexico: 'mx',
  netherlands: 'nl',
  'new zealand': 'nz',
  norway: 'no',
  poland: 'pl',
  portugal: 'pt',
  romania: 'ro',
  'northern ireland': 'gb-nir',
  scotland: 'gb-sct',
  serbia: 'rs',
  singapore: 'sg',
  slovakia: 'sk',
  slovenia: 'si',
  spain: 'es',
  sweden: 'se',
  switzerland: 'ch',
  turkey: 'tr',
  uk: 'gb',
  ukraine: 'ua',
  'united kingdom': 'gb',
  'united states': 'us',
  usa: 'us',
  wales: 'gb-wls'
};

function normalizeCountry(country: string): string {
  return country.trim().toLowerCase();
}

function getSteamRegionLabel(countryCode: string): string {
  if (!countryCode) {
    return '';
  }

  return REGION_NAMES.of(countryCode.toUpperCase()) ?? countryCode.toUpperCase();
}

function toFlagCode(country: string, fallbackCountryCode: string): string {
  const fromCountry = COUNTRY_TO_FLAG_CODE[normalizeCountry(country)];

  if (fromCountry) {
    return fromCountry;
  }

  return fallbackCountryCode.toLowerCase();
}

function pickLeagueCountry(payload: Etf2lPlayerResponse): string {
  const activeTeam = payload.teams?.find((team) => !team.end && team.country);

  if (activeTeam?.country) {
    return activeTeam.country;
  }

  return payload.player?.country?.trim() ?? '';
}

async function fetchEtf2lPlayer(steamId: string): Promise<Etf2lPlayerResponse> {
  return fetchJson<Etf2lPlayerResponse>(`https://api-v2.etf2l.org/player/${steamId}`, {
    retries: 1,
    timeoutMs: 8000
  });
}

export async function getLeagueProfileFallback(
  steamId: string
): Promise<{
  name: string;
  avatarUrl: string;
  countryCode: string;
  regionLabel: string;
  flagCode: string;
  regionSource: RegionSource;
} | null> {
  try {
    const payload = await fetchEtf2lPlayer(steamId);
    const regionLabel = pickLeagueCountry(payload);

    if (!payload.player?.name && !payload.player?.steam?.avatar && !regionLabel) {
      return null;
    }

    return {
      name: payload.player?.name || steamId,
      avatarUrl: payload.player?.steam?.avatar || '',
      countryCode: '',
      regionLabel,
      flagCode: regionLabel ? toFlagCode(regionLabel, '') : '',
      regionSource: regionLabel ? 'ETF2L' : 'Unknown'
    };
  } catch {
    return null;
  }
}

export async function getLeagueRegion(
  steamId: string,
  fallbackCountryCode: string
): Promise<{
  regionLabel: string;
  flagCode: string;
  regionSource: RegionSource;
}> {
  try {
    const payload = await fetchEtf2lPlayer(steamId);

    const regionLabel = pickLeagueCountry(payload);

    if (regionLabel) {
      return {
        regionLabel,
        flagCode: toFlagCode(regionLabel, fallbackCountryCode),
        regionSource: 'ETF2L'
      };
    }
  } catch {
    // Steam fallback below keeps the profile render resilient.
  }

  if (fallbackCountryCode) {
    return {
      regionLabel: getSteamRegionLabel(fallbackCountryCode),
      flagCode: fallbackCountryCode.toLowerCase(),
      regionSource: 'Steam'
    };
  }

  return {
    regionLabel: '',
    flagCode: '',
    regionSource: 'Unknown'
  };
}
