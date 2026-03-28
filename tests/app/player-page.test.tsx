import { render, screen } from '@testing-library/react';

import PlayerPage from '@/app/player/[steamid]/page';
import { getPlayerSummary } from '@/lib/steam';

vi.mock('@/lib/steam', () => ({
  getPlayerSummary: vi.fn()
}));

vi.mock('@/components/PlayerData', () => ({
  PlayerData: ({ steamId }: { steamId: string }) => <div data-testid="player-data-stub">{steamId}</div>
}));

vi.mock('@/components/SearchBar', () => ({
  SearchBar: () => <div data-testid="player-search-stub" />
}));

describe('player page', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a degraded header when the Steam profile lookup fails', async () => {
    vi.mocked(getPlayerSummary).mockResolvedValue(null);

    const page = await PlayerPage({
      params: {
        steamid: '76561197960265729'
      }
    });

    render(page);

    expect(screen.getByRole('heading', { name: '76561197960265729' })).toBeInTheDocument();
    expect(screen.getByTestId('player-data-stub')).toHaveTextContent('76561197960265729');
  });
});
