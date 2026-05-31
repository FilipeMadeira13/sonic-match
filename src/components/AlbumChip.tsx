import type { MBRelease } from '@/types/album';

interface AlbumChipProps {
  album: MBRelease;
  onRemove: (id: string) => void;
}

export default function AlbumChip({ album, onRemove }: AlbumChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-sm text-zinc-200">
      <span className="max-w-[200px] truncate">
        <span className="text-zinc-400">{album.artist}</span>
        <span className="mx-1 text-zinc-600">—</span>
        <span className="font-medium">{album.title}</span>
        {album.date && (
          <span className="text-zinc-600 ml-1">({album.date})</span>
        )}
      </span>
      <button
        type="button"
        onClick={() => onRemove(album.id)}
        className="rounded-full p-0.5 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0"
        aria-label={`Remover ${album.title}`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}
