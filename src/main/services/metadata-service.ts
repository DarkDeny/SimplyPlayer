import { parseFile } from 'music-metadata';
import path from 'node:path';
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
  if (metadata.format.chapters) {
    for (const ch of metadata.format.chapters) {
      const timeScale = ch.timeScale || 1;
      const startTime = ch.start / timeScale;
      const endTime = ch.end != null ? ch.end / timeScale : startTime;
      chapters.push({
        title: ch.title || `Chapter ${chapters.length + 1}`,
        startTime,
        endTime,
      });
    }
  }

  const ext = path.extname(filePath).slice(1).toLowerCase();

  return {
    title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
    artist: metadata.common.artist || 'Unknown Artist',
    album: metadata.common.album || '',
    duration: metadata.format.duration || 0,
    format: ext,
    coverArt,
    chapters,
    filePath,
  };
}
