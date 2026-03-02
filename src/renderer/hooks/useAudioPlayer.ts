import { useEffect, useCallback, useRef } from 'react';
import { useAudioRef } from '../context/AudioContext';
import { usePlayerStore } from '../store/playerStore';
import type { AudioMetadata } from '../../shared/types';
import { formatTime } from '../utils/formatTime';

/** How often to auto-save the playback position (ms) */
const POSITION_SAVE_INTERVAL = 5_000;

// --- Module-level state shared between setup and actions ---
let pendingSeekPosition: number | null = null;

/**
 * Monotonically increasing counter for load requests.
 * Used to discard stale async results when a newer load was triggered.
 */
let loadRequestCounter = 0;

// --- Shared internal helpers ---

/**
 * Load a file into the audio element and update the store.
 * Does NOT modify playlist/index — callers handle that.
 *
 * @param preloadedMetadata  If provided, skips the getMetadata IPC call.
 * @returns false if the request was superseded by a newer load.
 */
async function loadFileInternal(
  filePath: string,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  preloadedMetadata?: AudioMetadata,
): Promise<boolean> {
  const requestId = ++loadRequestCounter;

  // Save position of the current track before switching
  const prevTrack = usePlayerStore.getState().currentTrack;
  if (prevTrack && audioRef.current) {
    await savePositionNow(prevTrack.filePath, audioRef.current.currentTime);
  }

  const metadataPromise = preloadedMetadata
    ? Promise.resolve(preloadedMetadata)
    : window.electronAPI.getMetadata(filePath);

  const [metadata, url, savedPosition, bookmarks] = await Promise.all([
    metadataPromise,
    window.electronAPI.getFileUrl(filePath),
    window.electronAPI.getPlaybackPosition(filePath),
    window.electronAPI.getBookmarks(filePath),
  ]);

  // A newer load was triggered while we were awaiting — discard this result
  if (requestId !== loadRequestCounter) return false;

  // If we have a saved position, queue it for restore after metadata loads
  if (savedPosition && savedPosition.position > 0) {
    pendingSeekPosition = savedPosition.position;
  }

  usePlayerStore.getState().setCurrentTrack(metadata, url);
  usePlayerStore.getState().setBookmarks(bookmarks);
  usePlayerStore.getState().setIsPlaying(true);
  return true;
}

/** Stop playback, clear the audio element, and reset store (preserving volume/rate). */
function stopAndResetPlayback(
  audioRef: React.RefObject<HTMLAudioElement | null>,
): void {
  usePlayerStore.getState().setIsPlaying(false);
  if (audioRef.current) {
    audioRef.current.removeAttribute('src');
    audioRef.current.load();
  }
  // Preserve user preferences across reset
  const { volume, playbackRate } = usePlayerStore.getState();
  usePlayerStore.getState().reset();
  usePlayerStore.getState().setVolume(volume);
  usePlayerStore.getState().setPlaybackRate(playbackRate);
}

/** Save playback position to persistent storage */
function savePositionNow(filePath: string, position: number): Promise<void> {
  return window.electronAPI
    .savePlaybackPosition({
      filePath,
      position,
      updatedAt: Date.now(),
    })
    .catch((err: unknown) => {
      console.error('Failed to save playback position:', err);
    });
}

// ---------------------------------------------------------------------------
// useAudioPlayerSetup — call ONCE in a top-level component (e.g. App)
// ---------------------------------------------------------------------------

/**
 * Sets up all audio side-effects: source loading, play/pause sync,
 * volume, playback rate, event listeners, position auto-save,
 * and playlist auto-advance.
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

  // Time update events + auto-advance on ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      // Auto-advance to next track in playlist
      const { playlist, currentIndex } = usePlayerStore.getState();
      if (playlist.length > 0 && currentIndex < playlist.length - 1) {
        const nextIndex = currentIndex + 1;
        // loadFileInternal saves the previous track's position before switching
        usePlayerStore.getState().setPlaylistAndIndex(playlist, nextIndex);
        loadFileInternal(playlist[nextIndex].filePath, audioRef).catch(
          (err) => {
            console.error('Failed to auto-advance to next track:', err);
            setIsPlaying(false);
          },
        );
      } else {
        // Last track or no playlist — save position and stop
        const track = usePlayerStore.getState().currentTrack;
        if (track) {
          savePositionNow(track.filePath, audio.currentTime);
        }
        setIsPlaying(false);
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

  // Best-effort save when the window is about to close
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

// ---------------------------------------------------------------------------
// useAudioActions — returns callbacks, safe to call from any component
// ---------------------------------------------------------------------------

/**
 * Returns audio player actions (callbacks) without setting up any effects.
 * Safe to call from any component — no duplicate listeners or timers.
 */
export function useAudioActions() {
  const audioRef = useAudioRef();

  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setPlaylistAndIndex = usePlayerStore((s) => s.setPlaylistAndIndex);

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

  /** Load and play a single file. Does NOT modify playlist/index. */
  const loadFile = useCallback(
    async (filePath: string) => {
      try {
        await loadFileInternal(filePath, audioRef);
      } catch (err) {
        console.error('Failed to load file:', filePath, err);
      }
    },
    [audioRef],
  );

  // --- Playlist-aware actions ---

  /** Load multiple files into the playlist and start playing the first one */
  const loadFilesAsPlaylist = useCallback(
    async (filePaths: string[]) => {
      if (filePaths.length === 0) return;

      try {
        const metadataList = await Promise.all(
          filePaths.map((fp) => window.electronAPI.getMetadata(fp)),
        );

        // Atomically set playlist and index together
        setPlaylistAndIndex(metadataList, 0);
        // Pass pre-fetched metadata to avoid a second IPC call
        await loadFileInternal(filePaths[0], audioRef, metadataList[0]);
      } catch (err) {
        console.error('Failed to load files as playlist:', err);
      }
    },
    [audioRef, setPlaylistAndIndex],
  );

  /** Play a specific track from the playlist by index */
  const playTrackByIndex = useCallback(
    async (index: number) => {
      const { playlist } = usePlayerStore.getState();
      if (index < 0 || index >= playlist.length) return;

      // Atomically update index with the current playlist
      setPlaylistAndIndex(playlist, index);
      try {
        await loadFileInternal(playlist[index].filePath, audioRef);
      } catch (err) {
        console.error('Failed to play track:', playlist[index].filePath, err);
        setIsPlaying(false);
      }
    },
    [audioRef, setPlaylistAndIndex, setIsPlaying],
  );

  /** Play the next track in the playlist */
  const playNext = useCallback(async () => {
    const { playlist, currentIndex } = usePlayerStore.getState();
    if (currentIndex < playlist.length - 1) {
      await playTrackByIndex(currentIndex + 1);
    }
  }, [playTrackByIndex]);

  /** Play the previous track in the playlist */
  const playPrevious = useCallback(async () => {
    const { currentIndex } = usePlayerStore.getState();
    if (currentIndex > 0) {
      await playTrackByIndex(currentIndex - 1);
    }
  }, [playTrackByIndex]);

  const openFileDialog = useCallback(async () => {
    try {
      const files = await window.electronAPI.openFiles();
      if (files.length > 0) {
        await loadFilesAsPlaylist(files);
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
    }
  }, [loadFilesAsPlaylist]);

  const openFolderDialog = useCallback(async () => {
    try {
      const files = await window.electronAPI.openFolder();
      if (files.length > 0) {
        await loadFilesAsPlaylist(files);
      }
    } catch (err) {
      console.error('Failed to open folder dialog:', err);
    }
  }, [loadFilesAsPlaylist]);

  /** Add files to the end of the current playlist without replacing it */
  const addFilesToPlaylist = useCallback(
    async (filePaths: string[]) => {
      if (filePaths.length === 0) return;

      try {
        const metadataList = await Promise.all(
          filePaths.map((fp) => window.electronAPI.getMetadata(fp)),
        );

        const { playlist, currentIndex, currentTrack } =
          usePlayerStore.getState();
        const newPlaylist = [...playlist, ...metadataList];

        // Atomically update playlist + index
        if (!currentTrack) {
          // Nothing playing — start playing the first added track
          const firstNewIndex = playlist.length;
          setPlaylistAndIndex(newPlaylist, firstNewIndex);
          // Pass pre-fetched metadata to avoid double fetch
          await loadFileInternal(
            filePaths[0],
            audioRef,
            metadataList[0],
          );
        } else {
          // Keep current index, just extend the playlist
          setPlaylistAndIndex(newPlaylist, currentIndex);
        }
      } catch (err) {
        console.error('Failed to add files to playlist:', err);
      }
    },
    [audioRef, setPlaylistAndIndex],
  );

  /** Remove a track from the playlist. Handles playback switching if current track is removed. */
  const removeTrack = useCallback(
    async (index: number) => {
      const { playlist, currentIndex } = usePlayerStore.getState();
      if (index < 0 || index >= playlist.length) return;

      const wasPlayingCurrent = index === currentIndex;

      // Remove from store (adjusts currentIndex atomically)
      usePlayerStore.getState().removeFromPlaylist(index);

      if (wasPlayingCurrent) {
        const { playlist: newPlaylist, currentIndex: newIndex } =
          usePlayerStore.getState();
        if (newPlaylist.length > 0 && newIndex >= 0) {
          // Auto-advance to the track now at currentIndex
          try {
            await loadFileInternal(newPlaylist[newIndex].filePath, audioRef);
          } catch (err) {
            console.error('Failed to switch track after removal:', err);
            // Just stop playback — don't wipe the entire playlist
            setIsPlaying(false);
            if (audioRef.current) {
              audioRef.current.removeAttribute('src');
              audioRef.current.load();
            }
          }
        } else {
          // Playlist is now empty — stop everything
          stopAndResetPlayback(audioRef);
        }
      }
    },
    [audioRef, setIsPlaying],
  );

  /** Clear the entire playlist and stop playback */
  const clearPlaylist = useCallback(() => {
    stopAndResetPlayback(audioRef);
  }, [audioRef]);

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

  const deleteBookmark = useCallback(async (id: string) => {
    try {
      await window.electronAPI.deleteBookmark(id);
      usePlayerStore.getState().removeBookmark(id);
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  }, []);

  return {
    play,
    pause,
    togglePlay,
    stop,
    seek,
    seekRelative,
    loadFile,
    loadFilesAsPlaylist,
    playTrackByIndex,
    playNext,
    playPrevious,
    openFileDialog,
    openFolderDialog,
    addFilesToPlaylist,
    removeTrack,
    clearPlaylist,
    addBookmarkAtCurrentTime,
    deleteBookmark,
  };
}
