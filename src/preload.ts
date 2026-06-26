import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './shared/types';

const api: ElectronAPI = {
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  getMetadata: (filePath) => ipcRenderer.invoke('audio:getMetadata', filePath),
  getFileUrl: (filePath) => ipcRenderer.invoke('audio:getFileUrl', filePath),
  savePlaybackPosition: (position) => ipcRenderer.invoke('store:savePlaybackPosition', position),
  getPlaybackPosition: (filePath) => ipcRenderer.invoke('store:getPlaybackPosition', filePath),
  saveBookmark: (bookmark) => ipcRenderer.invoke('store:saveBookmark', bookmark),
  deleteBookmark: (id) => ipcRenderer.invoke('store:deleteBookmark', id),
  getBookmarks: (filePath) => ipcRenderer.invoke('store:getBookmarks', filePath),
  savePlaylists: (playlists) => ipcRenderer.invoke('store:savePlaylists', playlists),
  getPlaylists: () => ipcRenderer.invoke('store:getPlaylists'),
  saveLastSession: (session) => ipcRenderer.invoke('store:saveLastSession', session),
  getLastSession: () => ipcRenderer.invoke('store:getLastSession'),
  saveEqSettings: (settings) => ipcRenderer.invoke('store:saveEqSettings', settings),
  getEqSettings: () => ipcRenderer.invoke('store:getEqSettings'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
