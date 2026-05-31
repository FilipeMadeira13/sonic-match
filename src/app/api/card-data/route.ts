import { NextRequest, NextResponse } from 'next/server';
import { resolveCoverWithFallbacks } from '@/lib/musicbrainz';
import { extractPalette, DEFAULT_PALETTE } from '@/lib/color';

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get('artist') ?? '';
  const album = req.nextUrl.searchParams.get('album') ?? '';

  if (!artist || !album) {
    return NextResponse.json({ coverUrl: null, palette: DEFAULT_PALETTE }, { status: 400 });
  }

  const { coverUrl, links } = await resolveCoverWithFallbacks(artist, album);
  const palette = coverUrl ? await extractPalette(coverUrl) : DEFAULT_PALETTE;

  return NextResponse.json(
    { coverUrl: coverUrl ?? null, palette, links },
    { headers: { 'Cache-Control': 'public, max-age=86400' } }
  );
}
