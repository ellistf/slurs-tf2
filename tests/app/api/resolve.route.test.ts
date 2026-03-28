import { GET } from '@/app/api/resolve/route';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

describe('/api/resolve', () => {
  beforeEach(() => {
    process.env.STEAM_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns 400 when vanity is missing', async () => {
    const response = await GET(new Request('http://localhost/api/resolve'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing vanity value' });
  });

  it('returns the resolved SteamID64 on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ response: { success: 1, steamid: '76561197960265729' } }))
    );

    const response = await GET(new Request('http://localhost/api/resolve?vanity=example'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ steamid: '76561197960265729' });
  });

  it('returns 503 when vanity lookup is disabled because STEAM_API_KEY is missing', async () => {
    delete process.env.STEAM_API_KEY;

    const response = await GET(new Request('http://localhost/api/resolve?vanity=example'));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'Vanity URL lookup is unavailable. Enter a SteamID64 instead.'
    });
  });

  it('returns 404 when Steam cannot resolve the vanity name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ response: { success: 42 } })));

    const response = await GET(new Request('http://localhost/api/resolve?vanity=missing-user'));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'not found' });
  });
});
