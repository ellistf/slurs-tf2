'use client';

import { useState } from 'react';

import { ElectronSettingsButton } from '@/components/ElectronSettingsButton';
import { Logo } from '@/components/Logo';
import { SearchBar } from '@/components/SearchBar';

export function HomePageClient({
  initialVanityLookupEnabled,
  isElectronApp
}: {
  initialVanityLookupEnabled: boolean;
  isElectronApp: boolean;
}) {
  const [vanityLookupEnabled, setVanityLookupEnabled] = useState(initialVanityLookupEnabled);

  return (
    <main className="home-page">
      {isElectronApp ? (
        <div className="home-actions">
          <ElectronSettingsButton onConfiguredChange={setVanityLookupEnabled} />
        </div>
      ) : null}
      <Logo linked={false} />
      <SearchBar
        vanityLookupEnabled={vanityLookupEnabled}
        placeholder={vanityLookupEnabled ? 'Player or SteamId64' : 'SteamID64'}
      />
    </main>
  );
}
