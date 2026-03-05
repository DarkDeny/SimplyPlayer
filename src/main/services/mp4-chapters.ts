/**
 * Custom MP4/M4B chapter track parser.
 *
 * music-metadata doesn't extract chapters from QuickTime chapter tracks
 * (the standard way audiobook chapters are stored in M4B/M4A files).
 *
 * MP4 chapter tracks work as follows:
 *  - The audio `trak` has a `tref/chap` box referencing the chapter track ID.
 *  - The chapter `trak` is a text track whose samples are the chapter titles.
 *  - Timing comes from the chapter track's `stts` (sample-to-time table).
 */

import fs from 'node:fs';

export interface Mp4Chapter {
  title: string;
  startTime: number; // seconds
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

function readUint16BE(buf: Buffer, off: number): number {
  return buf.readUInt16BE(off);
}

function readUint32BE(buf: Buffer, off: number): number {
  return buf.readUInt32BE(off);
}

function readUint64BE(buf: Buffer, off: number): number {
  return buf.readUInt32BE(off) * 0x1_0000_0000 + buf.readUInt32BE(off + 4);
}

// ---------------------------------------------------------------------------
// Box-level parsing
// ---------------------------------------------------------------------------

interface Box {
  type: string;
  offset: number;     // absolute file offset of the box start
  size: number;        // total box size (including header)
  headerSize: number;  // 8 or 16
}

function readBoxHeader(fd: number, offset: number, fileSize: number): Box | null {
  if (offset + 8 > fileSize) return null;

  const buf = Buffer.alloc(16);
  const n = fs.readSync(fd, buf, 0, 8, offset);
  if (n < 8) return null;

  let size = readUint32BE(buf, 0);
  const type = buf.toString('ascii', 4, 8);
  let headerSize = 8;

  if (size === 1) {
    // 64-bit extended size
    if (offset + 16 > fileSize) return null;
    fs.readSync(fd, buf, 0, 8, offset + 8);
    size = readUint64BE(buf, 0);
    headerSize = 16;
  } else if (size === 0) {
    // Box extends to end of file
    size = fileSize - offset;
  }

  if (size < headerSize) return null;

  return { type, offset, size, headerSize };
}

/** Iterate direct children of a container box. */
function iterateChildren(fd: number, parent: Box, fileSize: number): Box[] {
  const children: Box[] = [];
  let pos = parent.offset + parent.headerSize;
  const end = parent.offset + parent.size;

  while (pos + 8 <= end) {
    const child = readBoxHeader(fd, pos, fileSize);
    if (!child || child.size < 8) break;
    children.push(child);
    pos += child.size;
  }
  return children;
}

/** Find a specific child box by type. */
function findChild(fd: number, parent: Box, fileSize: number, type: string): Box | null {
  return iterateChildren(fd, parent, fileSize).find((b) => b.type === type) ?? null;
}

/** Read the data portion of a box into a Buffer. */
function readBoxData(fd: number, box: Box): Buffer {
  const dataSize = box.size - box.headerSize;
  if (dataSize <= 0) return Buffer.alloc(0);
  const buf = Buffer.alloc(dataSize);
  fs.readSync(fd, buf, 0, dataSize, box.offset + box.headerSize);
  return buf;
}

// ---------------------------------------------------------------------------
// Full-box helpers (boxes that start with version + flags)
// ---------------------------------------------------------------------------

/** Get the version byte and the data offset past version+flags (always 4). */
function fullBoxVersion(data: Buffer): { version: number; dataOffset: number } {
  return { version: data[0], dataOffset: 4 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract chapters from an MP4/M4B file by parsing the QuickTime chapter track.
 * Returns an empty array if the file has no chapter track.
 */
export function extractMp4Chapters(filePath: string): Mp4Chapter[] {
  const fd = fs.openSync(filePath, 'r');

  try {
    const fileSize = fs.fstatSync(fd).size;

    // --- 1. Find the top-level `moov` box ---
    let moov: Box | null = null;
    let pos = 0;
    while (pos + 8 <= fileSize) {
      const box = readBoxHeader(fd, pos, fileSize);
      if (!box || box.size < 8) break;
      if (box.type === 'moov') {
        moov = box;
        break;
      }
      pos += box.size;
    }
    if (!moov) return [];

    // --- 2. Collect all `trak` boxes ---
    const traks = iterateChildren(fd, moov, fileSize).filter((b) => b.type === 'trak');
    if (traks.length === 0) return [];

    // --- 3. Find the chapter track ID via `tref/chap` ---
    let chapterTrackId = -1;
    for (const trak of traks) {
      const tref = findChild(fd, trak, fileSize, 'tref');
      if (!tref) continue;
      const chap = findChild(fd, tref, fileSize, 'chap');
      if (!chap) continue;
      const chapData = readBoxData(fd, chap);
      if (chapData.length >= 4) {
        chapterTrackId = readUint32BE(chapData, 0);
        break;
      }
    }
    if (chapterTrackId < 0) return [];

    // --- 4. Find the chapter trak by matching `tkhd.track_id` ---
    let chapterTrak: Box | null = null;
    for (const trak of traks) {
      const tkhd = findChild(fd, trak, fileSize, 'tkhd');
      if (!tkhd) continue;
      const tkhdData = readBoxData(fd, tkhd);
      const { version } = fullBoxVersion(tkhdData);
      // tkhd layout: version(1) + flags(3) + creation(4|8) + modification(4|8) + track_id(4)
      const idOffset = version === 0 ? 4 + 4 + 4 : 4 + 8 + 8;
      if (idOffset + 4 > tkhdData.length) continue;
      const trackId = readUint32BE(tkhdData, idOffset);
      if (trackId === chapterTrackId) {
        chapterTrak = trak;
        break;
      }
    }
    if (!chapterTrak) return [];

    // --- 5. Navigate into the chapter track: mdia → mdhd (timescale) ---
    const mdia = findChild(fd, chapterTrak, fileSize, 'mdia');
    if (!mdia) return [];

    const mdhd = findChild(fd, mdia, fileSize, 'mdhd');
    if (!mdhd) return [];
    const mdhdData = readBoxData(fd, mdhd);
    const mdhdVer = fullBoxVersion(mdhdData);
    // mdhd layout: version(1)+flags(3) + creation(4|8) + modification(4|8) + timescale(4) + duration(4|8)
    const tsOffset = mdhdVer.version === 0 ? 4 + 4 + 4 : 4 + 8 + 8;
    if (tsOffset + 4 > mdhdData.length) return [];
    const timescale = readUint32BE(mdhdData, tsOffset);
    if (timescale <= 0) return [];

    // --- 6. Navigate to stbl (sample table) ---
    const minf = findChild(fd, mdia, fileSize, 'minf');
    if (!minf) return [];
    const stbl = findChild(fd, minf, fileSize, 'stbl');
    if (!stbl) return [];

    // --- 7. Parse stts (sample-to-time table) ---
    const sttsBox = findChild(fd, stbl, fileSize, 'stts');
    if (!sttsBox) return [];
    const sttsData = readBoxData(fd, sttsBox);
    const sttsEntryCount = readUint32BE(sttsData, 4);
    const sampleDurations: number[] = [];
    let sttsPos = 8;
    for (let i = 0; i < sttsEntryCount; i++) {
      const count = readUint32BE(sttsData, sttsPos);
      const duration = readUint32BE(sttsData, sttsPos + 4);
      for (let j = 0; j < count; j++) {
        sampleDurations.push(duration);
      }
      sttsPos += 8;
    }

    // --- 8. Parse stsz (sample sizes) ---
    const stszBox = findChild(fd, stbl, fileSize, 'stsz');
    if (!stszBox) return [];
    const stszData = readBoxData(fd, stszBox);
    const uniformSize = readUint32BE(stszData, 4);
    const sampleCount = readUint32BE(stszData, 8);
    const sampleSizes: number[] = [];
    if (uniformSize > 0) {
      for (let i = 0; i < sampleCount; i++) sampleSizes.push(uniformSize);
    } else {
      for (let i = 0; i < sampleCount; i++) {
        sampleSizes.push(readUint32BE(stszData, 12 + i * 4));
      }
    }

    // --- 9. Parse stco / co64 (chunk offsets) ---
    const stcoBox = findChild(fd, stbl, fileSize, 'stco');
    const co64Box = findChild(fd, stbl, fileSize, 'co64');
    const chunkOffsetBox = stcoBox ?? co64Box;
    if (!chunkOffsetBox) return [];
    const is64 = chunkOffsetBox.type === 'co64';
    const coData = readBoxData(fd, chunkOffsetBox);
    const chunkCount = readUint32BE(coData, 4);
    const chunkOffsets: number[] = [];
    for (let i = 0; i < chunkCount; i++) {
      chunkOffsets.push(
        is64 ? readUint64BE(coData, 8 + i * 8) : readUint32BE(coData, 8 + i * 4),
      );
    }

    // --- 10. Parse stsc (sample-to-chunk mapping) ---
    const stscBox = findChild(fd, stbl, fileSize, 'stsc');
    if (!stscBox) return [];
    const stscData = readBoxData(fd, stscBox);
    const stscEntryCount = readUint32BE(stscData, 4);
    interface StscEntry {
      firstChunk: number;
      samplesPerChunk: number;
    }
    const stscEntries: StscEntry[] = [];
    for (let i = 0; i < stscEntryCount; i++) {
      stscEntries.push({
        firstChunk: readUint32BE(stscData, 8 + i * 12),
        samplesPerChunk: readUint32BE(stscData, 8 + i * 12 + 4),
      });
    }

    // --- 11. Compute absolute file offset of each sample ---
    const sampleOffsets: number[] = [];
    let sampleIdx = 0;

    for (let chunkIdx = 0; chunkIdx < chunkCount && sampleIdx < sampleCount; chunkIdx++) {
      const chunkNum = chunkIdx + 1; // 1-based
      // Find the applicable stsc entry (last entry whose firstChunk <= chunkNum)
      let samplesInChunk = 1;
      for (let e = stscEntries.length - 1; e >= 0; e--) {
        if (chunkNum >= stscEntries[e].firstChunk) {
          samplesInChunk = stscEntries[e].samplesPerChunk;
          break;
        }
      }

      let offsetInChunk = 0;
      for (let s = 0; s < samplesInChunk && sampleIdx < sampleCount; s++) {
        sampleOffsets.push(chunkOffsets[chunkIdx] + offsetInChunk);
        offsetInChunk += sampleSizes[sampleIdx];
        sampleIdx++;
      }
    }

    // --- 12. Read chapter titles and build result ---
    const chapters: Mp4Chapter[] = [];
    let cumulativeTime = 0;

    for (let i = 0; i < Math.min(sampleCount, sampleOffsets.length); i++) {
      const startTime = cumulativeTime / timescale;

      // MP4 text samples: first 2 bytes = text length (big-endian), then UTF-8 text
      const size = sampleSizes[i];
      const textBuf = Buffer.alloc(size);
      fs.readSync(fd, textBuf, 0, size, sampleOffsets[i]);

      let title = '';
      if (size > 2) {
        const textLen = readUint16BE(textBuf, 0);
        title = textBuf.toString('utf8', 2, 2 + Math.min(textLen, size - 2));
      }

      chapters.push({
        title: title || `Chapter ${i + 1}`,
        startTime,
      });

      if (i < sampleDurations.length) {
        cumulativeTime += sampleDurations[i];
      }
    }

    return chapters;
  } finally {
    fs.closeSync(fd);
  }
}
