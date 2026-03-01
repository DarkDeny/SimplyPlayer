import { useEffect, useRef } from 'react';
import { useChapters } from '../../hooks/useChapters';
import { useAudioActions } from '../../hooks/useAudioPlayer';
import { formatTime } from '../../utils/formatTime';
import './ChapterList.css';

export function ChapterList() {
  const { chapters, currentChapterIndex } = useChapters();
  const { seek } = useAudioActions();
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to current chapter
  useEffect(() => {
    if (activeRef.current && listRef.current) {
      const list = listRef.current;
      const item = activeRef.current;
      const listRect = list.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      if (itemRect.top < listRect.top || itemRect.bottom > listRect.bottom) {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentChapterIndex]);

  if (chapters.length === 0) return null;

  return (
    <div className="chapter-list">
      <h3 className="chapter-list__title">Chapters</h3>
      <div className="chapter-list__items skeuo-inset" ref={listRef}>
        {chapters.map((chapter, index) => {
          const isActive = index === currentChapterIndex;
          const duration = chapter.endTime - chapter.startTime;
          return (
            <button
              key={index}
              ref={isActive ? activeRef : undefined}
              className={`chapter-list__item ${isActive ? 'chapter-list__item--active' : ''}`}
              onClick={() => seek(chapter.startTime)}
              title={`Go to ${chapter.title}`}
            >
              <span className="chapter-list__index">{index + 1}</span>
              <span className="chapter-list__name">{chapter.title}</span>
              <span className="chapter-list__duration">{formatTime(duration)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
