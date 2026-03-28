import { Logo } from '@/components/Logo';
import { SearchBar } from '@/components/SearchBar';
import { hasSteamApiKey } from '@/lib/steam';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const vanityLookupEnabled = hasSteamApiKey();

  return (
    <main className="home-page">
      <Logo linked={false} />
      <SearchBar
        vanityLookupEnabled={vanityLookupEnabled}
        placeholder={vanityLookupEnabled ? 'Player or SteamId64' : 'SteamID64'}
      />
    </main>
  );
}
