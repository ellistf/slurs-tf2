'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { CategoryStats } from '@/components/CategoryStats';
import { ClassModel } from '@/components/ClassModel';
import { FilterTabs } from '@/components/FilterTabs';
import { MessageTable } from '@/components/MessageTable';
import { analyzeMessage } from '@/lib/categorize';
import { normalizeClassKey, sid3ToSid64, sid64ToSid3 } from '@/lib/logstf';
import { getCachedPlayerScan, removeCachedPlayerScan, setCachedPlayerScan } from '@/lib/player-cache';
import { deriveStats, formatEtaLabel, getProgressLabel, getTopClass } from '@/lib/utils';
import type {
  ClassKey,
  ClassTotals,
  FilterKey,
  LogDetailResponse,
  LogsListEntry,
  LogsListResponse,
  PlayerStats,
  ScanProgress,
  ScannedMessage
} from '@/types';

const LOGS_PAGE_SIZE = 100;
const LOG_CONCURRENCY = 5;
const PAGE_RETRIES = 2;
const DETAIL_RETRIES = 3;
const MESSAGE_RENDER_BATCH = 250;

const EMPTY_STATS: PlayerStats = {
  totalMessages: 0,
  totalLogs: 0,
  racial: 0,
  bigotry: 0,
  generic: 0
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRouteJson<T>(url: string, retries: number, timeoutMs = 20000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      let message = 'Request failed.';

      try {
        const payload = (await response.json()) as { error?: string };
        message = payload.error || message;
      } catch {
        message = `Request failed with status ${response.status}`;
      }

      if (attempt < retries && [408, 429, 500, 502, 503, 504].includes(response.status)) {
        await sleep(300 * (attempt + 1));
        continue;
      }

      throw new Error(message);
    } catch (error) {
      if (attempt < retries) {
        await sleep(300 * (attempt + 1));
        continue;
      }

      throw error instanceof Error ? error : new Error('Request failed.');
    }
  }

  throw new Error('Request failed.');
}

function countCategoryMatches(messages: ScannedMessage[]) {
  return messages.reduce(
    (counts, message) => {
      counts.totalMessages += 1;

      if (message.category === 'RACIAL') {
        counts.racial += 1;
      } else if (message.category === 'BIGOTRY') {
        counts.bigotry += 1;
      } else if (message.category === 'GENERIC') {
        counts.generic += 1;
      }

      return counts;
    },
    {
      totalMessages: 0,
      racial: 0,
      bigotry: 0,
      generic: 0
    }
  );
}

function appendClassTotals(
  previous: ClassTotals,
  logDetail: LogDetailResponse,
  steamSid3: string
): ClassTotals {
  const player = logDetail.players?.[steamSid3];

  if (!player?.class_stats?.length) {
    return previous;
  }

  const next = { ...previous };

  for (const entry of player.class_stats) {
    const classKey = normalizeClassKey(entry.type);

    if (!classKey) {
      continue;
    }

    next[classKey] = (next[classKey] ?? 0) + (entry.total_time ?? 0);
  }

  return next;
}

function collectMessages(log: LogsListEntry, logDetail: LogDetailResponse, steamId: string): ScannedMessage[] {
  const date = log.date ?? logDetail.info?.date ?? 0;

  return (logDetail.chat ?? [])
    .map((entry, index) => {
      const resolvedSteamId = entry.steamid.startsWith('[') ? sid3ToSid64(entry.steamid) : entry.steamid;

      if (!resolvedSteamId || resolvedSteamId !== steamId) {
        return null;
      }

      const analysis = analyzeMessage(entry.msg);

      return {
        id: `${log.id}-${index}-${entry.msg}`,
        logId: log.id,
        date,
        text: entry.msg,
        category: analysis.category,
        matches: analysis.matches
      } satisfies ScannedMessage;
    })
    .filter((message): message is ScannedMessage => message !== null);
}

function buildProgress(partial?: Partial<ScanProgress>): ScanProgress {
  return {
    scannedLogs: 0,
    targetLogs: 0,
    failedLogs: 0,
    flaggedMessages: 0,
    retryingLogs: 0,
    phase: 'listing',
    ...partial
  };
}

function createLiveStats(totalLogs: number): PlayerStats {
  return {
    ...EMPTY_STATS,
    totalLogs
  };
}

async function runConcurrent<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
) {
  let cursor = 0;

  async function next() {
    while (cursor < items.length) {
      const current = items[cursor];
      cursor += 1;
      await worker(current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
}

export function PlayerData({ steamId }: { steamId: string }) {
  const [messages, setMessages] = useState<ScannedMessage[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [messageQuery, setMessageQuery] = useState('');
  const [stats, setStats] = useState<PlayerStats>(EMPTY_STATS);
  const [progress, setProgress] = useState<ScanProgress>(buildProgress());
  const [classTotals, setClassTotals] = useState<ClassTotals>({});
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [showCacheNotice, setShowCacheNotice] = useState(false);
  const [renderedMessageCount, setRenderedMessageCount] = useState(MESSAGE_RENDER_BATCH);
  const [isRefreshModalOpen, setIsRefreshModalOpen] = useState(false);
  const [scanNow, setScanNow] = useState(() => Date.now());

  const activeToken = useRef(0);
  const loadMoreMessagesRef = useRef<HTMLDivElement | null>(null);
  const progressSamplesRef = useRef<
    Array<{ phase: ScanProgress['phase']; completed: number; total: number; at: number }>
  >([]);

  const topClass = getTopClass(classTotals);
  const isComplete = progress.phase === 'complete' || progress.phase === 'cached';
  const normalizedMessageQuery = messageQuery.trim().toLowerCase();
  const filteredMessages = useMemo(() => {
    if (!isComplete) {
      return [];
    }

    return [...messages]
      .filter((message) => {
        if (normalizedMessageQuery && !message.text.toLowerCase().includes(normalizedMessageQuery)) {
          return false;
        }

        if (filter === 'all') {
          return true;
        }

        if (filter === 'flagged') {
          return message.category !== 'CLEAN';
        }

        return message.category === filter.toUpperCase();
      })
      .sort((left, right) => right.date - left.date);
  }, [filter, isComplete, messages, normalizedMessageQuery]);
  const visibleMessages = filteredMessages.slice(0, renderedMessageCount);
  const progressLabel = getProgressLabel(progress);
  const progressPercent = progress.targetLogs
    ? Math.min(100, Math.round((progress.scannedLogs / progress.targetLogs) * 100))
    : 0;
  const hasMoreVisibleMessages = renderedMessageCount < filteredMessages.length;
  const statusText = showCacheNotice ? 'Saved results loaded.' : progressLabel;
  const scanEtaLabel = useMemo(() => {
    if (isComplete || showCacheNotice) {
      return null;
    }

    const currentProgress =
      progress.phase === 'retrying'
        ? {
            total: progress.retryTotalLogs ?? 0,
            completed: (progress.retryTotalLogs ?? 0) - progress.retryingLogs
          }
        : {
            total: progress.targetLogs,
            completed: progress.scannedLogs
          };

    if (!currentProgress.total || currentProgress.completed <= 0 || currentProgress.completed >= currentProgress.total) {
      return null;
    }

    const recentSamples = progressSamplesRef.current.filter(
      (sample) =>
        sample.phase === progress.phase &&
        sample.total === currentProgress.total &&
        scanNow - sample.at <= 12000
    );

    if (recentSamples.length < 2) {
      return null;
    }

    const firstSample = recentSamples[0];
    const lastSample = recentSamples[recentSamples.length - 1];
    const completedDelta = lastSample.completed - firstSample.completed;
    const timeDelta = lastSample.at - firstSample.at;

    if (completedDelta <= 0 || timeDelta < 1500) {
      return null;
    }

    const ratePerMs = completedDelta / timeDelta;

    if (ratePerMs <= 0) {
      return null;
    }

    return `ETA ${formatEtaLabel((currentProgress.total - currentProgress.completed) / ratePerMs)}`;
  }, [
    isComplete,
    progress.phase,
    progress.retryTotalLogs,
    progress.retryingLogs,
    progress.scannedLogs,
    progress.targetLogs,
    scanNow,
    showCacheNotice
  ]);
  const displayStatus = statusText || 'Preparing scan...';
  const displayStatusWithEta = scanEtaLabel ? `${displayStatus} (${scanEtaLabel})` : displayStatus;

  function beginLookup(skipCache = false) {
    const token = activeToken.current + 1;
    activeToken.current = token;

    setMessages([]);
    setFilter('all');
    setMessageQuery('');
    setStats(EMPTY_STATS);
    setProgress(buildProgress());
    setClassTotals({});
    setFatalError(null);
    setIsBooting(true);
    setShowCacheNotice(false);
    setRenderedMessageCount(MESSAGE_RENDER_BATCH);
    setIsRefreshModalOpen(false);
    progressSamplesRef.current = [];
    setScanNow(Date.now());

    const cached = skipCache ? null : getCachedPlayerScan(steamId);

    if (cached) {
      progressSamplesRef.current = [];
      setMessages(cached.messages);
      setStats(cached.stats);
      setClassTotals(cached.classTotals);
      setProgress({
        ...cached.progress,
        phase: 'cached',
        retryingLogs: 0
      });
      setShowCacheNotice(true);
      setIsBooting(false);
      return token;
    }

    void loadAllLogs(token);
    return token;
  }

  useEffect(() => {
    beginLookup();
  }, [steamId]);

  useEffect(() => {
    if (!showCacheNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowCacheNotice(false);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showCacheNotice]);

  useEffect(() => {
    if (isComplete || isBooting || showCacheNotice) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setScanNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isBooting, isComplete, showCacheNotice]);

  useEffect(() => {
    const sample =
      progress.phase === 'retrying'
        ? {
            phase: progress.phase,
            completed: (progress.retryTotalLogs ?? 0) - progress.retryingLogs,
            total: progress.retryTotalLogs ?? 0,
            at: Date.now()
          }
        : {
            phase: progress.phase,
            completed: progress.scannedLogs,
            total: progress.targetLogs,
            at: Date.now()
          };

    if (!sample.total || sample.completed < 0) {
      return;
    }

    progressSamplesRef.current = [...progressSamplesRef.current, sample].filter(
      (entry) => entry.phase === sample.phase && entry.total === sample.total && sample.at - entry.at <= 12000
    );
    setScanNow(sample.at);
  }, [progress.phase, progress.retryTotalLogs, progress.retryingLogs, progress.scannedLogs, progress.targetLogs]);

  useEffect(() => {
    setRenderedMessageCount(MESSAGE_RENDER_BATCH);
  }, [filter, isComplete, messageQuery, messages.length]);

  useEffect(() => {
    if (!isComplete || !hasMoreVisibleMessages || !loadMoreMessagesRef.current) {
      return;
    }

    const node = loadMoreMessagesRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRenderedMessageCount((previous) =>
            Math.min(previous + MESSAGE_RENDER_BATCH, filteredMessages.length)
          );
        }
      },
      {
        rootMargin: '300px 0px'
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [filteredMessages.length, hasMoreVisibleMessages, isComplete]);

  async function fetchLogsPage(offset: number) {
    return fetchRouteJson<LogsListResponse>(`/api/logs?steamid=${steamId}&offset=${offset}`, PAGE_RETRIES);
  }

  async function listAllLogs(token: number) {
    const allLogs: LogsListEntry[] = [];
    let total = 0;
    let offset = 0;

    while (true) {
      const page = await fetchLogsPage(offset);

      if (activeToken.current !== token) {
        return null;
      }

      total = page.total || total;
      allLogs.push(...page.logs);

      setStats((previous) => ({
        ...previous,
        totalLogs: total
      }));
      setProgress(
        buildProgress({
          phase: 'listing',
          scannedLogs: allLogs.length,
          targetLogs: total
        })
      );

      if (!page.logs.length || allLogs.length >= total || page.logs.length < LOGS_PAGE_SIZE) {
        break;
      }

      offset += LOGS_PAGE_SIZE;
    }

    return {
      logs: allLogs,
      total: total || allLogs.length
    };
  }

  async function scanLogsPass(
    token: number,
    logs: LogsListEntry[],
    retries: number,
    liveMessages: ScannedMessage[],
    liveStats: PlayerStats,
    liveClassTotals: ClassTotals,
    scannedState: { scannedLogs: number; failedLogs: number; flaggedMessages: number },
    phase: 'scanning' | 'retrying'
  ) {
    const failedLogs: LogsListEntry[] = [];
    const steamSid3 = sid64ToSid3(steamId);

    await runConcurrent(logs, LOG_CONCURRENCY, async (log) => {
      try {
        const payload = await fetchRouteJson<LogDetailResponse>(`/api/log?id=${log.id}`, retries);

        if (activeToken.current !== token) {
          return;
        }

        const collected = collectMessages(log, payload, steamId);
        const categoryCounts = countCategoryMatches(collected);

        liveMessages.push(...collected);
        liveStats.totalMessages += categoryCounts.totalMessages;
        liveStats.racial += categoryCounts.racial;
        liveStats.bigotry += categoryCounts.bigotry;
        liveStats.generic += categoryCounts.generic;
        scannedState.flaggedMessages = liveStats.racial + liveStats.bigotry + liveStats.generic;

        const nextClassTotals = appendClassTotals(liveClassTotals, payload, steamSid3);
        Object.assign(liveClassTotals, nextClassTotals);

        setStats({ ...liveStats });
        setClassTotals({ ...liveClassTotals });
      } catch {
        if (activeToken.current !== token) {
          return;
        }

        failedLogs.push(log);
      } finally {
        if (activeToken.current !== token) {
          return;
        }

        scannedState.scannedLogs += 1;
        scannedState.failedLogs = failedLogs.length;

        setProgress(
          buildProgress({
            phase,
            scannedLogs: phase === 'retrying' ? liveStats.totalLogs : scannedState.scannedLogs,
            targetLogs: liveStats.totalLogs,
            failedLogs: failedLogs.length,
            retryingLogs: phase === 'retrying' ? Math.max(logs.length - scannedState.scannedLogs, 0) : 0,
            retryTotalLogs: phase === 'retrying' ? logs.length : undefined,
            flaggedMessages: scannedState.flaggedMessages
          })
        );
      }
    });

    return failedLogs;
  }

  async function loadAllLogs(token: number) {
    try {
      const listed = await listAllLogs(token);

      if (!listed || activeToken.current !== token) {
        return;
      }

      if (!listed.logs.length) {
        setFatalError('No logs found for this player on logs.tf.');
        setIsBooting(false);
        return;
      }

      const liveMessages: ScannedMessage[] = [];
      const liveStats = createLiveStats(listed.total);
      const liveClassTotals: ClassTotals = {};
      const scannedState = {
        scannedLogs: 0,
        failedLogs: 0,
        flaggedMessages: 0
      };

      setStats(liveStats);
      setProgress(
        buildProgress({
          phase: 'scanning',
          targetLogs: listed.total
        })
      );

      const retryLogs = await scanLogsPass(
        token,
        listed.logs,
        DETAIL_RETRIES,
        liveMessages,
        liveStats,
        liveClassTotals,
        scannedState,
        'scanning'
      );

      if (activeToken.current !== token) {
        return;
      }

      let finalFailedLogs = retryLogs;

      if (retryLogs.length) {
        scannedState.scannedLogs = 0;
        setProgress(
          buildProgress({
            phase: 'retrying',
            scannedLogs: listed.total,
            targetLogs: listed.total,
            failedLogs: retryLogs.length,
            retryingLogs: retryLogs.length,
            retryTotalLogs: retryLogs.length,
            flaggedMessages: scannedState.flaggedMessages
          })
        );

        finalFailedLogs = await scanLogsPass(
          token,
          retryLogs,
          DETAIL_RETRIES + 1,
          liveMessages,
          liveStats,
          liveClassTotals,
          scannedState,
          'retrying'
        );
      }

      if (activeToken.current !== token) {
        return;
      }

      const finalMessages = [...liveMessages].sort((left, right) => right.date - left.date);
      const finalProgress = buildProgress({
        phase: 'complete',
        scannedLogs: listed.total,
        targetLogs: listed.total,
        failedLogs: finalFailedLogs.length,
        retryTotalLogs: 0,
        flaggedMessages: liveStats.racial + liveStats.bigotry + liveStats.generic
      });

      setMessages(finalMessages);
      setStats({ ...liveStats });
      setClassTotals({ ...liveClassTotals });
      setProgress(finalProgress);
      setShowCacheNotice(false);

      setCachedPlayerScan({
        steamId,
        messages: finalMessages,
        stats: deriveStats(finalMessages, listed.total),
        classTotals: liveClassTotals,
        progress: finalProgress,
        completedAt: Date.now(),
        lastAccessedAt: Date.now()
      });
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : 'Failed to fetch logs.');
    } finally {
      if (activeToken.current === token) {
        progressSamplesRef.current = [];
        setIsBooting(false);
      }
    }
  }

  function handleRefreshCache() {
    removeCachedPlayerScan(steamId);
    beginLookup(true);
  }

  if (fatalError) {
    return <div className="status-text error">{fatalError}</div>;
  }

  return (
    <section className="player-body">
      <div className="player-left">
        <CategoryStats stats={stats} />

        <div className="log-stats">
          <span>
            Logs: <strong data-testid="total-logs">{stats.totalLogs.toLocaleString()}</strong>
          </span>
          <span>
            Messages: <strong data-testid="total-messages">{stats.totalMessages.toLocaleString()}</strong>
          </span>
        </div>

        {!(!isBooting && !statusText) ? (
          <div className={`scan-status${showCacheNotice ? ' cache-hit' : ''}`} data-testid="scan-progress">
            {displayStatusWithEta}
          </div>
        ) : null}

        {!isComplete ? (
          <div className="scan-progressbar" aria-hidden="true">
            <div className="scan-progressbar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        ) : null}

        {isComplete ? (
          <>
            <div className="message-tools">
              <div className="message-search-wrap">
                <input
                  value={messageQuery}
                  onChange={(event) => setMessageQuery(event.target.value)}
                  placeholder="Search messages"
                  className="message-search-input"
                  aria-label="Search messages"
                  spellCheck={false}
                />
              </div>
              <button
                type="button"
                className="refresh-cache-button"
                onClick={() => setIsRefreshModalOpen(true)}
              >
                Refresh results
              </button>
            </div>
            <FilterTabs value={filter} onChange={setFilter} />
            <div className="message-window-status">
              Showing {visibleMessages.length.toLocaleString()} of {filteredMessages.length.toLocaleString()}
            </div>
            <MessageTable messages={visibleMessages} />
            {hasMoreVisibleMessages ? (
              <div ref={loadMoreMessagesRef} className="message-scroll-loader">
                Loading more messages...
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="player-right">
        <ClassModel classKey={topClass} />
      </div>

      {isRefreshModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsRefreshModalOpen(false)}>
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="refresh-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="refresh-modal-title">Refresh saved results?</h2>
            <p>This clears the saved scan for this player and reloads fresh data from logs.tf.</p>
            <div className="confirm-modal-actions">
              <button type="button" className="modal-button" onClick={() => setIsRefreshModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="modal-button modal-button-danger" onClick={handleRefreshCache}>
                Refresh now
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
