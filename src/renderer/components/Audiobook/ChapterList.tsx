import { useEffect, useRef, useState } from 'react';
import { useChapters } from '../../hooks/useChapters';
import { useAudioActions } from '../../hooks/useAudioPlayer';
import { usePlayerStore } from '../../store/playerStore';
import { CollapsiblePanel } from '../Layout/CollapsiblePanel';
import { formatTime } from '../../utils/formatTime';
import './ChapterList.css';

export function ChapterList() {
  const { chapters, currentChapterIndex } = useChapters();
  const { seek } = useAudioActions();
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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

  // Clear selection when the playing chapter changes
  useEffect(() => {
    setSelectedIndex(null);
  }, [currentChapterIndex]);

  if (chapters.length === 0) return null;

  const handleClick = (index: number) => {
    setSelectedIndex(index);
  };

  const handleDoubleClick = (index: number) => {
    seek(chapters[index].startTime);
    setIsPlaying(true);
  };

  return (
    <CollapsiblePanel title="Chapters" storageKey="chapters">
      <div className="chapter-list__items skeuo-inset" ref={listRef}>
        {chapters.map((chapter, index) => {
          const isPlaying = index === currentChapterIndex;
          const isSelected = index === selectedIndex;
          const duration = chapter.endTime - chapter.startTime;

          let className = 'chapter-list__item';
          if (isPlaying) className += ' chapter-list__item--active';
          if (isSelected) className += ' chapter-list__item--selected';

          return (
            <button
              key={index}
              ref={isPlaying ? activeRef : undefined}
              className={className}
              onClick={() => handleClick(index)}
              onDoubleClick={() => handleDoubleClick(index)}
              title={`Double-click to play ${chapter.title}`}
            >
              <span className="chapter-list__index">{index + 1}</span>
              <span className="chapter-list__name">{chapter.title}</span>
              <span className="chapter-list__duration">{formatTime(duration)}</span>
            </button>
          );
        })}
      </div>
    </CollapsiblePanel>
  );
}
