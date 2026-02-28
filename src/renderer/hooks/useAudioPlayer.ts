import { useRef, useEffect, useCallback } from 'react';
import { usePlayerStore } from '../store/playerStore';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const {
    audioUrl,
    isPlaying,
    volume,
    playbackRate,
    currentTrack,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setCurrentTrack,
  } = usePlayerStore();

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preservesPitch = true;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Update source
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    audio.src = audioUrl;
    audio.load();
  }, [audioUrl]);

  // Play/pause sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, audioUrl, setIsPlaying]);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Playback rate sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

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
  }, [setCurrentTime, setDuration, setIsPlaying]);

  const play = useCallback(() => setIsPlaying(true), [setIsPlaying]);
  const pause = useCallback(() => setIsPlaying(false), [setIsPlaying]);
  const togglePlay = useCallback(() => setIsPlaying(!isPlaying), [isPlaying, setIsPlaying]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    setCurrentTime(0);
  }, [setIsPlaying, setCurrentTime]);

  const seek = useCallback(
    (time: number) => {
      if (audioRef.current && isFinite(time)) {
        const clamped = Math.max(0, Math.min(time, audioRef.current.duration || 0));
        audioRef.current.currentTime = clamped;
        setCurrentTime(clamped);
      }
    },
    [setCurrentTime],
  );

  const seekRelative = useCallback(
    (delta: number) => {
      if (audioRef.current) {
        seek(audioRef.current.currentTime + delta);
      }
    },
    [seek],
  );

  const loadFile = useCallback(
    async (filePath: string) => {
      const metadata = await window.electronAPI.getMetadata(filePath);
      const url = await window.electronAPI.getFileUrl(filePath);
      setCurrentTrack(metadata, url);
      setIsPlaying(true);
    },
    [setCurrentTrack, setIsPlaying],
  );

  const openFileDialog = useCallback(async () => {
    const files = await window.electronAPI.openFiles();
    if (files.length > 0) {
      await loadFile(files[0]);
    }
  }, [loadFile]);

  return {
    audioRef,
    play,
    pause,
    togglePlay,
    stop,
    seek,
    seekRelative,
    loadFile,
    openFileDialog,
    currentTrack,
    isPlaying,
  };
}
