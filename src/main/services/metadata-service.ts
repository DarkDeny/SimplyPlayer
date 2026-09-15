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

  const totalDuration = metadata.format.duration || 0;

  // 1. Try music-metadata's built-in chapter extraction
  if (metadata.format.chapters && metadata.format.chapters.length > 0) {
    for (const ch of metadata.format.chapters) {
      const timeScale = ch.timeScale || 1;
      const startTime = ch.start / timeScale;
      const endTime = ch.end != null ? ch.end / timeScale : -1;
      chapters.push({
        title: ch.title || `Chapter ${chapters.length + 1}`,
        startTime,
        endTime,
      });
    }
    dbg(`META: extracted ${chapters.length} chapters from format.chapters (timeScale=${metadata.format.chapters[0]?.timeScale})`);
  }

  // 2. Try native ID3v2 CHAP tags (MP3 audiobooks)
  if (chapters.length === 0) {
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
              endTime: v.endTime != null ? v.endTime / 1000 : totalDuration,
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
        for (let i = 0; i < mp4Chapters.length; i++) {
          const endTime =
            i + 1 < mp4Chapters.length ? mp4Chapters[i + 1].startTime : totalDuration;
          chapters.push({
            title: mp4Chapters[i].title,
            startTime: mp4Chapters[i].startTime,
            endTime,
          });
        }
        dbg(`META: MP4 chapter parser extracted ${chapters.length} chapters`);
      } catch (err) {
        dbg(`META: MP4 chapter parser failed: ${err}`);
      }
    }
  }

  // Fix up chapter end times — music-metadata's MP4 parser doesn't provide them
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (ch.endTime < 0 || ch.endTime <= ch.startTime) {
      ch.endTime = i + 1 < chapters.length ? chapters[i + 1].startTime : totalDuration;
    }
  }

  // Repair corrupt chapter timestamps: detect a jump where startTime exceeds
  // totalDuration and reconstruct using the (valid) inter-chapter deltas.
  if (totalDuration > 0 && chapters.length > 1) {
    let breakIdx = -1;
    for (let i = 1; i < chapters.length; i++) {
      if (chapters[i].startTime > totalDuration) {
        breakIdx = i;
        break;
      }
    }
    if (breakIdx > 0) {
      dbg(`META: corrupt timestamps from chapter ${breakIdx} "${chapters[breakIdx].title}" (startTime=${chapters[breakIdx].startTime.toFixed(1)}s > duration=${totalDuration.toFixed(1)}s)`);
      // Collect the inter-chapter deltas after the break — they're typically correct
      const deltas: number[] = [];
      for (let i = breakIdx; i < chapters.length - 1; i++) {
        deltas.push(chapters[i + 1].startTime - chapters[i].startTime);
      }
      // The chapter before the break also has a corrupt duration (its STTS
      // entry caused the overflow), so include it in reconstruction.
      const repairIdx = breakIdx - 1;
      const repairStart = chapters[repairIdx].startTime;
      const totalDeltaTime = deltas.reduce((a, b) => a + b, 0);
      const availableTime = totalDuration - repairStart;
      const scale = totalDeltaTime > availableTime
        ? availableTime / totalDeltaTime
        : 1;
      // Give the break-point chapter whatever time remains after the deltas
      const breakChapterDur = availableTime - totalDeltaTime * scale;
      let cursor = repairStart + Math.max(0, breakChapterDur);
      chapters[repairIdx].endTime = cursor;
      for (let i = breakIdx; i < chapters.length; i++) {
        chapters[i].startTime = cursor;
        const delta = i < chapters.length - 1 ? deltas[i - breakIdx] * scale : 0;
        chapters[i].endTime = i < chapters.length - 1 ? cursor + delta : totalDuration;
        cursor += delta;
      }
      dbg(`META: reconstructed ${chapters.length - repairIdx} chapters from ${repairStart.toFixed(1)}s to ${totalDuration.toFixed(1)}s (scale=${scale.toFixed(3)})`);
    }
  }

  if (chapters.length > 0) {
    for (const ch of chapters) {
      dbg(`META:   "${ch.title}" ${ch.startTime.toFixed(1)}s - ${ch.endTime.toFixed(1)}s (${((ch.endTime - ch.startTime) / 60).toFixed(1)} min)`);
    }
  }

  const ext = path.extname(filePath).slice(1).toLowerCase();
  const duration = totalDuration;

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
