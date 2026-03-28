import { NextResponse } from 'next/server';

import { UpstreamFetchError } from '@/lib/http';
import { getLog } from '@/lib/logstf';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ?? '';

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid log id' }, { status: 400 });
  }

  try {
    const payload = await getLog(Number(id));
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof UpstreamFetchError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ error: 'Failed to fetch log' }, { status: 500 });
  }
}
