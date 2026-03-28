import { GET } from '@/app/api/profile/route';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

describe('/api/profile', () => {
  beforeEach(() => {
    process.env.STEAM_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns 400 for invalid steam ids', async () => {
    const response = await GET(new Request('http://localhost/api/profile?steamid=bad'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid SteamID64' });
  });

  it('returns normalized player profile data', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            response: {
              players: [
                {
                  steamid: '76561197960265729',
                  personaname: 'LikeASir',
                  avatarfull: 'https://avatars.steamstatic.com/avatar.png',
                  loccountrycode: 'US'
                }
              ]
            }
          })
        )
        .mockResolvedValueOnce(
          jsonResponse({
            player: {
              country: 'United States'
            },
            teams: []
          })
        )
    );

    const response = await GET(
      new Request('http://localhost/api/profile?steamid=76561197960265729')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      name: 'LikeASir',
      avatarUrl: 'https://avatars.steamstatic.com/avatar.png',
      countryCode: 'US',
      regionLabel: 'United States',
      flagCode: 'us',
      regionSource: 'ETF2L'
    });
  });

  it('falls back to ETF2L profile data when STEAM_API_KEY is missing', async () => {
    delete process.env.STEAM_API_KEY;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          player: {
            name: 'SolarLight',
            country: 'Wales',
            steam: {
              avatar: 'https://avatars.steamstatic.com/solarlight.png'
            }
          },
          teams: []
        })
      )
    );

    const response = await GET(
      new Request('http://localhost/api/profile?steamid=76561198070962612')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      name: 'SolarLight',
      avatarUrl: 'https://avatars.steamstatic.com/solarlight.png',
      countryCode: '',
      regionLabel: 'Wales',
      flagCode: 'gb-wls',
      regionSource: 'ETF2L'
    });
  });
});
