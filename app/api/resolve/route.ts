import { NextResponse } from 'next/server';

import { hasSteamApiKey, resolveVanity } from '@/lib/steam';
import { extractVanityInput } from '@/lib/validation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vanity = extractVanityInput(searchParams.get('vanity') ?? '');

  if (!vanity) {
    return NextResponse.json({ error: 'Missing vanity value' }, { status: 400 });
  }

  if (!hasSteamApiKey()) {
    return NextResponse.json(
      { error: 'Vanity URL lookup is unavailable. Enter a SteamID64 instead.' },
      { status: 503 }
    );
  }

  try {
    const steamid = await resolveVanity(vanity);

    if (!steamid) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    return NextResponse.json({ steamid });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve vanity URL' },
      { status: 500 }
    );
  }
}
