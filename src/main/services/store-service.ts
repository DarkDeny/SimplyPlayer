import Store from 'electron-store';
import type { PlaybackPosition, Bookmark, Playlist, LastSession, EqSettings } from '../../shared/types';

interface StoreSchema {
  playbackPositions: Record<string, PlaybackPosition>;
  bookmarks: Record<string, Bookmark[]>;
  playlists: Playlist[];
  lastSession: LastSession | null;
  eqSettings: EqSettings | null;
}

const store = new Store<StoreSchema>({
  defaults: {
    playbackPositions: {},
    bookmarks: {},
    playlists: [],
    lastSession: null,
    eqSettings: null,
  },
});

export function savePlaybackPosition(position: PlaybackPosition): void {
  const positions = store.get('playbackPositions');
  positions[position.filePath] = position;
  store.set('playbackPositions', positions);
}

export function getPlaybackPosition(filePath: string): PlaybackPosition | null {
  const positions = store.get('playbackPositions');
  return positions[filePath] || null;
}

export function saveBookmark(bookmark: Bookmark): void {
  const allBookmarks = store.get('bookmarks');
  const fileBookmarks = allBookmarks[bookmark.filePath] || [];
  const existingIndex = fileBookmarks.findIndex((b) => b.id === bookmark.id);
  if (existingIndex >= 0) {
    fileBookmarks[existingIndex] = bookmark;
  } else {
    fileBookmarks.push(bookmark);
  }
  allBookmarks[bookmark.filePath] = fileBookmarks;
  store.set('bookmarks', allBookmarks);
}

export function deleteBookmark(id: string): void {
  const allBookmarks = store.get('bookmarks');
  for (const filePath of Object.keys(allBookmarks)) {
    allBookmarks[filePath] = allBookmarks[filePath].filter((b) => b.id !== id);
  }
  store.set('bookmarks', allBookmarks);
}

export function getBookmarks(filePath: string): Bookmark[] {
  const allBookmarks = store.get('bookmarks');
  return allBookmarks[filePath] || [];
}

export function savePlaylists(playlists: Playlist[]): void {
  store.set('playlists', playlists);
}

export function getPlaylists(): Playlist[] {
  return store.get('playlists');
}

export function saveLastSession(session: LastSession): void {
  store.set('lastSession', session);
}

export function getLastSession(): LastSession | null {
  return store.get('lastSession');
}

export function saveEqSettings(settings: EqSettings): void {
  store.set('eqSettings', settings);
}

export function getEqSettings(): EqSettings | null {
  return store.get('eqSettings');
}
