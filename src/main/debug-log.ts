/**
 * Temporary debug file logger.
 * All main-process debug output goes to debug.log instead of the terminal.
 * Remove this module once all issues are resolved.
 */

import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';

let logFile: string | null = null;

function getLogPath(): string {
  if (logFile) return logFile;
  try {
    logFile = path.join(app.getPath('userData'), 'debug.log');
  } catch {
    logFile = path.resolve(__dirname, '../../debug.log');
  }
  try { fs.writeFileSync(logFile, ''); } catch { /* */ }
  return logFile;
}

export function dbg(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(getLogPath(), line); } catch { /* */ }
}
