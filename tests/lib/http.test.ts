import { fetchJson } from '@/lib/http';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

describe('fetchJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('retries retryable upstream failures and eventually succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('bad gateway', { status: 502 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchJson<{ ok: boolean }>('https://example.com', { retries: 1 })).resolves.toEqual({
      ok: true
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
