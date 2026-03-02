import { useEffect, useState, useCallback, useRef } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { formatTime } from '../../utils/formatTime';
import type { Chapter } from '../../../shared/types';
import './SleepTimer.css';

interface TimerPreset {
  label: string;
  minutes: number;
}

const PRESETS: TimerPreset[] = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
];

export function SleepTimer() {
  const sleepTimerEnd = usePlayerStore((s) => s.sleepTimerEnd);
  const sleepTimerMode = usePlayerStore((s) => s.sleepTimerMode);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  // Read chapter info directly from the store (avoids duplicate useChapters effects)
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentChapterIndex = usePlayerStore((s) => s.currentChapterIndex);
  const hasChapters = (currentTrack?.chapters?.length ?? 0) > 0;
  const currentChapter: Chapter | null =
    currentChapterIndex >= 0 && currentTrack?.chapters?.[currentChapterIndex]
      ? currentTrack.chapters[currentChapterIndex]
      : null;

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = sleepTimerMode !== 'off';

  // --- "End of chapter" mode ---
  const currentTime = usePlayerStore((s) => s.currentTime);

  useEffect(() => {
    if (sleepTimerMode !== 'chapter') return;

    if (!currentChapter) {
      // Chapter is null (between chapters or malformed) — stop playback immediately
      setIsPlaying(false);
      setSleepTimer(null, 'off');
      return;
    }

    const remaining = Math.max(0, currentChapter.endTime - currentTime);
    setRemainingSeconds(Math.ceil(remaining));

    if (remaining <= 0) {
      setIsPlaying(false);
      setSleepTimer(null, 'off');
    }
  }, [sleepTimerMode, currentChapter, currentTime, setIsPlaying, setSleepTimer]);

  // --- Time-based mode (pause-aware) ---
  // Pause the countdown when playback is paused by shifting sleepTimerEnd forward.
  const pausedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (sleepTimerMode !== 'time' || sleepTimerEnd === null) {
      pausedAtRef.current = null;
      return;
    }

    if (!isPlaying) {
      // Playback just paused — record when
      pausedAtRef.current = Date.now();
    } else if (pausedAtRef.current !== null) {
      // Playback just resumed — shift end time by the pause duration
      const pauseDuration = Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
      if (pauseDuration > 0) {
        setSleepTimer(sleepTimerEnd + pauseDuration, 'time');
      }
    }
  }, [isPlaying, sleepTimerMode, sleepTimerEnd, setSleepTimer]);

  // Countdown tick for time-based mode (only ticks down while playing)
  useEffect(() => {
    if (sleepTimerMode !== 'time' || sleepTimerEnd === null) {
      if (sleepTimerMode === 'off') setRemainingSeconds(0);
      return;
    }

    if (!isPlaying) {
      // While paused, show frozen remaining time
      const remaining = Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      return;
    }

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((sleepTimerEnd - now) / 1000));
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        setIsPlaying(false);
        setSleepTimer(null, 'off');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerMode, sleepTimerEnd, isPlaying, setIsPlaying, setSleepTimer]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSetTimer = useCallback(
    (minutes: number) => {
      const end = Date.now() + minutes * 60 * 1000;
      setSleepTimer(end, 'time');
      setIsOpen(false);
    },
    [setSleepTimer],
  );

  const handleEndOfChapter = useCallback(() => {
    setSleepTimer(null, 'chapter');
    setIsOpen(false);
  }, [setSleepTimer]);

  const handleCancel = useCallback(() => {
    setSleepTimer(null, 'off');
    setIsOpen(false);
  }, [setSleepTimer]);

  return (
    <div className="sleep-timer" ref={dropdownRef}>
      <button
        className={`skeuo-btn skeuo-btn--small sleep-timer__toggle ${isActive ? 'sleep-timer__toggle--active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isActive ? `Sleep timer: ${formatTime(remainingSeconds)}` : 'Sleep timer'}
        aria-label={isActive ? `Sleep timer active: ${formatTime(remainingSeconds)} remaining` : 'Sleep timer'}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoonIcon />
        {isActive && (
          <span className="sleep-timer__badge">{formatTime(remainingSeconds)}</span>
        )}
      </button>

      {isOpen && (
        <div className="sleep-timer__dropdown skeuo-panel" role="menu">
          <div className="sleep-timer__dropdown-title">Sleep Timer</div>
          {PRESETS.map((preset) => (
            <button
              key={preset.minutes}
              className="sleep-timer__option"
              onClick={() => handleSetTimer(preset.minutes)}
              role="menuitem"
            >
              <ClockIcon />
              <span>{preset.label}</span>
            </button>
          ))}
          {hasChapters && (
            <button
              className="sleep-timer__option"
              onClick={handleEndOfChapter}
              role="menuitem"
            >
              <ChapterIcon />
              <span>End of chapter</span>
            </button>
          )}
          {isActive && (
            <>
              <div className="sleep-timer__divider" />
              <button
                className="sleep-timer__option sleep-timer__option--cancel"
                onClick={handleCancel}
                role="menuitem"
              >
                <CancelIcon />
                <span>Cancel timer</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
    </svg>
  );
}

function ChapterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}
