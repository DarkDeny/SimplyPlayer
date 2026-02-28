import { createContext, useContext, useRef, useEffect, type ReactNode } from 'react';

interface AudioContextValue {
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preservesPitch = true;
      audioRef.current = audio;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
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
