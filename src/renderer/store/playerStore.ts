import { create } from 'zustand';
import type { AudioMetadata, Bookmark } from '../../shared/types';

interface PlayerState {
  // Current track
  currentTrack: AudioMetadata | null;
  audioUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;

  // Chapters (for M4B) — derived from currentTrack.chapters
  currentChapterIndex: number;

  // Bookmarks
  bookmarks: Bookmark[];

  // Sleep timer
  sleepTimerEnd: number | null; // timestamp when to stop
  sleepTimerMode: 'off' | 'time' | 'chapter';

  // Playlist
  playlist: AudioMetadata[];
  currentIndex: number;

  // Actions
  setCurrentTrack: (track: AudioMetadata, audioUrl: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setCurrentChapterIndex: (index: number) => void;
  setBookmarks: (bookmarks: Bookmark[]) => void;
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (id: string) => void;
  setSleepTimer: (end: number | null, mode: 'off' | 'time' | 'chapter') => void;
  setPlaylistAndIndex: (playlist: AudioMetadata[], currentIndex: number) => void;
  removeFromPlaylist: (index: number) => void;
  moveInPlaylist: (fromIndex: number, toIndex: number) => void;
  reset: () => void;
}

const initialState = {
  currentTrack: null as AudioMetadata | null,
  audioUrl: null as string | null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  playbackRate: 1,
  currentChapterIndex: -1,
  bookmarks: [] as Bookmark[],
  sleepTimerEnd: null as number | null,
  sleepTimerMode: 'off' as const,
  playlist: [] as AudioMetadata[],
  currentIndex: -1,
};

export const usePlayerStore = create<PlayerState>((set) => ({
  ...initialState,

  setCurrentTrack: (track, audioUrl) =>
    set({
      currentTrack: track,
      audioUrl,
      currentTime: 0,
      duration: track.duration,
      currentChapterIndex: -1,
    }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setCurrentChapterIndex: (index) => set({ currentChapterIndex: index }),
  setBookmarks: (bookmarks) => set({ bookmarks }),
  addBookmark: (bookmark) =>
    set((state) => ({ bookmarks: [...state.bookmarks, bookmark] })),
  removeBookmark: (id) =>
    set((state) => ({ bookmarks: state.bookmarks.filter((b) => b.id !== id) })),
  setSleepTimer: (end, mode) => set({ sleepTimerEnd: end, sleepTimerMode: mode }),

  /** Atomically set both playlist and currentIndex to avoid race conditions */
  setPlaylistAndIndex: (playlist, currentIndex) => set({ playlist, currentIndex }),

  removeFromPlaylist: (index) =>
    set((state) => {
      const newPlaylist = [...state.playlist];
      newPlaylist.splice(index, 1);
      // Adjust currentIndex: shift if a track before current was removed
      let newIndex = state.currentIndex;
      if (index < state.currentIndex) {
        newIndex--;
      } else if (index === state.currentIndex) {
        // Removed the currently playing track — caller must handle playback
        newIndex = Math.min(newIndex, newPlaylist.length - 1);
      }
      return { playlist: newPlaylist, currentIndex: newIndex };
    }),

  moveInPlaylist: (fromIndex, toIndex) =>
    set((state) => {
      if (fromIndex === toIndex) return state;
      const newPlaylist = [...state.playlist];
      const [moved] = newPlaylist.splice(fromIndex, 1);
      // After removing fromIndex, adjust toIndex for the "insert before" semantics
      const adjustedTo = fromIndex < toIndex ? toIndex - 1 : toIndex;
      newPlaylist.splice(adjustedTo, 0, moved);

      // Update currentIndex to follow the currently playing track
      let newIndex = state.currentIndex;
      if (state.currentIndex === fromIndex) {
        newIndex = adjustedTo;
      } else {
        if (fromIndex < state.currentIndex && adjustedTo >= state.currentIndex) {
          newIndex--;
        } else if (fromIndex > state.currentIndex && adjustedTo <= state.currentIndex) {
          newIndex++;
        }
      }
      return { playlist: newPlaylist, currentIndex: newIndex };
    }),

  reset: () => set(initialState),
}));
