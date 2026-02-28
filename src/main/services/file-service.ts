import { dialog } from 'electron';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const AUDIO_EXTENSIONS = ['.mp3', '.m4b', '.m4a', '.aac', '.ogg', '.flac', '.wav'];

export async function openFileDialog(): Promise<string[]> {
  const result = await dialog.showOpenDialog({
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
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (result.canceled) return [];

  const folderPath = result.filePaths[0];
  return scanFolder(folderPath);
}

function scanFolder(folderPath: string): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (AUDIO_EXTENSIONS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return files;
}

export function getFileUrl(filePath: string): string {
  return pathToFileURL(filePath).href;
}
