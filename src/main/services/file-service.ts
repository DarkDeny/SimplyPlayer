import { dialog, BrowserWindow } from 'electron';
import type { OpenDialogOptions } from 'electron';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4b', '.m4a', '.aac', '.ogg', '.flac', '.wav']);

function showDialog(options: OpenDialogOptions) {
  const win = BrowserWindow.getFocusedWindow();
  // Pass parent window so the dialog is modal and doesn't hide behind the app
  return win
    ? dialog.showOpenDialog(win, options)
    : dialog.showOpenDialog(options);
}

export async function openFileDialog(): Promise<string[]> {
  const result = await showDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'm4b', 'm4a', 'aac', 'ogg', 'flac', 'wav'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled) return [];
  return result.filePaths;
}

export async function openFolderDialog(): Promise<string[]> {
  const result = await showDialog({
    properties: ['openDirectory'],
  });

  if (result.canceled) return [];

  const folderPath = result.filePaths[0];
  return scanFolder(folderPath);
}

async function scanFolder(folderPath: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (AUDIO_EXTENSIONS.has(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  await walk(folderPath);
  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return files;
}

export function getFileUrl(filePath: string): string {
  // webSecurity: false allows direct file:// access from the renderer
  return pathToFileURL(filePath).href;
}
