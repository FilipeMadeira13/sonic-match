import type { MBRelease } from '@/types/album';

export interface SimilarArtist {
  name: string;
  match: number;
}

export interface AlbumTagContext {
  artist: string;
  album: string;
  tags: string[];
}

const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';

async function fetchSimilarArtists(artist: string, apiKey: string): Promise<SimilarArtist[]> {
  const url = `${LASTFM_BASE}?method=artist.getSimilar&artist=${encodeURIComponent(artist)}&limit=15&api_key=${apiKey}&format=json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const artists = data.similarartists?.artist as Array<{ name: string; match: string }> | undefined;
    return (artists ?? []).map((a) => ({ name: a.name, match: parseFloat(a.match) }));
  } catch {
    return [];
  }
}

async function fetchAlbumTags(artist: string, album: string, apiKey: string): Promise<string[]> {
  const url =
    `${LASTFM_BASE}?method=album.getTopTags` +
    `&artist=${encodeURIComponent(artist)}` +
    `&album=${encodeURIComponent(album)}` +
    `&api_key=${apiKey}&format=json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const tags = data.toptags?.tag as Array<{ name: string; count: number }> | undefined;
    return (tags ?? [])
      .filter((t) => t.count > 0)
      .map((t) => t.name.toLowerCase())
      // Remove year tags (e.g. "1993") and very generic non-sonic tags
      .filter((name) => !/^\d{4}s?$/.test(name) && name !== 'albums i own')
      .slice(0, 8);
  } catch {
    return [];
  }
}

export async function getSimilarArtists(
  seedArtists: string[],
  apiKey: string
): Promise<SimilarArtist[]> {
  if (!apiKey || seedArtists.length === 0) return [];

  const unique = [...new Set(seedArtists.map((a) => a.toLowerCase().trim()))];
  const seedSet = new Set(unique);

  const results = await Promise.allSettled(
    unique.map((a) => fetchSimilarArtists(a, apiKey))
  );

  const scoreMap = new Map<string, { total: number; count: number; displayName: string }>();

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const { name, match } of result.value) {
      const key = name.toLowerCase().trim();
      if (seedSet.has(key)) continue;

      const existing = scoreMap.get(key);
      if (existing) {
        existing.total += match;
        existing.count += 1;
      } else {
        scoreMap.set(key, { total: match, count: 1, displayName: name });
      }
    }
  }

  return [...scoreMap.entries()]
    .map(([, { total, count, displayName }]) => ({
      name: displayName,
      match: total / count,
    }))
    .sort((a, b) => b.match - a.match)
    .slice(0, 25);
}

export async function getAlbumTagContexts(
  albums: MBRelease[],
  apiKey: string
): Promise<AlbumTagContext[]> {
  if (!apiKey || albums.length === 0) return [];

  const results = await Promise.allSettled(
    albums.map(async (a): Promise<AlbumTagContext> => ({
      artist: a.artist,
      album: a.title,
      tags: await fetchAlbumTags(a.artist, a.title, apiKey),
    }))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<AlbumTagContext> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((ctx) => ctx.tags.length > 0);
}
