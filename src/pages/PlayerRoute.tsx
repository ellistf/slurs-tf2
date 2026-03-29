import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { PlayerData } from '@/components/PlayerData';
import { PlayerHeader } from '@/components/PlayerHeader';
import type { PlayerProfile } from '@/types';
import { isSteamId64 } from '@/lib/validation';

export function PlayerRoute() {
  const { steamid = '' } = useParams();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSteamId64(steamid)) {
      document.title = 'Invalid Player - Slurs.tf2';
      return;
    }

    document.title = `${steamid} - Slurs.tf2`;
    setProfile(null);
    setProfileError(null);

    void window.slursApi?.getProfile(steamid)
      .then((nextProfile) => {
        setProfile(nextProfile);
        document.title = `${nextProfile?.name || steamid} - Slurs.tf2`;
      })
      .catch((error) => {
        setProfileError(error instanceof Error ? error.message : 'Failed to fetch profile.');
      });
  }, [steamid]);

  if (!isSteamId64(steamid)) {
    return (
      <main className="player-page">
        <div className="status-text error">Invalid SteamID64.</div>
      </main>
    );
  }

  return (
    <main className="player-page">
      <PlayerHeader steamId={steamid} profile={profile} />
      {profileError ? <div className="status-text error">{profileError}</div> : null}
      <PlayerData steamId={steamid} />
    </main>
  );
}
