'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MBRelease, Recommendation } from '@/types/album';
import AlbumSearch from './AlbumSearch';
import AlbumChip from './AlbumChip';
import Button from './ui/Button';
import RecommendationGrid from './RecommendationGrid';
import Spinner from './ui/Spinner';

const MAX_ALBUMS = 10;
const DEFAULT_COUNT = 12;

export default function TasteProfileForm() {
  const t = useTranslations('home');
  const [albums, setAlbums] = useState<MBRelease[]>([]);
  const [freeText, setFreeText] = useState('');
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);

  const selectedIds = new Set(albums.map((a) => a.id));

  function addAlbum(album: MBRelease) {
    if (selectedIds.has(album.id) || albums.length >= MAX_ALBUMS) return;
    setAlbums((prev) => [...prev, album]);
    setError('');
  }

  function removeAlbum(id: string) {
    setAlbums((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (albums.length === 0) {
      setError(t('form.minAlbumsError'));
      return;
    }

    setError('');
    setLoading(true);
    setStreaming(false);
    setRecommendations(null);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albums, count, freeText: freeText.trim() || undefined }),
      });

      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let firstReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          if (event.startsWith('event: error')) {
            throw new Error('stream error');
          }
          const dataLine = event.split('\n').find((l) => l.startsWith('data: '));
          if (!dataLine) continue;

          try {
            const rec = JSON.parse(dataLine.slice(6)) as Recommendation;
            if (rec.artist && rec.album) {
              if (!firstReceived) {
                firstReceived = true;
                setLoading(false);
                setStreaming(true);
                setRecommendations([rec]);
              } else {
                setRecommendations((prev) => [...(prev ?? []), rec]);
              }
            }
          } catch {
            // ignore malformed line
          }
        }
      }
    } catch {
      setError(t('form.requestError'));
      setRecommendations(null);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

  function handleNewSearch() {
    setRecommendations(null);
    setAlbums([]);
    setFreeText('');
    setError('');
    setStreaming(false);
  }

  if (recommendations) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
            {recommendations.length} {t('results.title')}
            {streaming && <Spinner size={16} />}
          </h2>
          {!streaming && (
            <Button variant="ghost" onClick={handleNewSearch}>
              {t('results.newSearch')}
            </Button>
          )}
        </div>
        <RecommendationGrid recommendations={recommendations} />
        {streaming && (
          <div className="flex justify-center py-4 text-zinc-500 text-sm gap-2">
            <Spinner size={14} />
            {t('results.loadingMore')}
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <AlbumSearch
          onAdd={addAlbum}
          selectedIds={selectedIds}
          disabled={loading || albums.length >= MAX_ALBUMS}
        />
        {albums.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {albums.map((album) => (
              <AlbumChip key={album.id} album={album} onRemove={removeAlbum} />
            ))}
          </div>
        )}
      </div>

      <textarea
        value={freeText}
        onChange={(e) => setFreeText(e.target.value)}
        placeholder={t('form.freeTextPlaceholder')}
        rows={2}
        disabled={loading}
        className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors resize-none disabled:opacity-50"
      />

      {/* Count slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <label htmlFor="count-slider" className="text-zinc-400">
            {t('form.countLabel')}
          </label>
          <span className="font-semibold text-zinc-100 tabular-nums w-8 text-right">
            {count}
          </span>
        </div>
        <input
          id="count-slider"
          type="range"
          min={4}
          max={100}
          step={4}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          disabled={loading}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-zinc-700 accent-indigo-500 disabled:opacity-50"
        />
        <div className="flex justify-between text-xs text-zinc-600">
          <span>4</span>
          <span>100</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-4">
        <Button
          type="submit"
          loading={loading}
          disabled={albums.length === 0}
          className="sm:w-auto"
        >
          {loading ? t('form.submitLoading') : t('form.submitButton')}
        </Button>
        {albums.length === 0 && (
          <p className="text-xs text-zinc-600">{t('form.hint')}</p>
        )}
      </div>
    </form>
  );
}
