import { useEffect, useCallback } from 'react';
import { useAudioRef } from '../context/AudioContext';
import { usePlayerStore } from '../store/playerStore';

export function useAudioPlayer() {
  const audioRef = useAudioRef();

  const audioUrl = usePlayerStore((s) => s.audioUrl);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setCurrentTrack = usePlayerStore((s) => s.setCurrentTrack);

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
    const onEnded = () => setIsPlaying(false);
    const onLoadedMetadata = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
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

  const play = useCallback(() => setIsPlaying(true), [setIsPlaying]);
  const pause = useCallback(() => setIsPlaying(false), [setIsPlaying]);
  const togglePlay = useCallback(
    () => {
      const playing = usePlayerStore.getState().isPlaying;
      setIsPlaying(!playing);
    },
    [setIsPlaying],
  );

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
        const metadata = await window.electronAPI.getMetadata(filePath);
        const url = await window.electronAPI.getFileUrl(filePath);
        setCurrentTrack(metadata, url);
        setIsPlaying(true);
      } catch (err) {
        console.error('Failed to load file:', filePath, err);
      }
    },
    [setCurrentTrack, setIsPlaying],
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

  return {
    play,
    pause,
    togglePlay,
    stop,
    seek,
    seekRelative,
    loadFile,
    openFileDialog,
  };
}
