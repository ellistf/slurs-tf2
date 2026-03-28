import type { ClassKey, PlayerStats, ScanProgress, ScannedMessage } from '@/types';

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);

  return `${date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  })} ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  })}`;
}

export function deriveStats(messages: ScannedMessage[], totalLogs: number): PlayerStats {
  return messages.reduce<PlayerStats>(
    (stats, message) => {
      stats.totalMessages += 1;
      stats.totalLogs = totalLogs;

      if (message.category === 'RACIAL') {
        stats.racial += 1;
      } else if (message.category === 'BIGOTRY') {
        stats.bigotry += 1;
      } else if (message.category === 'GENERIC') {
        stats.generic += 1;
      }

      return stats;
    },
    {
      totalMessages: 0,
      totalLogs,
      racial: 0,
      bigotry: 0,
      generic: 0
    }
  );
}

export function getTopClass(classTotals: Partial<Record<ClassKey, number>>): ClassKey | null {
  const entries = Object.entries(classTotals) as Array<[ClassKey, number]>;

  if (!entries.length) {
    return null;
  }

  return entries.sort((left, right) => right[1] - left[1])[0][0];
}

export function getProgressLabel(progress: ScanProgress): string {
  switch (progress.phase) {
    case 'cached':
      return '';
    case 'listing':
      return progress.targetLogs
        ? `Loading log list... ${Math.min(progress.scannedLogs, progress.targetLogs).toLocaleString()}/${progress.targetLogs.toLocaleString()} logs`
        : 'Loading log list...';
    case 'retrying':
      return `Retrying ${progress.retryingLogs.toLocaleString()} failed logs... ${
        progress.failedLogs ? `${progress.failedLogs} still failing` : 'recovering results'
      }`;
    case 'complete':
      return `Loaded ${progress.targetLogs.toLocaleString()} logs${
        progress.failedLogs ? ` - ${progress.failedLogs} failed` : ''
      }`;
    default:
      if (!progress.targetLogs) {
        return 'Preparing scan...';
      }

      return `Scanning logs... ${progress.scannedLogs.toLocaleString()}/${progress.targetLogs.toLocaleString()}${
        progress.failedLogs ? ` - ${progress.failedLogs.toLocaleString()} failed` : ''
      }`;
  }
}

export function formatEtaLabel(milliseconds: number): string {
  const totalSeconds = Math.max(1, Math.ceil(milliseconds / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes < 60) {
    return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
