import { NextRequest, NextResponse } from 'next/server';
import { searchAlbums } from '@/lib/musicbrainz';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 2) {
    return NextResponse.json({ releases: [] });
  }

  const releases = await searchAlbums(q);
  return NextResponse.json({ releases });
}
