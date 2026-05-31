import type { MBRelease } from '@/types/album';

export interface TagWithCount {
  name: string;
  weight: number; // relative weight 1-100 vs. top tag for this album
}

export interface SimilarArtist {
  name: string;
  match: number;
}

export interface AlbumTagContext {
  artist: string;
  album: string;
  year?: string;
  tags: TagWithCount[];  // album-level sonic tags with relative weight
  artistTags: string[]; // artist's general tags (for contrast in prompt)
}

const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';

// Evaluative, personal, and meta tags with no sonic meaning
const NON_SONIC_TAGS = new Set([
  'seen live', 'albums i own', 'my favorites', 'favorites', 'favourite',
  'my collection', 'wishlist', 'owned', 'have it', 'want it', 'albums i have',
  'loved', 'love it', 'love', 'awesome', 'amazing', 'great', 'excellent',
  'good', 'bad', 'best', 'best album', 'all time favorites', 'all time favourite',
  'under 2000 listeners', 'needs love', 'needs more listeners',
  'all', 'music', 'albums', 'songs', 'album',
]);

function isNonSonicTag(name: string): boolean {
  return /^\d{4}s?$/.test(name) || NON_SONIC_TAGS.has(name);
}

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

async function fetchAlbumTags(artist: string, album: string, apiKey: string): Promise<TagWithCount[]> {
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

    const filtered = (tags ?? [])
      .filter((t) => t.count > 0)
      .map((t) => ({ name: t.name.toLowerCase(), count: t.count }))
      .filter(({ name }) => !isNonSonicTag(name))
      .slice(0, 12);

    if (filtered.length === 0) return [];
    const maxCount = filtered[0].count; // Last.fm returns sorted by count descending

    return filtered
      .map((t) => ({ name: t.name, weight: Math.round((t.count / maxCount) * 100) }))
      .slice(0, 10);
  } catch {
    return [];
  }
}

async function fetchArtistTags(artist: string, apiKey: string): Promise<string[]> {
  const url =
    `${LASTFM_BASE}?method=artist.getTopTags` +
    `&artist=${encodeURIComponent(artist)}` +
    `&api_key=${apiKey}&format=json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const tags = data.toptags?.tag as Array<{ name: string; count: number }> | undefined;

    return (tags ?? [])
      .filter((t) => t.count > 10) // only well-established artist-level tags
      .map((t) => t.name.toLowerCase())
      .filter((name) => !isNonSonicTag(name))
      .slice(0, 6);
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

  // Deduplicate artists to avoid redundant API calls
  const uniqueArtists = [...new Set(albums.map((a) => a.artist))];

  const [albumTagResults, artistTagResults] = await Promise.all([
    Promise.allSettled(
      albums.map(async (a): Promise<AlbumTagContext> => ({
        artist: a.artist,
        album: a.title,
        year: a.date?.slice(0, 4),
        tags: await fetchAlbumTags(a.artist, a.title, apiKey),
        artistTags: [], // populated after artist tag fetch
      }))
    ),
    Promise.allSettled(
      uniqueArtists.map(async (artist) => ({
        artist,
        tags: await fetchArtistTags(artist, apiKey),
      }))
    ),
  ]);

  const artistTagMap = new Map<string, string[]>();
  for (const r of artistTagResults) {
    if (r.status === 'fulfilled') {
      artistTagMap.set(r.value.artist.toLowerCase(), r.value.tags);
    }
  }

  return albumTagResults
    .filter((r): r is PromiseFulfilledResult<AlbumTagContext> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((ctx) => ctx.tags.length > 0)
    .map((ctx) => ({
      ...ctx,
      artistTags: artistTagMap.get(ctx.artist.toLowerCase()) ?? [],
    }));
}
