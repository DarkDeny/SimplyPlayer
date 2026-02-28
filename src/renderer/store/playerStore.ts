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
  setPlaylist: (playlist: AudioMetadata[]) => void;
  setCurrentIndex: (index: number) => void;
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
  setPlaylist: (playlist) => set({ playlist }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  reset: () => set(initialState),
}));
