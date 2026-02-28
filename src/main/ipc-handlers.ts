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

export function registerIpcHandlers(): void {
  ipcMain.handle('dialog:openFiles', async () => {
    return openFileDialog();
  });

  ipcMain.handle('dialog:openFolder', async () => {
    return openFolderDialog();
  });

  ipcMain.handle('audio:getMetadata', async (_event, filePath: string) => {
    return extractMetadata(filePath);
  });

  ipcMain.handle('audio:getFileUrl', async (_event, filePath: string) => {
    return getFileUrl(filePath);
  });

  ipcMain.handle('store:savePlaybackPosition', async (_event, position: PlaybackPosition) => {
    savePlaybackPosition(position);
  });

  ipcMain.handle('store:getPlaybackPosition', async (_event, filePath: string) => {
    return getPlaybackPosition(filePath);
  });

  ipcMain.handle('store:saveBookmark', async (_event, bookmark: Bookmark) => {
    saveBookmark(bookmark);
  });

  ipcMain.handle('store:deleteBookmark', async (_event, id: string) => {
    deleteBookmark(id);
  });

  ipcMain.handle('store:getBookmarks', async (_event, filePath: string) => {
    return getBookmarks(filePath);
  });

  ipcMain.handle('store:savePlaylists', async (_event, playlists: Playlist[]) => {
    savePlaylists(playlists);
  });

  ipcMain.handle('store:getPlaylists', async () => {
    return getPlaylists();
  });
}
