import { useRef, useCallback, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { formatTime } from '../../utils/formatTime';
import './ProgressBar.css';

export function ProgressBar() {
  const { currentTime, duration } = usePlayerStore();
  const { seek } = useAudioPlayer();
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  const getTimeFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!barRef.current || !duration) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!duration) return;
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
    [duration, getTimeFromEvent, seek],
  );

  const displayTime = isDragging ? dragTime : currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  return (
    <div className="progress-bar">
      <span className="progress-bar__time">{formatTime(displayTime)}</span>
      <div
        className="progress-bar__track skeuo-inset"
        ref={barRef}
        onMouseDown={handleMouseDown}
      >
        <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
        <div className="progress-bar__thumb" style={{ left: `${progress}%` }} />
      </div>
      <span className="progress-bar__time">{formatTime(duration)}</span>
    </div>
  );
}
