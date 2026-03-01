import { usePlayerStore } from '../../store/playerStore';
import { useAudioActions } from '../../hooks/useAudioPlayer';
import { formatTime } from '../../utils/formatTime';
import './Bookmarks.css';

export function Bookmarks() {
  const bookmarks = usePlayerStore((s) => s.bookmarks);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const { seek, addBookmarkAtCurrentTime, deleteBookmark } = useAudioActions();

  if (!currentTrack) return null;

  // Sort bookmarks by position ascending
  const sortedBookmarks = [...bookmarks].sort((a, b) => a.position - b.position);

  return (
    <div className="bookmarks">
      <div className="bookmarks__header">
        <h3 className="bookmarks__title">Bookmarks</h3>
        <button
          className="skeuo-btn skeuo-btn--small bookmarks__add-btn"
          onClick={() => addBookmarkAtCurrentTime()}
          title="Add bookmark at current position"
          aria-label="Add bookmark at current position"
        >
          <PlusIcon />
          <span>Add</span>
        </button>
      </div>
      {sortedBookmarks.length === 0 ? (
        <p className="bookmarks__empty">No bookmarks yet</p>
      ) : (
        <div className="bookmarks__list skeuo-inset">
          {sortedBookmarks.map((bookmark) => (
            <div key={bookmark.id} className="bookmarks__item">
              <button
                className="bookmarks__seek-btn"
                onClick={() => seek(bookmark.position)}
                title={`Go to ${bookmark.label}`}
                aria-label={`Go to ${bookmark.label}`}
              >
                <BookmarkIcon />
                <span className="bookmarks__label">{bookmark.label}</span>
                <span className="bookmarks__time">{formatTime(bookmark.position)}</span>
              </button>
              <button
                className="skeuo-btn skeuo-btn--icon bookmarks__delete-btn"
                onClick={() => deleteBookmark(bookmark.id)}
                title="Delete bookmark"
                aria-label={`Delete bookmark: ${bookmark.label}`}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}
