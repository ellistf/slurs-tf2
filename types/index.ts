export type Category = 'RACIAL' | 'BIGOTRY' | 'GENERIC' | 'CLEAN';

export type FilterKey = 'all' | 'racial' | 'bigotry' | 'generic' | 'flagged';

export type ClassKey =
  | 'scout'
  | 'soldier'
  | 'pyro'
  | 'demoman'
  | 'heavy'
  | 'engineer'
  | 'medic'
  | 'sniper'
  | 'spy';

export interface PlayerProfile {
  steamId: string;
  name: string;
  avatarUrl: string;
  countryCode: string;
  regionLabel: string;
  flagCode: string;
  regionSource: 'ETF2L' | 'Steam' | 'Unknown';
}

export interface InfractionMatch {
  category: Exclude<Category, 'CLEAN'>;
  term: string;
  text: string;
  start: number;
  end: number;
}

export interface ScannedMessage {
  id: string;
  logId: number;
  date: number;
  text: string;
  category: Category;
  matches: InfractionMatch[];
}

export interface PlayerStats {
  totalMessages: number;
  totalLogs: number;
  racial: number;
  bigotry: number;
  generic: number;
}

export interface ScanProgress {
  scannedLogs: number;
  targetLogs: number;
  failedLogs: number;
  flaggedMessages: number;
  retryingLogs: number;
  retryTotalLogs?: number;
  phase: 'listing' | 'scanning' | 'retrying' | 'complete' | 'cached';
}

export type ClassTotals = Partial<Record<ClassKey, number>>;

export interface CachedPlayerScan {
  steamId: string;
  messages: ScannedMessage[];
  stats: PlayerStats;
  classTotals: ClassTotals;
  progress: ScanProgress;
  completedAt: number;
  lastAccessedAt: number;
}

export interface ClassStatEntry {
  type: string;
  total_time?: number;
}

export interface LogsPlayerSummary {
  class_stats?: ClassStatEntry[];
}

export interface LogsListEntry {
  id: number;
  title: string;
  map?: string;
  date: number;
  views?: number;
  players?: number;
}

export interface LogsListResponse {
  success: boolean;
  results: number;
  total: number;
  logs: LogsListEntry[];
}

export interface LogChatEntry {
  steamid: string;
  name?: string;
  msg: string;
}

export interface LogDetailResponse {
  success: boolean;
  chat?: LogChatEntry[];
  players?: Record<string, LogsPlayerSummary>;
  info?: {
    date?: number;
    title?: string;
  };
}
