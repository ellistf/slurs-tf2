import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PlayerData } from '@/components/PlayerData';
import { clearPlayerCache } from '@/lib/player-cache';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('PlayerData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearPlayerCache();
  });

  it('waits for the full scan before rendering rows, then filters locally with bold matches', async () => {
    const log1 = deferred<Response>();
    const log2 = deferred<Response>();

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/logs?steamid=76561197960265729&offset=0')) {
        return Promise.resolve(
          jsonResponse({
            success: true,
            results: 2,
            total: 2,
            logs: [
              { id: 101, title: 'Log 101', date: 100 },
              { id: 102, title: 'Log 102', date: 200 }
            ]
          })
        );
      }

      if (url.includes('/api/log?id=101')) {
        return log1.promise;
      }

      if (url.includes('/api/log?id=102')) {
        return log2.promise;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<PlayerData steamId="76561197960265729" />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/logs?steamid=76561197960265729&offset=0',
        expect.objectContaining({ cache: 'no-store' })
      );
    });

    act(() => {
      log1.resolve(
        jsonResponse({
          success: true,
          chat: [{ steamid: '[U:1:1]', msg: 'n1.gg3r' }],
          players: {
            '[U:1:1]': {
              class_stats: [{ type: 'scout', total_time: 30 }]
            }
          }
        })
      );
    });

    await waitFor(() => expect(screen.getByTestId('racial-count')).toHaveTextContent('1'));
    expect(screen.queryByText('n1.gg3r')).not.toBeInTheDocument();

    act(() => {
      log2.resolve(
        jsonResponse({
          success: true,
          chat: [{ steamid: '[U:1:1]', msg: 'hello there' }],
          players: {
            '[U:1:1]': {
              class_stats: [{ type: 'pyro', total_time: 40 }]
            }
          }
        })
      );
    });

    await waitFor(() => expect(screen.getByText('hello there')).toBeInTheDocument());
    expect(screen.getByText('n1.gg3r', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByTestId('top-class')).toHaveTextContent('pyro');

    const fetchCountBeforeFilter = fetchMock.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Flagged only' }));
    expect(fetchMock.mock.calls.length).toBe(fetchCountBeforeFilter);
    expect(screen.getByText('n1.gg3r', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText('hello there')).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: 'Search messages' }), 'n1.');
    expect(fetchMock.mock.calls.length).toBe(fetchCountBeforeFilter);
    expect(screen.getByText('n1.gg3r', { selector: 'strong' })).toBeInTheDocument();
  });

  it('restores the previous full scan from the client cache without refetching', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/logs?steamid=76561197960265729&offset=0')) {
        return Promise.resolve(
          jsonResponse({
            success: true,
            results: 1,
            total: 1,
            logs: [{ id: 301, title: 'Log 301', date: 100 }]
          })
        );
      }

      if (url.includes('/api/log?id=301')) {
        return Promise.resolve(
          jsonResponse({
            success: true,
            chat: [{ steamid: '[U:1:1]', msg: 'faggot' }],
            players: {
              '[U:1:1]': {
                class_stats: [{ type: 'medic', total_time: 20 }]
              }
            }
          })
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const firstRender = render(<PlayerData steamId="76561197960265729" />);
    await waitFor(() => expect(screen.getByText('faggot', { selector: 'strong' })).toBeInTheDocument());
    firstRender.unmount();

    fetchMock.mockClear();

    render(<PlayerData steamId="76561197960265729" />);

    await waitFor(() =>
      expect(screen.getByText('Saved results loaded.')).toBeInTheDocument()
    );
    expect(screen.getByText('faggot', { selector: 'strong' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3600));
    });
    expect(screen.queryByText('Saved results loaded.')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Refresh results' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Refresh now' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/logs?steamid=76561197960265729&offset=0',
        expect.objectContaining({ cache: 'no-store' })
      )
    );
  }, 10000);

  it('keeps successful results when one log detail request still fails after retries', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/logs?steamid=76561197960265729&offset=0')) {
        return Promise.resolve(
          jsonResponse({
            success: true,
            results: 2,
            total: 2,
            logs: [
              { id: 201, title: 'Log 201', date: 100 },
              { id: 202, title: 'Log 202', date: 200 }
            ]
          })
        );
      }

      if (url.includes('/api/log?id=201')) {
        return Promise.resolve(
          jsonResponse({
            success: true,
            chat: [{ steamid: '[U:1:1]', msg: 'faggot' }],
            players: {
              '[U:1:1]': {
                class_stats: [{ type: 'medic', total_time: 20 }]
              }
            }
          })
        );
      }

      if (url.includes('/api/log?id=202')) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'bad gateway' }), { status: 502 }));
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<PlayerData steamId="76561197960265729" />);

    await waitFor(
      () => expect(screen.getByTestId('scan-progress')).toHaveTextContent('Loaded 2 logs - 1 failed'),
      { timeout: 5000 }
    );
    expect(screen.getByText('faggot', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByTestId('bigotry-count')).toHaveTextContent('1');
  });
});
