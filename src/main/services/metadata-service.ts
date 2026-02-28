import { parseFile } from 'music-metadata';
import type { AudioMetadata, Chapter } from '../../shared/types';

export async function extractMetadata(filePath: string): Promise<AudioMetadata> {
  const metadata = await parseFile(filePath, { includeChapters: true });

  let coverArt: string | null = null;
  if (metadata.common.picture && metadata.common.picture.length > 0) {
    const pic = metadata.common.picture[0];
    const base64 = Buffer.from(pic.data).toString('base64');
    coverArt = `data:${pic.format};base64,${base64}`;
  }

  const chapters: Chapter[] = [];
  if (metadata.common.chapters) {
    for (const ch of metadata.common.chapters) {
      chapters.push({
        title: ch.title || `Chapter ${chapters.length + 1}`,
        startTime: (ch.startTime ?? 0) / 1000,
        endTime: ((ch.startTime ?? 0) + (ch.duration ?? 0)) / 1000,
      });
    }
  }

  const ext = filePath.split('.').pop()?.toLowerCase() || '';

  return {
    title: metadata.common.title || filePath.split(/[/\\]/).pop() || 'Unknown',
    artist: metadata.common.artist || 'Unknown Artist',
    album: metadata.common.album || '',
    duration: metadata.format.duration || 0,
    format: ext,
    coverArt,
    chapters,
    filePath,
  };
}
