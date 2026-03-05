/**
 * Read-ahead cache warming for audio files.
 *
 * Periodically reads upcoming portions of the audio file via fs.read()
 * to populate the OS page cache. When Chromium later requests those bytes
 * via file:// URL, they are served from RAM — even if the underlying
 * storage (NAS, external HDD) has gone to sleep.
 *
 * Memory impact is negligible: a single 256 KB buffer is reused for all reads.
 * For a 128 kbps audiobook, 15 minutes ≈ 14 MB in OS cache.
 */

import fs from 'node:fs/promises';
import { dbg } from '../debug-log';

/** How far ahead to warm (seconds). */
const CACHE_AHEAD_SEC = 15 * 60;

/** Start warming when playback is within this many seconds of the cached edge. */
const TRIGGER_BEFORE_SEC = 5 * 60;

/** Size of the reusable read buffer. */
const READ_CHUNK = 256 * 1024; // 256 KB

// --- Module state ---

let currentFilePath: string | null = null;
let fileSize = 0;
let fileDuration = 0;
let warmedUpToByte = 0;
let warming = false;
let abortCtrl: AbortController | null = null;

// --- Public API ---

/**
 * Start cache warming for a new file.
 * Automatically stops any previous warming session.
 */
export async function startWarming(
  filePath: string,
  durationSec: number,
): Promise<void> {
  stopWarming();

  if (durationSec <= 0) return;

  try {
    const info = await fs.stat(filePath);
    fileSize = info.size;
  } catch {
    dbg(`Cache: cannot stat file, skipping: ${filePath}`);
    return;
  }

  currentFilePath = filePath;
  fileDuration = durationSec;
  warmedUpToByte = 0;

  dbg(
    `Cache: start warming "${filePath}" ` +
      `(size=${(fileSize / 1024 / 1024).toFixed(1)} MB, dur=${durationSec.toFixed(0)}s)`,
  );

  // Warm the first 15 minutes in the background
  warmAhead(0);
}

/**
 * Report the current playback position.
 * If the player is approaching the edge of the warmed region,
 * a new warming pass is triggered.
 */
export function updatePosition(positionSec: number): void {
  if (!currentFilePath || fileDuration <= 0 || fileSize <= 0) return;

  const bytesPerSec = fileSize / fileDuration;
  const warmedUpToSec = warmedUpToByte / bytesPerSec;

  if (positionSec >= warmedUpToSec - TRIGGER_BEFORE_SEC && !warming) {
    warmAhead(positionSec);
  }
}

/** Stop the current warming session (e.g. when switching files). */
export function stopWarming(): void {
  if (abortCtrl) {
    abortCtrl.abort();
    abortCtrl = null;
  }
  if (currentFilePath) {
    dbg('Cache: stopped warming');
  }
  currentFilePath = null;
  fileSize = 0;
  fileDuration = 0;
  warmedUpToByte = 0;
  warming = false;
}

// --- Internal ---

function warmAhead(fromSec: number): void {
  if (!currentFilePath || warming) return;
  warming = true;

  const controller = new AbortController();
  abortCtrl = controller;

  const bytesPerSec = fileSize / fileDuration;
  const startByte = Math.max(0, Math.floor(fromSec * bytesPerSec));
  const endByte = Math.min(
    fileSize,
    Math.floor((fromSec + CACHE_AHEAD_SEC) * bytesPerSec),
  );

  if (startByte >= endByte) {
    warming = false;
    return;
  }

  dbg(
    `Cache: warming bytes ${startByte}-${endByte} ` +
      `(~${Math.round(fromSec)}s - ${Math.round(fromSec + CACHE_AHEAD_SEC)}s)`,
  );

  doWarmRange(currentFilePath, startByte, endByte, controller)
    .then((bytesWarmed) => {
      if (bytesWarmed > 0) {
        warmedUpToByte = Math.max(warmedUpToByte, startByte + bytesWarmed);
        dbg(`Cache: warmed up to byte ${warmedUpToByte}`);
      }
    })
    .catch((err) => {
      if (!controller.signal.aborted) {
        dbg(`Cache: warming error: ${err}`);
      }
    })
    .finally(() => {
      // Only reset state if this controller is still the active one.
      // A newer startWarming() call may have already replaced it.
      if (abortCtrl === controller) {
        warming = false;
        abortCtrl = null;
      }
    });
}

async function doWarmRange(
  filePath: string,
  startByte: number,
  endByte: number,
  controller: AbortController,
): Promise<number> {
  const buf = Buffer.allocUnsafe(READ_CHUNK);
  const fh = await fs.open(filePath, 'r');
  let totalRead = 0;

  try {
    let offset = startByte;
    while (offset < endByte) {
      if (controller.signal.aborted) break;

      const toRead = Math.min(READ_CHUNK, endByte - offset);
      const { bytesRead } = await fh.read(buf, 0, toRead, offset);
      if (bytesRead === 0) break;

      offset += bytesRead;
      totalRead += bytesRead;
    }
  } finally {
    await fh.close();
  }

  return totalRead;
}
