import { useRef, useCallback, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useAudioActions } from '../../hooks/useAudioPlayer';
import { useChapters } from '../../hooks/useChapters';
import { formatTime } from '../../utils/formatTime';
import './ProgressBar.css';

export function ProgressBar() {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const { seek } = useAudioActions();
  const { currentChapter, hasChapters } = useChapters();
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  // When chapters exist, scope the progress bar to the current chapter
  const rangeStart = hasChapters && currentChapter ? currentChapter.startTime : 0;
  const rangeEnd = hasChapters && currentChapter ? currentChapter.endTime : duration;
  const rangeDuration = rangeEnd - rangeStart;

  // Keep refs for use inside event handlers (avoids stale closures)
  const rangeRef = useRef({ start: rangeStart, end: rangeEnd, duration: rangeDuration });
  rangeRef.current = { start: rangeStart, end: rangeEnd, duration: rangeDuration };

  const getTimeFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!barRef.current || rangeRef.current.duration <= 0) return rangeRef.current.start;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      // Map ratio to absolute time within the current range
      return rangeRef.current.start + ratio * rangeRef.current.duration;
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (rangeRef.current.duration <= 0) return;
      setIsDragging(true);
      const time = getTimeFromEvent(e);
      setDragTime(time);

      const onMove = (ev: MouseEvent) => {
        setDragTime(getTimeFromEvent(ev));
      };
      const onUp = (ev: MouseEvent) => {
        setIsDragging(false);
        seek(getTimeFromEvent(ev));
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [getTimeFromEvent, seek],
  );

  const displayTime = isDragging ? dragTime : currentTime;
  // Calculate progress within the current range
  const relativeTime = Math.max(0, displayTime - rangeStart);
  const progress = rangeDuration > 0 ? Math.min(100, (relativeTime / rangeDuration) * 100) : 0;

  return (
    <div className="progress-bar">
      <span className="progress-bar__time">{formatTime(relativeTime)}</span>
      <div
        className="progress-bar__track skeuo-inset"
        ref={barRef}
        onMouseDown={handleMouseDown}
        role="slider"
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={Math.floor(rangeDuration)}
        aria-valuenow={Math.floor(relativeTime)}
      >
        <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
        <div className="progress-bar__thumb" style={{ left: `${progress}%` }} />
      </div>
      <span className="progress-bar__time">{formatTime(rangeDuration)}</span>
    </div>
  );
}
