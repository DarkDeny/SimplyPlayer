import { useEffect, useCallback, useRef } from 'react';
import { useAudioRef } from '../context/AudioContext';
import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../utils/formatTime';

/** How often to auto-save the playback position (ms) */
const POSITION_SAVE_INTERVAL = 5_000;

// --- Shared ref for pending seek (module-level so both hooks can access it) ---
let pendingSeekPosition: number | null = null;

/**
 * Sets up all audio side-effects: source loading, play/pause sync,
 * volume, playback rate, event listeners, and position auto-save.
 *
 * MUST be called exactly ONCE, in a top-level component (e.g. App).
 */
export function useAudioPlayerSetup() {
  const audioRef = useAudioRef();
  const positionSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioUrl = usePlayerStore((s) => s.audioUrl);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);

  // Update source
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    audio.src = audioUrl;
    audio.load();
  }, [audioRef, audioUrl]);

  // Play/pause sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      // Save position whenever playback is paused
      const track = usePlayerStore.getState().currentTrack;
      if (track && audio.currentTime > 0) {
        savePositionNow(track.filePath, audio.currentTime);
      }
    }
  }, [audioRef, isPlaying, audioUrl, setIsPlaying]);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [audioRef, volume]);

  // Playback rate sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [audioRef, playbackRate]);

  // Time update events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      const track = usePlayerStore.getState().currentTrack;
      if (track) {
        savePositionNow(track.filePath, audio.currentTime);
      }
    };
    const onLoadedMetadata = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
      // Restore saved position after metadata is loaded
      if (pendingSeekPosition !== null) {
        const pos = pendingSeekPosition;
        pendingSeekPosition = null;
        audio.currentTime = pos;
        setCurrentTime(pos);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [audioRef, setCurrentTime, setDuration, setIsPlaying]);

  // Auto-save playback position every 5 seconds while playing
  useEffect(() => {
    if (isPlaying) {
      positionSaveTimer.current = setInterval(() => {
        const { currentTrack, currentTime } = usePlayerStore.getState();
        if (currentTrack) {
          savePositionNow(currentTrack.filePath, currentTime);
        }
      }, POSITION_SAVE_INTERVAL);
    }
    return () => {
      if (positionSaveTimer.current) {
        clearInterval(positionSaveTimer.current);
        positionSaveTimer.current = null;
      }
    };
  }, [isPlaying]);

  // Best-effort save when the window is about to close.
  // Note: async IPC may not complete before teardown, but position is
  // already saved every 5s and on pause, so at most ~5s of progress is lost.
  useEffect(() => {
    const handleBeforeUnload = () => {
      const { currentTrack, currentTime } = usePlayerStore.getState();
      if (currentTrack) {
        savePositionNow(currentTrack.filePath, currentTime);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}

/**
 * Returns audio player actions (callbacks) without setting up any effects.
 * Safe to call from any component — no duplicate listeners or timers.
 */
export function useAudioActions() {
  const audioRef = useAudioRef();

  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setCurrentTrack = usePlayerStore((s) => s.setCurrentTrack);
  const setBookmarks = usePlayerStore((s) => s.setBookmarks);

  const play = useCallback(() => setIsPlaying(true), [setIsPlaying]);
  const pause = useCallback(() => setIsPlaying(false), [setIsPlaying]);
  const togglePlay = useCallback(() => {
    const playing = usePlayerStore.getState().isPlaying;
    setIsPlaying(!playing);
  }, [setIsPlaying]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    setCurrentTime(0);
  }, [audioRef, setIsPlaying, setCurrentTime]);

  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (audio && isFinite(time)) {
        const clamped = Math.max(0, Math.min(time, audio.duration || 0));
        audio.currentTime = clamped;
        setCurrentTime(clamped);
      }
    },
    [audioRef, setCurrentTime],
  );

  const seekRelative = useCallback(
    (delta: number) => {
      if (audioRef.current) {
        seek(audioRef.current.currentTime + delta);
      }
    },
    [audioRef, seek],
  );

  const loadFile = useCallback(
    async (filePath: string) => {
      try {
        // Save position of the current track before switching
        const prevTrack = usePlayerStore.getState().currentTrack;
        const prevAudio = audioRef.current;
        if (prevTrack && prevAudio) {
          await savePositionNow(prevTrack.filePath, prevAudio.currentTime);
        }

        const [metadata, url, savedPosition, bookmarks] = await Promise.all([
          window.electronAPI.getMetadata(filePath),
          window.electronAPI.getFileUrl(filePath),
          window.electronAPI.getPlaybackPosition(filePath),
          window.electronAPI.getBookmarks(filePath),
        ]);

        // If we have a saved position, queue it for restore after metadata loads
        if (savedPosition && savedPosition.position > 0) {
          pendingSeekPosition = savedPosition.position;
        }

        setCurrentTrack(metadata, url);
        setBookmarks(bookmarks);
        setIsPlaying(true);
      } catch (err) {
        console.error('Failed to load file:', filePath, err);
      }
    },
    [audioRef, setCurrentTrack, setIsPlaying, setBookmarks],
  );

  const openFileDialog = useCallback(async () => {
    try {
      const files = await window.electronAPI.openFiles();
      if (files.length > 0) {
        // TODO: Phase 5 — add remaining files to playlist
        await loadFile(files[0]);
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  }, [loadFile]);

  const addBookmarkAtCurrentTime = useCallback(
    async (label?: string) => {
      const { currentTrack, currentTime } = usePlayerStore.getState();
      if (!currentTrack) return;

      const bookmark = {
        id: crypto.randomUUID(),
        filePath: currentTrack.filePath,
        position: currentTime,
        label: label || `Bookmark at ${formatTime(currentTime)}`,
        createdAt: Date.now(),
      };

      try {
        await window.electronAPI.saveBookmark(bookmark);
        usePlayerStore.getState().addBookmark(bookmark);
      } catch (err) {
        console.error('Failed to save bookmark:', err);
      }
    },
    [],
  );

  const deleteBookmark = useCallback(
    async (id: string) => {
      try {
        await window.electronAPI.deleteBookmark(id);
        usePlayerStore.getState().removeBookmark(id);
      } catch (err) {
        console.error('Failed to delete bookmark:', err);
      }
    },
    [],
  );

  return {
    play,
    pause,
    togglePlay,
    stop,
    seek,
    seekRelative,
    loadFile,
    openFileDialog,
    addBookmarkAtCurrentTime,
    deleteBookmark,
  };
}

/** Save playback position to persistent storage */
function savePositionNow(filePath: string, position: number): Promise<void> {
  return window.electronAPI.savePlaybackPosition({
    filePath,
    position,
    updatedAt: Date.now(),
  }).catch((err) => {
    console.error('Failed to save playback position:', err);
  });
}
