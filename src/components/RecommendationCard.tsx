'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import type { Recommendation, AlbumPalette, StreamingLinks } from '@/types/album';
import {
  SpotifyIcon,
  AppleMusicIcon,
  DeezerIcon,
  YouTubeMusicIcon,
  TidalIcon,
} from './ui/StreamingIcons';

const DEFAULT_PALETTE: AlbumPalette = {
  vibrant: '#6366f1',
  darkVibrant: '#1e1b4b',
  muted: '#64748b',
  darkMuted: '#0f172a',
  lightVibrant: '#c7d2fe',
  textOnVibrant: '#ffffff',
  textOnDarkVibrant: '#ffffff',
};

interface CardData {
  coverUrl: string | null;
  palette: AlbumPalette;
  links: StreamingLinks;
}

const STREAMING_PLATFORMS = [
  { key: 'spotify' as const, label: 'Ouvir no Spotify', Icon: SpotifyIcon },
  { key: 'appleMusic' as const, label: 'Ouvir no Apple Music', Icon: AppleMusicIcon },
  { key: 'deezer' as const, label: 'Ouvir no Deezer', Icon: DeezerIcon },
  { key: 'youtubeMusic' as const, label: 'Ouvir no YouTube Music', Icon: YouTubeMusicIcon },
  { key: 'tidal' as const, label: 'Ouvir no Tidal', Icon: TidalIcon },
];

// URI schemes to open native apps; undefined = use HTTPS Universal Link directly
const APP_SCHEMES: Partial<Record<keyof StreamingLinks, (q: string) => string>> = {
  spotify: (q) => `spotify:search:${encodeURIComponent(q)}`,
  tidal: (q) => `tidal://search?q=${encodeURIComponent(q)}`,
  deezer: (q) => `deezer://search?q=${encodeURIComponent(q)}`,
};

function openStreamingLink(
  service: keyof StreamingLinks,
  webUrl: string,
  searchQuery: string
) {
  const buildScheme = APP_SCHEMES[service];

  if (!buildScheme) {
    // Apple Music and YouTube Music: HTTPS Universal Links work natively on mobile/macOS
    window.open(webUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  const scheme = buildScheme(searchQuery);
  let done = false;

  const finish = (openWeb: boolean) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('blur', onBlur);
    if (openWeb) window.open(webUrl, '_blank', 'noopener,noreferrer');
  };

  // App opened → window loses focus (desktop) or page becomes hidden (mobile)
  const onBlur = () => finish(false);
  const onVisibility = () => { if (document.hidden) finish(false); };

  // No response after 2.5s → app not installed, open web fallback
  // Longer window needed on Windows: browser shows "Open app?" dialog before
  // switching focus, so blur/visibilitychange fire after the user confirms.
  const timer = setTimeout(() => finish(true), 2500);

  window.addEventListener('blur', onBlur, { once: true });
  document.addEventListener('visibilitychange', onVisibility);

  // Click a hidden <a> to invoke the URI scheme without navigating the current page
  const a = document.createElement('a');
  a.href = scheme;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  requestAnimationFrame(() => a.remove());
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  index: number;
}

export default function RecommendationCard({ recommendation, index }: RecommendationCardProps) {
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [imgError, setImgError] = useState(false);
  const { artist, album, year, reason } = recommendation;

  // Always available — upgraded to direct links when card data arrives
  const fallbackLinks = useMemo(() => {
    const q = encodeURIComponent(`${artist} ${album}`);
    return {
      spotify: `https://open.spotify.com/search/${q}/albums`,
      appleMusic: `https://music.apple.com/search?term=${q}`,
      deezer: `https://www.deezer.com/search/${q}`,
      youtubeMusic: `https://music.youtube.com/search?q=${q}`,
      tidal: `https://listen.tidal.com/search?q=${q}&type=albums`,
    };
  }, [artist, album]);

  const links = cardData?.links ?? fallbackLinks;
  const searchQuery = `${artist} ${album}`;

  useEffect(() => {
    const params = new URLSearchParams({ artist, album });
    fetch(`/api/card-data?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CardData | null) => {
        if (!data) {
          const q = encodeURIComponent(`${artist} ${album}`);
          setCardData({
            coverUrl: null,
            palette: DEFAULT_PALETTE,
            links: {
              spotify: `https://open.spotify.com/search/${q}/albums`,
              appleMusic: `https://music.apple.com/search?term=${q}`,
              deezer: `https://www.deezer.com/search/${q}`,
              youtubeMusic: `https://music.youtube.com/search?q=${q}`,
              tidal: `https://listen.tidal.com/search?q=${q}&type=albums`,
            },
          });
        } else {
          setCardData(data);
        }
      })
      .catch(() => {
        const q = encodeURIComponent(`${artist} ${album}`);
        setCardData({
          coverUrl: null,
          palette: DEFAULT_PALETTE,
          links: {
            spotify: `https://open.spotify.com/search/${q}/albums`,
            appleMusic: `https://music.apple.com/search?term=${q}`,
            deezer: `https://www.deezer.com/search/${q}`,
            youtubeMusic: `https://music.youtube.com/search?q=${q}`,
            tidal: `https://listen.tidal.com/search?q=${q}&type=albums`,
          },
        });
      });
  }, [artist, album]);

  const p = cardData?.palette ?? DEFAULT_PALETTE;
  const coverUrl = cardData?.coverUrl;
  const loaded = cardData !== null;

  return (
    <article
      className="animate-fade-slide-up rounded-2xl overflow-hidden flex flex-col hover:scale-[1.02] transition-transform duration-200"
      style={{
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'both',
        background: `linear-gradient(160deg, ${p.darkVibrant} 0%, ${p.darkMuted} 100%)`,
        boxShadow: loaded ? `0 8px 40px ${p.vibrant}35` : undefined,
        transition: 'background 0.5s ease, box-shadow 0.5s ease, transform 0.2s ease',
      } as React.CSSProperties}
    >
      {/* Cover area */}
      <div className="relative aspect-square w-full bg-zinc-800 overflow-hidden">
        {!loaded ? (
          <div className="w-full h-full animate-pulse bg-zinc-700" />
        ) : coverUrl && !imgError ? (
          <Image
            src={coverUrl}
            alt={`${album} — ${artist}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-6xl select-none"
            style={{
              background: `linear-gradient(135deg, ${p.vibrant}, ${p.darkVibrant})`,
            }}
          >
            🎵
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="p-4 flex flex-col gap-1 flex-1">
        <p
          className="text-xs font-semibold uppercase tracking-widest truncate"
          style={{ color: p.lightVibrant, opacity: 0.9 }}
        >
          {artist}
        </p>
        <h3
          className="text-base font-bold leading-tight"
          style={{ color: p.textOnDarkVibrant }}
        >
          {album}
          {year && (
            <span className="ml-2 text-sm font-normal" style={{ opacity: 0.55 }}>
              {year}
            </span>
          )}
        </h3>
        <p
          className="text-xs leading-relaxed mt-1.5 flex-1"
          style={{ color: p.textOnDarkVibrant, opacity: 0.7 }}
        >
          {reason}
        </p>

        {/* Streaming links — always visible, direct when available else search */}
        <div
          className="flex items-center gap-3 mt-3 pt-3"
          style={{ borderTop: `1px solid ${p.vibrant}30` }}
        >
          {STREAMING_PLATFORMS.map(({ key, label, Icon }) => (
            <a
              key={key}
              href={links[key]}
              target="_blank"
              rel="noopener noreferrer"
              title={label}
              className="opacity-60 hover:opacity-100 transition-opacity duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openStreamingLink(key, links[key], searchQuery);
              }}
            >
              <Icon size={20} />
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}
