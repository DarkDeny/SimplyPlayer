import { useEffect, useCallback, useRef } from 'react';
import { useAudioRef } from '../context/AudioContext';
import { usePlayerStore } from '../store/playerStore';
import { ensureAudioContextResumed } from '../audio/audioEngine';
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
  autoPlay = true,
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

  console.log('[SP] loadFileInternal: url=', url);
  console.log('[SP] loadFileInternal: chapters=', metadata.chapters?.length ?? 0, metadata.chapters);
  console.log('[SP] loadFileInternal: audioRef.current=', !!audioRef.current);

  // A newer load was triggered while we were awaiting — discard this result
  if (requestId !== loadRequestCounter) return false;

  // Reset any stale pending seek, then queue the saved position if one exists
  pendingSeekPosition = null;
  if (savedPosition && savedPosition.position > 0) {
    pendingSeekPosition = savedPosition.position;
  }

  usePlayerStore.getState().setCurrentTrack(metadata, url);
  usePlayerStore.getState().setBookmarks(bookmarks);
  if (autoPlay) {
    usePlayerStore.getState().setIsPlaying(true);
  }
  return true;
}

/** Save current session state (playlist + index + position + playing flag) for restore on restart. */
function saveSessionNow(): void {
  const { playlist, currentIndex, currentTime, isPlaying } = usePlayerStore.getState();
  if (playlist.length === 0) return;
  window.electronAPI
    .saveLastSession({
      filePaths: playlist.map((t) => t.filePath),
      currentIndex,
      position: currentTime,
      wasPlaying: isPlaying,
    })
    .catch((err: unknown) => {
      console.error('Failed to save session:', err);
    });
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
    console.log('[SP] source effect: audio=', !!audio, 'audioUrl=', audioUrl?.slice(0, 80));
    if (!audio || !audioUrl) return;
    audio.src = audioUrl;
    // Log audio element events for debugging
    const onError = () => console.error('[SP] audio error: code=' + audio.error?.code + ' msg=' + audio.error?.message);
    const onCanPlay = () => console.log('[SP] audio canplay, duration=' + audio.duration + ' readyState=' + audio.readyState);
    const onLoadStart = () => console.log('[SP] audio loadstart');
    const onLoadedMeta = () => console.log('[SP] audio loadedmetadata, duration=' + audio.duration);
    audio.addEventListener('error', onError);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('loadedmetadata', onLoadedMeta);
    return () => {
      audio.removeEventListener('error', onError);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('loadedmetadata', onLoadedMeta);
    };
  }, [audioRef, audioUrl]);

  // Play/pause sync
  useEffect(() => {
    const audio = audioRef.current;
    console.log('[SP] play/pause effect: audio=', !!audio, 'isPlaying=', isPlaying, 'audioUrl=', !!audioUrl);
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      ensureAudioContextResumed();
      console.log('[SP] calling audio.play(), readyState=' + audio.readyState + ' networkState=' + audio.networkState + ' src=' + audio.src?.slice(0, 80));
      audio.play().then(() => {
        console.log('[SP] audio.play() succeeded, currentTime=' + audio.currentTime);
      }).catch((err) => {
        console.error('[SP] audio.play() FAILED: ' + (err instanceof Error ? err.message : String(err)));
        setIsPlaying(false);
      });
    } else {
      audio.pause();
      // Save position + session whenever playback is paused
      const track = usePlayerStore.getState().currentTrack;
      if (track && audio.currentTime > 0) {
        savePositionNow(track.filePath, audio.currentTime);
        saveSessionNow();
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

  // Auto-save playback position + session every 5 seconds while playing
  useEffect(() => {
    if (isPlaying) {
      positionSaveTimer.current = setInterval(() => {
        const { currentTrack, currentTime } = usePlayerStore.getState();
        if (currentTrack) {
          savePositionNow(currentTrack.filePath, currentTime);
          saveSessionNow();
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
        saveSessionNow();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Restore last session on startup (run once)
  const sessionRestored = useRef(false);
  useEffect(() => {
    if (sessionRestored.current) return;
    sessionRestored.current = true;

    (async () => {
      try {
        const session = await window.electronAPI.getLastSession();
        if (!session || session.filePaths.length === 0) return;

        console.log('[SP] restoring session:', session.filePaths.length, 'files, index=', session.currentIndex, 'pos=', session.position);

        // Use allSettled so a single missing/moved file doesn't break the entire restore
        const results = await Promise.allSettled(
          session.filePaths.map((fp) => window.electronAPI.getMetadata(fp)),
        );

        const metadataList: AudioMetadata[] = [];
        const validPaths: string[] = [];
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          if (r.status === 'fulfilled') {
            metadataList.push(r.value);
            validPaths.push(session.filePaths[i]);
          } else {
            console.warn('[SP] session restore: skipping missing file:', session.filePaths[i]);
          }
        }

        if (metadataList.length === 0) return;

        // Recalculate index: the saved index may point to a file that was filtered out
        let restoredIndex = validPaths.indexOf(session.filePaths[session.currentIndex]);
        if (restoredIndex < 0) restoredIndex = 0;

        usePlayerStore.getState().setPlaylistAndIndex(metadataList, restoredIndex);

        const currentFilePath = validPaths[restoredIndex];
        if (currentFilePath) {
          await loadFileInternal(
            currentFilePath,
            audioRef,
            metadataList[restoredIndex],
            session.wasPlaying ?? false,
          );
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      }
    })();
  }, [audioRef]);
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
      console.log('[SP] seek: time=' + time + ' audio=' + !!audio + ' duration=' + audio?.duration + ' readyState=' + audio?.readyState);
      if (audio && isFinite(time)) {
        const clamped = Math.max(0, Math.min(time, audio.duration || 0));
        console.log('[SP] seek: clamped=' + clamped);
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
    console.log('[SP] openFileDialog clicked');
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
    console.log('[SP] openFolderDialog clicked');
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
