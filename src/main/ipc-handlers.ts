import { ipcMain } from 'electron';
import { openFileDialog, openFolderDialog, getFileUrl } from './services/file-service';
import { extractMetadata } from './services/metadata-service';
import {
  savePlaybackPosition,
  getPlaybackPosition,
  saveBookmark,
  deleteBookmark,
  getBookmarks,
  savePlaylists,
  getPlaylists,
} from './services/store-service';
import type { PlaybackPosition, Bookmark, Playlist } from '../shared/types';

function wrapHandler<T>(handler: (...args: unknown[]) => T | Promise<T>) {
  return async (_event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`IPC handler error: ${message}`);
      throw new Error(message);
    }
  };
}

export function registerIpcHandlers(): void {
  ipcMain.handle('dialog:openFiles', wrapHandler(() => openFileDialog()));
  ipcMain.handle('dialog:openFolder', wrapHandler(() => openFolderDialog()));

  ipcMain.handle('audio:getMetadata', wrapHandler(
    (filePath: unknown) => extractMetadata(filePath as string),
  ));

  ipcMain.handle('audio:getFileUrl', wrapHandler(
    (filePath: unknown) => getFileUrl(filePath as string),
  ));

  ipcMain.handle('store:savePlaybackPosition', wrapHandler(
    (position: unknown) => savePlaybackPosition(position as PlaybackPosition),
  ));

  ipcMain.handle('store:getPlaybackPosition', wrapHandler(
    (filePath: unknown) => getPlaybackPosition(filePath as string),
  ));

  ipcMain.handle('store:saveBookmark', wrapHandler(
    (bookmark: unknown) => saveBookmark(bookmark as Bookmark),
  ));

  ipcMain.handle('store:deleteBookmark', wrapHandler(
    (id: unknown) => deleteBookmark(id as string),
  ));

  ipcMain.handle('store:getBookmarks', wrapHandler(
    (filePath: unknown) => getBookmarks(filePath as string),
  ));

  ipcMain.handle('store:savePlaylists', wrapHandler(
    (playlists: unknown) => savePlaylists(playlists as Playlist[]),
  ));

  ipcMain.handle('store:getPlaylists', wrapHandler(() => getPlaylists()));
}
