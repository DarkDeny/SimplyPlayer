import { createContext, useContext, useRef, useEffect, type ReactNode } from 'react';
import { initAudioEngine } from '../audio/audioEngine';

interface AudioContextValue {
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

/**
 * Create the audio element once, at module level.
 * This avoids all React lifecycle issues (Strict Mode double-mount,
 * useEffect ordering between parent and child, etc.).
 */
const globalAudio = new Audio();
globalAudio.preservesPitch = true;

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(globalAudio);

  useEffect(() => {
    initAudioEngine(globalAudio);
    return () => {
      globalAudio.pause();
      globalAudio.src = '';
    };
  }, []);

  return <AudioCtx.Provider value={{ audioRef }}>{children}</AudioCtx.Provider>;
}

export function useAudioElement(): HTMLAudioElement | null {
  const ctx = useContext(AudioCtx);
  if (!ctx) {
    throw new Error('useAudioElement must be used within <AudioProvider>');
  }
  return ctx.audioRef.current;
}

export function useAudioRef(): React.RefObject<HTMLAudioElement | null> {
  const ctx = useContext(AudioCtx);
  if (!ctx) {
    throw new Error('useAudioRef must be used within <AudioProvider>');
  }
  return ctx.audioRef;
}
