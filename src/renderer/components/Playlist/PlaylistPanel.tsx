import { useCallback, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useAudioActions } from '../../hooks/useAudioPlayer';
import { formatTime } from '../../utils/formatTime';
import './PlaylistPanel.css';

export function PlaylistPanel() {
  const playlist = usePlayerStore((s) => s.playlist);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const moveInPlaylist = usePlayerStore((s) => s.moveInPlaylist);
  const {
    playTrackByIndex,
    openFileDialog,
    openFolderDialog,
    clearPlaylist,
    removeTrack,
  } = useAudioActions();

  // Use refs for drag tracking to avoid stale closures in drag handlers
  const dragIndexRef = useRef<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  // State only for the visual drag-over indicator (needs re-render)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      dragIndexRef.current = index;
      dragNodeRef.current = e.currentTarget as HTMLDivElement;
      e.dataTransfer.effectAllowed = 'move';
      requestAnimationFrame(() => {
        dragNodeRef.current?.classList.add('playlist-panel__item--dragging');
      });
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // Only update state when the index actually changes to avoid excessive re-renders
      setDragOverIndex((prev) => (prev === index ? prev : index));
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      const from = dragIndexRef.current;
      if (from !== null && from !== index) {
        moveInPlaylist(from, index);
      }
    },
    [moveInPlaylist],
  );

  const handleDragEnd = useCallback(() => {
    dragNodeRef.current?.classList.remove('playlist-panel__item--dragging');
    dragIndexRef.current = null;
    setDragOverIndex(null);
    dragNodeRef.current = null;
  }, []);

  const handleRemove = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      removeTrack(index);
    },
    [removeTrack],
  );

  if (playlist.length === 0) {
    return (
      <div className="playlist-panel">
        <div className="playlist-panel__header">
          <h3 className="playlist-panel__title">Playlist</h3>
          <div className="playlist-panel__header-actions">
            <button
              className="skeuo-btn skeuo-btn--small"
              onClick={openFolderDialog}
              title="Open folder"
              aria-label="Open folder"
            >
              <FolderIcon />
            </button>
            <button
              className="skeuo-btn skeuo-btn--small"
              onClick={openFileDialog}
              title="Add files"
              aria-label="Add files"
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        <p className="playlist-panel__empty">
          Open files or a folder to start a playlist
        </p>
      </div>
    );
  }

  return (
    <div className="playlist-panel">
      <div className="playlist-panel__header">
        <h3 className="playlist-panel__title">
          Playlist
          <span className="playlist-panel__count">{playlist.length}</span>
        </h3>
        <div className="playlist-panel__header-actions">
          <button
            className="skeuo-btn skeuo-btn--small"
            onClick={openFolderDialog}
            title="Open folder"
            aria-label="Open folder"
          >
            <FolderIcon />
          </button>
          <button
            className="skeuo-btn skeuo-btn--small"
            onClick={openFileDialog}
            title="Add files"
            aria-label="Add files"
          >
            <PlusIcon />
          </button>
          <button
            className="skeuo-btn skeuo-btn--small"
            onClick={clearPlaylist}
            title="Clear playlist"
            aria-label="Clear playlist"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      <div className="playlist-panel__list skeuo-inset" role="listbox" aria-label="Playlist tracks">
        {playlist.map((track, index) => {
          const isActive = index === currentIndex;
          const isDragOver =
            index === dragOverIndex &&
            dragIndexRef.current !== null &&
            dragIndexRef.current !== index;

          return (
            <div
              key={index}
              className={[
                'playlist-panel__item',
                isActive ? 'playlist-panel__item--active' : '',
                isDragOver ? 'playlist-panel__item--drag-over' : '',
              ].join(' ')}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => playTrackByIndex(index)}
              role="option"
              aria-selected={isActive}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  playTrackByIndex(index);
                }
              }}
            >
              <span className="playlist-panel__item-index">
                {isActive ? <PlayingIcon /> : index + 1}
              </span>
              <div className="playlist-panel__item-info">
                <span className="playlist-panel__item-title">
                  {track.title}
                </span>
                <span className="playlist-panel__item-artist">
                  {track.artist}
                </span>
              </div>
              <span className="playlist-panel__item-duration">
                {formatTime(track.duration)}
              </span>
              <button
                className="playlist-panel__item-remove"
                onClick={(e) => handleRemove(e, index)}
                title="Remove from playlist"
                aria-label={`Remove ${track.title} from playlist`}
              >
                <CloseIcon />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlayingIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="var(--accent)"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}
