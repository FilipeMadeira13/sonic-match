export interface MBRelease {
  id: string;
  title: string;
  artist: string;
  date?: string;
  coverUrl?: string;
}

export interface TasteProfile {
  albums: MBRelease[];
  freeText?: string;
}

export interface AlbumPalette {
  vibrant: string;
  darkVibrant: string;
  muted: string;
  darkMuted: string;
  lightVibrant: string;
  textOnVibrant: string;
  textOnDarkVibrant: string;
}

export interface Recommendation {
  artist: string;
  album: string;
  year?: string;
  reason: string;
  mbid?: string;
  coverUrl?: string;
}

export interface RawRecommendation {
  artist: string;
  album: string;
  year?: string;
  reason: string;
}

export interface StreamingLinks {
  spotify: string;
  appleMusic: string;
  deezer: string;
  youtubeMusic: string;
  tidal: string;
}
