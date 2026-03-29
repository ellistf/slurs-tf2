const { app } = require('electron');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { dirname, join, parse } = require('node:path');

const FLAG_CODE_MAP = {
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

const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

function getSettingsFilePath() {
  if (process.env.ELECTRON_SETTINGS_FILE?.trim()) {
    return process.env.ELECTRON_SETTINGS_FILE.trim();
  }

  if (process.env.PORTABLE_EXECUTABLE_DIR?.trim()) {
    const portableBaseName = parse(
      process.env.PORTABLE_EXECUTABLE_APP_FILENAME?.trim() || 'Slurs.tf2.exe'
    ).name;

    return join(
      process.env.PORTABLE_EXECUTABLE_DIR.trim(),
      `${portableBaseName}-data`,
      'settings.json'
    );
  }

  try {
    const userDataPath = app.getPath('userData');

    if (userDataPath) {
      return join(userDataPath, 'settings.json');
    }
  } catch {
    // Ignore path resolution failures and fall through.
  }

  return '';
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, { retries = 0, timeoutMs = 10000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store'
      });

      if (response.ok) {
        return await response.json();
      }

      if (attempt < retries && [408, 429, 500, 502, 503, 504].includes(response.status)) {
        await wait(250 * (attempt + 1));
        continue;
      }

      let message = `Request failed with status ${response.status}`;

      try {
        const payload = await response.json();
        message = payload?.error || message;
      } catch {
        // ignore JSON parse errors
      }

      throw new Error(message);
    } catch (error) {
      if (attempt < retries) {
        await wait(250 * (attempt + 1));
        continue;
      }

      throw error instanceof Error ? error : new Error('Request failed.');
    }
  }

  throw new Error('Request failed.');
}

function readSettings() {
  const settingsFilePath = getSettingsFilePath();

  if (!settingsFilePath) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(settingsFilePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeSettings(nextSettings) {
  const settingsFilePath = getSettingsFilePath();

  if (!settingsFilePath) {
    throw new Error('Electron settings file is unavailable.');
  }

  mkdirSync(dirname(settingsFilePath), { recursive: true });
  writeFileSync(
    settingsFilePath,
    JSON.stringify(
      {
        steamApiKey: nextSettings.steamApiKey?.trim() || ''
      },
      null,
      2
    )
  );
}

function getSteamApiKey() {
  return process.env.STEAM_API_KEY?.trim() || readSettings().steamApiKey?.trim() || '';
}

function hasSteamApiKey() {
  return Boolean(getSteamApiKey());
}

function normalizeCountry(country) {
  return country.trim().toLowerCase();
}

function toFlagCode(country, fallbackCountryCode) {
  const mappedCode = FLAG_CODE_MAP[normalizeCountry(country)];

  if (mappedCode) {
    return mappedCode;
  }

  return (fallbackCountryCode || '').toLowerCase();
}

function getSteamRegionLabel(countryCode) {
  if (!countryCode) {
    return '';
  }

  return REGION_NAMES.of(countryCode.toUpperCase()) || countryCode.toUpperCase();
}

function pickLeagueCountry(payload) {
  const activeTeam = payload.teams?.find((team) => !team.end && team.country);

  if (activeTeam?.country) {
    return activeTeam.country;
  }

  return payload.player?.country?.trim() || '';
}

async function fetchEtf2lPlayer(steamId) {
  return fetchJson(`https://api-v2.etf2l.org/player/${steamId}`, {
    retries: 1,
    timeoutMs: 8000
  });
}

async function getLeagueProfileFallback(steamId) {
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

async function getLeagueRegion(steamId, fallbackCountryCode) {
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
    // fall through to steam fallback
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

async function resolveVanity(vanity) {
  const key = getSteamApiKey();

  if (!key) {
    throw new Error('Vanity URL lookup is unavailable. Enter a SteamID64 instead.');
  }

  const searchParams = new URLSearchParams({
    key,
    vanityurl: vanity
  });

  const payload = await fetchJson(
    `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?${searchParams.toString()}`,
    { retries: 1, timeoutMs: 8000 }
  );

  if (payload.response?.success !== 1 || !payload.response.steamid) {
    return null;
  }

  return payload.response.steamid;
}

async function getPlayerSummary(steamId) {
  const key = getSteamApiKey();

  if (!key) {
    return getLeagueProfileFallback(steamId);
  }

  const searchParams = new URLSearchParams({
    key,
    steamids: steamId
  });

  const payload = await fetchJson(
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

async function getLogs(steamId, offset) {
  return fetchJson(
    `https://logs.tf/api/v1/log?player=${encodeURIComponent(steamId)}&limit=100&offset=${offset}`,
    { retries: 2, timeoutMs: 12000 }
  );
}

async function getLog(logId) {
  return fetchJson(`https://logs.tf/api/v1/log/${logId}`, {
    retries: 2,
    timeoutMs: 12000
  });
}

async function getRuntimeInfo() {
  return {
    isElectronApp: true,
    steamApiKeyConfigured: hasSteamApiKey()
  };
}

async function getElectronSettings() {
  return {
    steamApiKeyConfigured: hasSteamApiKey()
  };
}

async function saveElectronSettings(nextSettings) {
  writeSettings(nextSettings);

  return {
    steamApiKeyConfigured: hasSteamApiKey()
  };
}

module.exports = {
  getRuntimeInfo,
  getElectronSettings,
  saveElectronSettings,
  resolveVanity,
  getPlayerSummary,
  getLogs,
  getLog
};
