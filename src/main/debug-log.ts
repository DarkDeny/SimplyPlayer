/**
 * Temporary debug file logger.
 * All main-process debug output goes to debug.log instead of the terminal.
 * Remove this module once all issues are resolved.
 */

import path from 'node:path';
import fs from 'node:fs';

const LOG_FILE = path.resolve(__dirname, '../../debug.log');
try { fs.writeFileSync(LOG_FILE, ''); } catch { /* */ }

export function dbg(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch { /* */ }
}
