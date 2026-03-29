import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PlayerData } from '@/components/PlayerData';
import { clearPlayerCache } from '@/lib/player-cache';
import type { LogDetailResponse, LogsListResponse } from '@/types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function installSlursApiMock(overrides?: {
  getLogs?: (steamId: string, offset: number) => Promise<LogsListResponse>;
  getLog?: (logId: number) => Promise<LogDetailResponse>;
}) {
  const api = {
    getRuntimeInfo: vi.fn().mockResolvedValue({
      isElectronApp: true,
      steamApiKeyConfigured: true
    }),
    getElectronSettings: vi.fn().mockResolvedValue({
      steamApiKeyConfigured: true
    }),
    saveElectronSettings: vi.fn().mockResolvedValue({
      steamApiKeyConfigured: true
    }),
    resolveVanity: vi.fn().mockResolvedValue(null),
    getProfile: vi.fn().mockResolvedValue(null),
    getLogs:
      vi.fn(overrides?.getLogs ?? (() => Promise.reject(new Error('getLogs mock not configured')))),
    getLog:
      vi.fn(overrides?.getLog ?? (() => Promise.reject(new Error('getLog mock not configured'))))
  };

  Object.defineProperty(window, 'slursApi', {
    value: api,
    configurable: true,
    writable: true
  });

  return api;
}

describe('PlayerData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearPlayerCache();
    delete window.slursApi;
  });

  it('waits for the full scan before rendering rows, then filters locally with bold matches', async () => {
    const log1 = deferred<LogDetailResponse>();
    const log2 = deferred<LogDetailResponse>();

    const api = installSlursApiMock({
      getLogs: async () => ({
        success: true,
        results: 2,
        total: 2,
        logs: [
          { id: 101, title: 'Log 101', date: 100 },
          { id: 102, title: 'Log 102', date: 200 }
        ]
      }),
      getLog: (logId) => {
        if (logId === 101) {
          return log1.promise;
        }

        if (logId === 102) {
          return log2.promise;
        }

        return Promise.reject(new Error(`Unexpected log id: ${logId}`));
      }
    });

    render(<PlayerData steamId="76561197960265729" />);

    await waitFor(() => {
      expect(api.getLogs).toHaveBeenCalledWith('76561197960265729', 0);
    });

    act(() => {
      log1.resolve({
        success: true,
        chat: [{ steamid: '[U:1:1]', msg: 'n1.gg3r' }],
        players: {
          '[U:1:1]': {
            class_stats: [{ type: 'scout', total_time: 30 }]
          }
        }
      });
    });

    await waitFor(() => expect(screen.getByTestId('racial-count')).toHaveTextContent('1'));
    expect(screen.queryByText('n1.gg3r')).not.toBeInTheDocument();

    act(() => {
      log2.resolve({
        success: true,
        chat: [{ steamid: '[U:1:1]', msg: 'hello there' }],
        players: {
          '[U:1:1]': {
            class_stats: [{ type: 'pyro', total_time: 40 }]
          }
        }
      });
    });

    await waitFor(() => expect(screen.getByText('hello there')).toBeInTheDocument());
    expect(screen.getByText('n1.gg3r', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByTestId('top-class')).toHaveTextContent('pyro');

    const logCallsBeforeFilter = api.getLog.mock.calls.length;
    const logsCallsBeforeFilter = api.getLogs.mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: 'Flagged only' }));
    expect(api.getLog.mock.calls.length).toBe(logCallsBeforeFilter);
    expect(api.getLogs.mock.calls.length).toBe(logsCallsBeforeFilter);
    expect(screen.getByText('n1.gg3r', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText('hello there')).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: 'Search messages' }), 'n1.');
    expect(api.getLog.mock.calls.length).toBe(logCallsBeforeFilter);
    expect(api.getLogs.mock.calls.length).toBe(logsCallsBeforeFilter);
    expect(screen.getByText('n1.gg3r', { selector: 'strong' })).toBeInTheDocument();
  });

  it('restores the previous full scan from the client cache without refetching', async () => {
    const api = installSlursApiMock({
      getLogs: async () => ({
        success: true,
        results: 1,
        total: 1,
        logs: [{ id: 301, title: 'Log 301', date: 100 }]
      }),
      getLog: async (logId) => {
        if (logId !== 301) {
          throw new Error(`Unexpected log id: ${logId}`);
        }

        return {
          success: true,
          chat: [{ steamid: '[U:1:1]', msg: 'faggot' }],
          players: {
            '[U:1:1]': {
              class_stats: [{ type: 'medic', total_time: 20 }]
            }
          }
        };
      }
    });

    const firstRender = render(<PlayerData steamId="76561197960265729" />);
    await waitFor(() => expect(screen.getByText('faggot', { selector: 'strong' })).toBeInTheDocument());
    firstRender.unmount();

    api.getLogs.mockClear();
    api.getLog.mockClear();

    render(<PlayerData steamId="76561197960265729" />);

    await waitFor(() =>
      expect(screen.getByText('Saved results loaded.')).toBeInTheDocument()
    );
    expect(screen.getByText('faggot', { selector: 'strong' })).toBeInTheDocument();
    expect(api.getLogs).not.toHaveBeenCalled();
    expect(api.getLog).not.toHaveBeenCalled();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3600));
    });
    expect(screen.queryByText('Saved results loaded.')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Refresh results' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Refresh now' }));

    await waitFor(() => expect(api.getLogs).toHaveBeenCalledWith('76561197960265729', 0));
  }, 10000);

  it('keeps successful results when one log detail request still fails after retries', async () => {
    const api = installSlursApiMock({
      getLogs: async () => ({
        success: true,
        results: 2,
        total: 2,
        logs: [
          { id: 201, title: 'Log 201', date: 100 },
          { id: 202, title: 'Log 202', date: 200 }
        ]
      }),
      getLog: async (logId) => {
        if (logId === 201) {
          return {
            success: true,
            chat: [{ steamid: '[U:1:1]', msg: 'faggot' }],
            players: {
              '[U:1:1]': {
                class_stats: [{ type: 'medic', total_time: 20 }]
              }
            }
          };
        }

        if (logId === 202) {
          throw new Error('bad gateway');
        }

        throw new Error(`Unexpected log id: ${logId}`);
      }
    });

    render(<PlayerData steamId="76561197960265729" />);

    await waitFor(
      () => expect(screen.getByTestId('scan-progress')).toHaveTextContent('Loaded 2 logs - 1 failed'),
      { timeout: 5000 }
    );
    expect(screen.getByText('faggot', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByTestId('bigotry-count')).toHaveTextContent('1');
    expect(api.getLog.mock.calls.filter(([logId]) => logId === 202)).toHaveLength(9);
  });
});
