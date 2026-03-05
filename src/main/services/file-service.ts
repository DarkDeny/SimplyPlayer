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

  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (AUDIO_EXTENSIONS.has(ext)) {
        files.push(path.join(folderPath, entry.name));
      }
    }
  }

  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return files;
}

export function getFileUrl(filePath: string): string {
  // webSecurity: false allows direct file:// access from the renderer
  return pathToFileURL(filePath).href;
}
