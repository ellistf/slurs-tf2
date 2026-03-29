/// <reference types="vite/client" />

import type { LogDetailResponse, LogsListResponse, PlayerProfile } from '@/types';

declare global {
  interface Window {
    slursApi?: {
      getRuntimeInfo: () => Promise<{
        isElectronApp: boolean;
        steamApiKeyConfigured: boolean;
      }>;
      getElectronSettings: () => Promise<{
        steamApiKeyConfigured: boolean;
      }>;
      saveElectronSettings: (payload: { steamApiKey?: string }) => Promise<{
        steamApiKeyConfigured: boolean;
      }>;
      resolveVanity: (vanity: string) => Promise<string | null>;
      getProfile: (steamId: string) => Promise<PlayerProfile | null>;
      getLogs: (steamId: string, offset: number) => Promise<LogsListResponse>;
      getLog: (logId: number) => Promise<LogDetailResponse>;
    };
  }
}

export {};
