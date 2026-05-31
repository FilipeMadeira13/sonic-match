import 'server-only';
import { Vibrant } from 'node-vibrant/node';
import type { AlbumPalette } from '@/types/album';

export const DEFAULT_PALETTE: AlbumPalette = {
  vibrant: '#6366f1',
  darkVibrant: '#1e1b4b',
  muted: '#64748b',
  darkMuted: '#0f172a',
  lightVibrant: '#c7d2fe',
  textOnVibrant: '#ffffff',
  textOnDarkVibrant: '#ffffff',
};

export async function extractPalette(imageUrl: string): Promise<AlbumPalette> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return DEFAULT_PALETTE;

    const buffer = Buffer.from(await res.arrayBuffer());
    const palette = await Vibrant.from(buffer).getPalette();

    return {
      vibrant: palette.Vibrant?.hex ?? DEFAULT_PALETTE.vibrant,
      darkVibrant: palette.DarkVibrant?.hex ?? DEFAULT_PALETTE.darkVibrant,
      muted: palette.Muted?.hex ?? DEFAULT_PALETTE.muted,
      darkMuted: palette.DarkMuted?.hex ?? DEFAULT_PALETTE.darkMuted,
      lightVibrant: palette.LightVibrant?.hex ?? DEFAULT_PALETTE.lightVibrant,
      textOnVibrant: palette.Vibrant?.titleTextColor ?? '#ffffff',
      textOnDarkVibrant: palette.DarkVibrant?.titleTextColor ?? '#ffffff',
    };
  } catch {
    return DEFAULT_PALETTE;
  }
}
