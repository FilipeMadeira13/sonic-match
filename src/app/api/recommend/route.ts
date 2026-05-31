import { NextRequest } from 'next/server';
import { streamRecommendations, synthesizeTasteDNA } from '@/lib/claude';
import { getSimilarArtists, getAlbumTagContexts } from '@/lib/lastfm';
import type { MBRelease } from '@/types/album';

export const maxDuration = 120;

export async function POST(req: NextRequest): Promise<Response> {
  let body: { albums?: MBRelease[]; freeText?: string; count?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { albums, freeText } = body;
  const count = Math.min(Math.max(Number(body.count) || 8, 1), 100);

  if (!Array.isArray(albums) || albums.length === 0) {
    return Response.json({ error: 'albums array is required' }, { status: 400 });
  }
  if (albums.length > 10) {
    return Response.json({ error: 'Maximum 10 albums allowed' }, { status: 400 });
  }

  // Fetch Last.fm signals and synthesize taste DNA in parallel — no extra latency
  const apiKey = process.env.LASTFM_API_KEY ?? '';
  const seedArtists = [...new Set(albums.map((a) => a.artist))];
  const [similarArtists, albumTagContexts, tasteDNA] = await Promise.all([
    getSimilarArtists(seedArtists, apiKey),
    getAlbumTagContexts(albums, apiKey),
    synthesizeTasteDNA(albums),
  ]);

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const rec of streamRecommendations(albums, count, freeText, similarArtists, albumTagContexts, tasteDNA)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(rec)}\n\n`));
          }
        } catch (err) {
          console.error('[recommend]', err);
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'Failed' })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    }
  );
}
