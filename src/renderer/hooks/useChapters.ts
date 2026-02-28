import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import type { Chapter } from '../../shared/types';

const EMPTY_CHAPTERS: Chapter[] = [];

/**
 * Tracks the current chapter index based on playback position.
 * Updates the store whenever the chapter changes.
 */
export function useChapters() {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentChapterIndex = usePlayerStore((s) => s.currentChapterIndex);
  const setCurrentChapterIndex = usePlayerStore((s) => s.setCurrentChapterIndex);

  const chapters = currentTrack?.chapters ?? EMPTY_CHAPTERS;

  useEffect(() => {
    if (chapters.length === 0) {
      if (currentChapterIndex !== -1) {
        setCurrentChapterIndex(-1);
      }
      return;
    }

    // Find which chapter we're in
    let newIndex = -1;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentTime >= chapters[i].startTime) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== currentChapterIndex) {
      setCurrentChapterIndex(newIndex);
    }
  }, [currentTime, chapters, currentChapterIndex, setCurrentChapterIndex]);

  return {
    chapters,
    currentChapterIndex,
    currentChapter: currentChapterIndex >= 0 ? chapters[currentChapterIndex] : null,
    hasChapters: chapters.length > 0,
  };
}
