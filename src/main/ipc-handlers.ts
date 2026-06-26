import { ipcMain } from 'electron';
import { openFileDialog, openFolderDialog, getFileUrl } from './services/file-service';
import { extractMetadata, getCachedDuration } from './services/metadata-service';
import {
  savePlaybackPosition,
  getPlaybackPosition,
  saveBookmark,
  deleteBookmark,
  getBookmarks,
  savePlaylists,
  getPlaylists,
  saveLastSession,
  getLastSession,
  saveEqSettings,
  getEqSettings,
} from './services/store-service';
import { startWarming, updatePosition } from './services/cache-service';
import type { PlaybackPosition, Bookmark, Playlist, LastSession, EqSettings } from '../shared/types';

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
    (filePath: unknown) => {
      const fp = filePath as string;
      const url = getFileUrl(fp);

      // Kick off read-ahead cache warming in the background.
      // getCachedDuration() returns 0 if getMetadata hasn't been called yet
      // (shouldn't happen in normal flow), in which case startWarming is a no-op.
      const duration = getCachedDuration(fp);
      if (duration > 0) {
        startWarming(fp, duration);
      }

      return url;
    },
  ));

  ipcMain.handle('store:savePlaybackPosition', wrapHandler(
    (position: unknown) => {
      const pos = position as PlaybackPosition;
      // Update cache warmer with the latest playback position
      updatePosition(pos.position);
      return savePlaybackPosition(pos);
    },
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

  ipcMain.handle('store:saveLastSession', wrapHandler(
    (session: unknown) => saveLastSession(session as LastSession),
  ));

  ipcMain.handle('store:getLastSession', wrapHandler(() => getLastSession()));

  ipcMain.handle('store:saveEqSettings', wrapHandler(
    (settings: unknown) => saveEqSettings(settings as EqSettings),
  ));

  ipcMain.handle('store:getEqSettings', wrapHandler(() => getEqSettings()));
}
