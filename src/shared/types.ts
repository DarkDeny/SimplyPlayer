export interface AudioMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  format: string;
  coverArt: string | null; // base64 data URL
  chapters: Chapter[];
  filePath: string;
}

export interface Chapter {
  title: string;
  startTime: number; // seconds
  endTime: number; // seconds
}

export interface Bookmark {
  id: string;
  filePath: string;
  position: number; // seconds
  label: string;
  createdAt: number; // timestamp
}

export interface PlaybackPosition {
  filePath: string;
  position: number; // seconds
  updatedAt: number; // timestamp
}

export interface PlaylistItem {
  filePath: string;
  title: string;
  artist: string;
  duration: number;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  createdAt: number;
}

export interface ElectronAPI {
  openFiles: () => Promise<string[]>;
  openFolder: () => Promise<string[]>;
  getMetadata: (filePath: string) => Promise<AudioMetadata>;
  getFileUrl: (filePath: string) => Promise<string>;
  savePlaybackPosition: (position: PlaybackPosition) => Promise<void>;
  getPlaybackPosition: (filePath: string) => Promise<PlaybackPosition | null>;
  saveBookmark: (bookmark: Bookmark) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  getBookmarks: (filePath: string) => Promise<Bookmark[]>;
  savePlaylists: (playlists: Playlist[]) => Promise<void>;
  getPlaylists: () => Promise<Playlist[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
