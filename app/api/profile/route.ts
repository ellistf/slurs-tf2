import { NextResponse } from 'next/server';

import { getPlayerSummary } from '@/lib/steam';
import { isSteamId64 } from '@/lib/validation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const steamid = searchParams.get('steamid') ?? '';

  if (!isSteamId64(steamid)) {
    return NextResponse.json({ error: 'Invalid SteamID64' }, { status: 400 });
  }

  try {
    const profile = await getPlayerSummary(steamid);

    if (!profile) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      countryCode: profile.countryCode,
      regionLabel: profile.regionLabel,
      flagCode: profile.flagCode,
      regionSource: profile.regionSource
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
