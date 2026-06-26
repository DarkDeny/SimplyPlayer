import { usePlayerStore } from '../../store/playerStore';
import { useAudioActions } from '../../hooks/useAudioPlayer';
import { PlayerToolbar } from '../Player/PlayerToolbar';
import { ChapterList } from '../Audiobook/ChapterList';
import { Bookmarks } from '../Audiobook/Bookmarks';
import { Equalizer } from '../Player/Equalizer';
import { PlaylistPanel } from '../Playlist/PlaylistPanel';
import './MainLayout.css';

export function MainLayout() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const { openFileDialog } = useAudioActions();
  const hasChapters = usePlayerStore(
    (s) => (s.currentTrack?.chapters?.length ?? 0) > 0,
  );

  return (
    <div className="main-layout">
      <div className="main-layout__content">
        {/* Left sidebar — Playlist (always visible) */}
        <div className="main-layout__sidebar main-layout__sidebar--left">
          <PlaylistPanel />
        </div>

        {/* Center — Now playing / Welcome */}
        <div className="main-layout__center skeuo-inset">
          {currentTrack ? (
            <div className="main-layout__now-playing">
              {currentTrack.coverArt ? (
                <img
                  className="main-layout__cover"
                  src={currentTrack.coverArt}
                  alt="Album Cover"
                />
              ) : (
                <div className="main-layout__cover-placeholder skeuo-inset">
                  <MusicNoteIcon />
                </div>
              )}
              <div className="main-layout__track-details">
                <h2 className="main-layout__track-title">{currentTrack.title}</h2>
                <p className="main-layout__track-artist">{currentTrack.artist}</p>
                {currentTrack.album && (
                  <p className="main-layout__track-album">{currentTrack.album}</p>
                )}
              </div>
            </div>
          ) : (
            <div
              className="main-layout__welcome"
              onClick={openFileDialog}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openFileDialog()}
            >
              <div className="main-layout__welcome-icon skeuo-panel">
                <MusicNoteIcon />
              </div>
              <h1>SimplyPlayer</h1>
              <p>Click here or use the toolbar to open audio files</p>
            </div>
          )}
        </div>

        {/* Right sidebar — Chapters + Bookmarks + Equalizer */}
        {currentTrack && (
          <div className="main-layout__sidebar main-layout__sidebar--right">
            {hasChapters && <ChapterList />}
            <Bookmarks />
            <Equalizer />
          </div>
        )}
      </div>
      <PlayerToolbar />
    </div>
  );
}

function MusicNoteIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.4" aria-hidden="true">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );
}
