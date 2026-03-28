import { GET } from '@/app/api/logs/route';

describe('/api/logs', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns 400 for invalid query params', async () => {
    const response = await GET(new Request('http://localhost/api/logs?steamid=bad&offset=wat'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid query parameters' });
  });

  it('translates upstream failures into 502 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('upstream error', { status: 500 })));

    const response = await GET(
      new Request('http://localhost/api/logs?steamid=76561197960265729&offset=0')
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: 'Upstream request failed with status 500'
    });
  });
});
