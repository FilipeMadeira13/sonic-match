import type { MBRelease } from '@/types/album';

const MB_BASE = 'https://musicbrainz.org/ws/2';
const CAA_BASE = 'https://coverartarchive.org/release';
const USER_AGENT = 'SonicMatch/1.0 (cfilipemadeira@gmail.com)';

const MB_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'application/json',
};

// Reissue suffixes that are acceptable variants of the original album
const REISSUE_PATTERNS = [
  /\s*\(remastered[^)]*\)$/i,
  /\s*\(deluxe[^)]*\)$/i,
  /\s*\(super deluxe[^)]*\)$/i,
  /\s*\(anniversary[^)]*\)$/i,
  /\s*\(expanded[^)]*\)$/i,
  /\s*\(special[^)]*\)$/i,
  /\s*\[remastered[^\]]*\]$/i,
  /\s*\[deluxe[^\]]*\]$/i,
];

function scoreAlbumMatch(candidate: string, target: string): number {
  const c = candidate.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  if (c === t) return 3; // exact match

  // Strip known reissue suffixes from candidate and check if it matches target
  let stripped = c;
  for (const pattern of REISSUE_PATTERNS) {
    stripped = stripped.replace(pattern, '').trim();
  }
  if (stripped === t) return 2; // exact after stripping reissue suffix

  // candidate starts with target followed by " (" → some other variant
  if (c.startsWith(t + ' (') || c.startsWith(t + ' [')) return 1;

  return 0; // doesn't match (catches "Mindcrime II" when target is "Mindcrime")
}

// ─── Album Search ─────────────────────────────────────────────────────────────

export async function searchAlbums(query: string): Promise<MBRelease[]> {
  if (!query || query.trim().length < 2) return [];

  const [mbResult, itunesResult] = await Promise.allSettled([
    searchMusicBrainz(query),
    searchItunesAlbums(query),
  ]);

  const mb = mbResult.status === 'fulfilled' ? mbResult.value : [];
  const itunes = itunesResult.status === 'fulfilled' ? itunesResult.value : [];

  const seen = new Set<string>();
  const merged: MBRelease[] = [];
  for (const r of [...mb, ...itunes]) {
    const key = `${r.artist.toLowerCase()}|${r.title.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }

  return merged.slice(0, 10);
}

function parseYearFromQuery(query: string): { year: string | null; queryWithoutYear: string } {
  const match = query.match(/\b(19\d{2}|20\d{2})\b/);
  if (!match) return { year: null, queryWithoutYear: query.trim() };
  const year = match[0];
  const queryWithoutYear = query.replace(year, '').replace(/\s+/g, ' ').trim();
  return { year, queryWithoutYear };
}

async function searchMusicBrainz(query: string): Promise<MBRelease[]> {
  const { year, queryWithoutYear } = parseYearFromQuery(query);

  if (year) {
    // Strategy A: full text + year filter
    const qA = encodeURIComponent(`${queryWithoutYear} AND date:${year}`);
    // Strategy B: treat first word as artist + year (helps "rush rush 1974" → artist:rush date:1974)
    const firstWord = queryWithoutYear.split(/\s+/)[0];
    const qB = encodeURIComponent(`artist:"${firstWord}" AND date:${year}`);

    const [rA, rB] = await Promise.allSettled([
      fetchMusicBrainzReleases(qA, 5),
      fetchMusicBrainzReleases(qB, 3),
    ]);

    const resultsA = rA.status === 'fulfilled' ? rA.value : [];
    const resultsB = rB.status === 'fulfilled' ? rB.value : [];

    const seen = new Set<string>();
    const merged: MBRelease[] = [];
    for (const r of [...resultsA, ...resultsB]) {
      const key = `${r.artist.toLowerCase()}|${r.title.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(r);
      }
    }
    return merged.slice(0, 5);
  }

  // No year: plain text search
  const encoded = encodeURIComponent(query.trim());
  return fetchMusicBrainzReleases(encoded, 5);
}

async function fetchMusicBrainzReleases(encodedQuery: string, limit: number): Promise<MBRelease[]> {
  const url = `${MB_BASE}/release?query=${encodedQuery}&limit=${limit}&fmt=json`;
  try {
    const res = await fetch(url, {
      headers: MB_HEADERS,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const releases: unknown[] = data.releases ?? [];

    return releases.map((r: unknown): MBRelease => {
      const rel = r as Record<string, unknown>;
      const credits = rel['artist-credit'] as Array<Record<string, unknown>> | undefined;
      const firstCredit = credits?.[0];
      const artistName =
        (firstCredit?.name as string | undefined) ??
        ((firstCredit?.artist as Record<string, string> | undefined)?.name) ??
        'Artista desconhecido';

      return {
        id: rel.id as string,
        title: rel.title as string,
        artist: artistName,
        date: (rel.date as string | undefined)?.substring(0, 4),
      };
    });
  } catch {
    return [];
  }
}

async function searchItunesAlbums(query: string): Promise<MBRelease[]> {
  const { year, queryWithoutYear } = parseYearFromQuery(query);
  const term = encodeURIComponent((year ? queryWithoutYear : query).trim());
  const url = `https://itunes.apple.com/search?term=${term}&entity=album&media=music&limit=5`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];

    const data = await res.json();
    let results = (data.results as Array<Record<string, unknown>>) ?? [];

    // Filter by year when present in query
    if (year) {
      results = results.filter(
        (r) => !r.releaseDate || String(r.releaseDate).startsWith(year)
      );
    }

    return results.map((r): MBRelease => ({
      id: `itunes-${r.collectionId}`,
      title: r.collectionName as string,
      artist: r.artistName as string,
      date: r.releaseDate ? String(r.releaseDate).substring(0, 4) : undefined,
    }));
  } catch {
    return [];
  }
}

function artistMatches(candidate: string, target: string): boolean {
  const c = candidate.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  return c === t || c.includes(t) || t.includes(c);
}

// ─── Cover Resolution + Streaming Links ──────────────────────────────────────

import type { StreamingLinks } from '@/types/album';

export interface CoverResult {
  coverUrl?: string;
  links: StreamingLinks;
}

function buildSearchLinks(artist: string, album: string): StreamingLinks {
  const q = encodeURIComponent(`${artist} ${album}`);
  return {
    spotify: `https://open.spotify.com/search/${q}/albums`,
    appleMusic: `https://music.apple.com/search?term=${q}`,
    deezer: `https://www.deezer.com/search/${q}`,
    youtubeMusic: `https://music.youtube.com/search?q=${q}`,
    tidal: `https://listen.tidal.com/search?q=${q}&type=albums`,
  };
}

export async function resolveCoverWithFallbacks(
  artist: string,
  album: string
): Promise<CoverResult> {
  const base = buildSearchLinks(artist, album);

  const itunesResult = await fetchItunesCover(artist, album);
  const deezerResult = await fetchDeezerCover(artist, album);
  const mbCover = !itunesResult?.coverUrl && !deezerResult?.coverUrl
    ? await resolveMusicBrainzCover(artist, album)
    : undefined;

  return {
    coverUrl: itunesResult?.coverUrl ?? deezerResult?.coverUrl ?? mbCover,
    links: {
      spotify: base.spotify,
      appleMusic: itunesResult?.appleMusicUrl ?? base.appleMusic,
      deezer: deezerResult?.deezerUrl ?? base.deezer,
      youtubeMusic: base.youtubeMusic,
      tidal: base.tidal,
    },
  };
}

async function fetchItunesCover(
  artist: string,
  album: string
): Promise<{ coverUrl?: string; appleMusicUrl?: string } | undefined> {
  const term = encodeURIComponent(`${artist} ${album}`);
  const url = `https://itunes.apple.com/search?term=${term}&entity=album&media=music&limit=15`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return undefined;

    const data = await res.json();
    const results = (data.results as Array<Record<string, string>>) ?? [];
    if (results.length === 0) return undefined;

    const artistMatched = results.filter((r) =>
      artistMatches(r.artistName ?? '', artist)
    );
    if (artistMatched.length === 0) return undefined;

    const scored = artistMatched
      .map((r) => ({ r, score: scoreAlbumMatch(r.collectionName ?? '', album) }))
      .sort((a, b) => b.score - a.score);

    const best = scored.find((s) => s.score >= 1)?.r;
    if (!best) return undefined;

    return {
      coverUrl: best.artworkUrl100
        ? best.artworkUrl100.replace('100x100bb', '600x600bb')
        : undefined,
      appleMusicUrl: best.collectionViewUrl ?? undefined,
    };
  } catch {
    return undefined;
  }
}

async function fetchDeezerCover(
  artist: string,
  album: string
): Promise<{ coverUrl?: string; deezerUrl?: string } | undefined> {
  const q = encodeURIComponent(`${artist} ${album}`);
  const url = `https://api.deezer.com/search/album?q=${q}&limit=15`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return undefined;

    const data = await res.json();
    const hits = (data.data as Array<Record<string, unknown>>) ?? [];
    if (hits.length === 0) return undefined;

    const artistMatched = hits.filter((r) =>
      artistMatches(
        String((r.artist as Record<string, string> | undefined)?.name ?? r.artist ?? ''),
        artist
      )
    );
    if (artistMatched.length === 0) return undefined;

    const scored = artistMatched
      .map((r) => ({ r, score: scoreAlbumMatch(String(r.title ?? ''), album) }))
      .sort((a, b) => b.score - a.score);

    const best = scored.find((s) => s.score >= 1)?.r;
    if (!best) return undefined;

    return {
      coverUrl: (best.cover_big as string) ?? (best.cover_medium as string) ?? undefined,
      deezerUrl: (best.link as string) ?? undefined,
    };
  } catch {
    return undefined;
  }
}

async function resolveMusicBrainzCover(
  artist: string,
  album: string
): Promise<string | undefined> {
  const query = encodeURIComponent(`release:"${album}" AND artist:"${artist}"`);
  const url = `${MB_BASE}/release?query=${query}&limit=1&fmt=json`;

  try {
    const res = await fetch(url, {
      headers: MB_HEADERS,
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return undefined;

    const data = await res.json();
    const release = (data.releases as Array<Record<string, string>> | undefined)?.[0];
    if (!release?.id) return undefined;

    const coverUrl = `${CAA_BASE}/${release.id}/front-500`;
    const coverRes = await fetch(coverUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    if (!coverRes.ok) return undefined;
    return coverRes.url;
  } catch {
    return undefined;
  }
}
