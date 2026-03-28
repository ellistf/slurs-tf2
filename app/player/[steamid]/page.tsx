import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PlayerData } from '@/components/PlayerData';
import { PlayerHeader } from '@/components/PlayerHeader';
import { getPlayerSummary } from '@/lib/steam';
import { isSteamId64 } from '@/lib/validation';

export const dynamic = 'force-dynamic';

interface PlayerPageProps {
  params: {
    steamid: string;
  };
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  if (!isSteamId64(params.steamid)) {
    return { title: 'Invalid Player - Slurs.tf2' };
  }

  const profile = await getPlayerSummary(params.steamid).catch(() => null);

  return {
    title: `${profile?.name || params.steamid} - Slurs.tf2`
  };
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const steamId = params.steamid;

  if (!isSteamId64(steamId)) {
    notFound();
  }

  const profile = await getPlayerSummary(steamId).catch(() => null);

  return (
    <main className="player-page">
      <PlayerHeader steamId={steamId} profile={profile} />
      <PlayerData steamId={steamId} />
    </main>
  );
}
