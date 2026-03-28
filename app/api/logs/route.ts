import { NextResponse } from 'next/server';

import { UpstreamFetchError } from '@/lib/http';
import { getLogList } from '@/lib/logstf';
import { isSteamId64, parseOffset } from '@/lib/validation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const steamid = searchParams.get('steamid') ?? '';
  const offset = parseOffset(searchParams.get('offset'));

  if (!isSteamId64(steamid) || offset === null) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  try {
    const payload = await getLogList(steamid, offset);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof UpstreamFetchError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
