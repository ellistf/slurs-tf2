import type { ClassKey, LogDetailResponse, LogsListResponse } from '@/types';

import { fetchJson } from '@/lib/http';

const LOGS_BASE_URL = 'https://logs.tf/api/v1';
const STEAM64_OFFSET = BigInt('76561197960265728');

export async function getLogList(steamId: string, offset: number): Promise<LogsListResponse> {
  const searchParams = new URLSearchParams({
    player: steamId,
    limit: '100',
    offset: offset.toString()
  });

  return fetchJson<LogsListResponse>(`${LOGS_BASE_URL}/log?${searchParams.toString()}`, {
    retries: 2,
    timeoutMs: 12000
  });
}

export async function getLog(logId: number): Promise<LogDetailResponse> {
  return fetchJson<LogDetailResponse>(`${LOGS_BASE_URL}/log/${logId}`, {
    retries: 2,
    timeoutMs: 12000
  });
}

export function sid3ToSid64(sid3: string): string | null {
  const match = sid3.match(/\[U:1:(\d+)\]/);

  if (!match) {
    return null;
  }

  return (STEAM64_OFFSET + BigInt(match[1])).toString();
}

export function sid64ToSid3(steamId: string): string {
  return `[U:1:${(BigInt(steamId) - STEAM64_OFFSET).toString()}]`;
}

export function normalizeClassKey(className: string): ClassKey | null {
  switch (className) {
    case 'scout':
    case 'soldier':
    case 'pyro':
    case 'demoman':
    case 'engineer':
    case 'medic':
    case 'sniper':
    case 'spy':
      return className;
    case 'heavy':
    case 'heavyweapons':
      return 'heavy';
    default:
      return null;
  }
}
