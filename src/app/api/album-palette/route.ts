import { NextRequest, NextResponse } from 'next/server';
import { extractPalette } from '@/lib/color';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url') ?? '';

  try {
    const parsed = new URL(url);
    const isAllowed =
      parsed.hostname.endsWith('.archive.org') ||
      parsed.hostname === 'archive.org' ||
      parsed.hostname === 'coverartarchive.org';

    if (!isAllowed) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const palette = await extractPalette(url);

  return NextResponse.json(palette, {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
