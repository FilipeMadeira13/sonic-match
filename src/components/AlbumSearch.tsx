'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { MBRelease } from '@/types/album';
import Spinner from './ui/Spinner';

interface AlbumSearchProps {
  onAdd: (album: MBRelease) => void;
  selectedIds: Set<string>;
  disabled?: boolean;
}

export default function AlbumSearch({ onAdd, selectedIds, disabled }: AlbumSearchProps) {
  const t = useTranslations('home.form');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MBRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(
          `/api/search-albums?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResults(data.releases ?? []);
        setOpen(true);
      } catch {
        setError(t('searchError'));
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, t]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleSelect(album: MBRelease) {
    onAdd(album);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  const filtered = results.filter((r) => !selectedIds.has(r.id));

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => filtered.length > 0 && setOpen(true)}
          placeholder={t('searchPlaceholder')}
          disabled={disabled}
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
          {loading ? (
            <Spinner size={14} />
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          )}
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          {filtered.map((album) => (
            <li key={album.id}>
              <button
                type="button"
                onClick={() => handleSelect(album)}
                className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
              >
                <span className="font-medium text-zinc-100">{album.title}</span>
                <span className="text-zinc-400 ml-2">{album.artist}</span>
                {album.date && (
                  <span className="text-zinc-600 ml-2">({album.date})</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && filtered.length === 0 && query.trim().length >= 2 && !error && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-500">
          {t('noResults')}
        </div>
      )}
    </div>
  );
}
