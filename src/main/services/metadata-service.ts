import { parseFile } from 'music-metadata';
import path from 'node:path';
import type { AudioMetadata, Chapter } from '../../shared/types';
import { extractMp4Chapters } from './mp4-chapters';
import { dbg } from '../debug-log';

/** File extensions that use MP4/QuickTime container (may have chapter tracks). */
const MP4_EXTENSIONS = new Set(['.m4b', '.m4a', '.mp4', '.m4v']);

/**
 * Module-level cache: filePath → duration (seconds).
 * Populated by extractMetadata(), consumed by cache-service.
 */
const durationCache = new Map<string, number>();

/** Get the cached duration for a previously parsed file. Returns 0 if unknown. */
export function getCachedDuration(filePath: string): number {
  return durationCache.get(filePath) ?? 0;
}

export async function extractMetadata(filePath: string): Promise<AudioMetadata> {
  const metadata = await parseFile(filePath, { includeChapters: true });

  dbg(`META: file=${path.basename(filePath)} container=${metadata.format.container} duration=${metadata.format.duration}`);
  dbg(`META: format.chapters=${metadata.format.chapters?.length ?? 'none'}`);

  let coverArt: string | null = null;
  if (metadata.common.picture && metadata.common.picture.length > 0) {
    const pic = metadata.common.picture[0];
    const base64 = Buffer.from(pic.data).toString('base64');
    coverArt = `data:${pic.format};base64,${base64}`;
  }

  const chapters: Chapter[] = [];

  // 1. Try music-metadata's built-in chapter extraction
  if (metadata.format.chapters && metadata.format.chapters.length > 0) {
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
    dbg(`META: extracted ${chapters.length} chapters from format.chapters`);
  }

  // 2. Try native ID3v2 CHAP tags (MP3 audiobooks)
  if (chapters.length === 0) {
    const duration = metadata.format.duration || 0;
    for (const tagType of Object.keys(metadata.native)) {
      const tags = metadata.native[tagType];
      const chapTags = tags.filter((t) => t.id === 'CHAP');
      for (const tag of chapTags) {
        if (tag.value) {
          const v = tag.value as { startTime?: number; endTime?: number; title?: string };
          if (v.startTime != null) {
            chapters.push({
              title: v.title || `Chapter ${chapters.length + 1}`,
              startTime: v.startTime / 1000,
              endTime: v.endTime != null ? v.endTime / 1000 : duration,
            });
          }
        }
      }
      if (chapters.length > 0) {
        dbg(`META: extracted ${chapters.length} chapters from native CHAP tags`);
        break;
      }
    }
  }

  // 3. For MP4/M4B files: parse the QuickTime chapter track directly
  if (chapters.length === 0) {
    const ext = path.extname(filePath).toLowerCase();
    if (MP4_EXTENSIONS.has(ext)) {
      try {
        const mp4Chapters = extractMp4Chapters(filePath);
        const duration = metadata.format.duration || 0;
        for (let i = 0; i < mp4Chapters.length; i++) {
          const endTime =
            i + 1 < mp4Chapters.length ? mp4Chapters[i + 1].startTime : duration;
          chapters.push({
            title: mp4Chapters[i].title,
            startTime: mp4Chapters[i].startTime,
            endTime,
          });
        }
        dbg(`META: MP4 chapter parser extracted ${chapters.length} chapters`);
        for (const ch of chapters) {
          dbg(`META:   "${ch.title}" ${ch.startTime.toFixed(1)}s - ${ch.endTime.toFixed(1)}s`);
        }
      } catch (err) {
        dbg(`META: MP4 chapter parser failed: ${err}`);
      }
    }
  }

  const ext = path.extname(filePath).slice(1).toLowerCase();
  const duration = metadata.format.duration || 0;

  // Cache duration for the read-ahead cache warmer
  durationCache.set(filePath, duration);

  return {
    title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
    artist: metadata.common.artist || 'Unknown Artist',
    album: metadata.common.album || '',
    duration,
    format: ext,
    coverArt,
    chapters,
    filePath,
  };
}
