import { usePlayerStore } from '../../store/playerStore';
import { useAudioActions } from '../../hooks/useAudioPlayer';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { SeekButtons } from './SeekButtons';
import { SpeedControl } from './SpeedControl';
import { SleepTimer } from '../Audiobook/SleepTimer';
import './PlayerToolbar.css';

export function PlayerToolbar() {
  const { togglePlay, stop, playPrevious, playNext, openFileDialog, openFolderDialog } = useAudioActions();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playlist = usePlayerStore((s) => s.playlist);
  const currentIndex = usePlayerStore((s) => s.currentIndex);

  const hasPrevious = playlist.length > 0 && currentIndex > 0;
  const hasNext = playlist.length > 0 && currentIndex < playlist.length - 1;

  return (
    <div className="player-toolbar skeuo-panel">
      <ProgressBar />

      {/* Row 1: Transport — seek / prev / stop / play / next / seek */}
      <div className="player-toolbar__transport">
        <SeekButtons />
        <button
          className="skeuo-btn skeuo-btn-round"
          onClick={playPrevious}
          title="Previous track"
          aria-label="Previous track"
          disabled={!hasPrevious}
        >
          <PreviousIcon />
        </button>
        <button
          className="skeuo-btn skeuo-btn-round"
          onClick={stop}
          title="Stop"
          aria-label="Stop"
          disabled={!currentTrack}
        >
          <StopIcon />
        </button>
        <button
          className="skeuo-btn-play"
          onClick={togglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          disabled={!currentTrack}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          className="skeuo-btn skeuo-btn-round"
          onClick={playNext}
          title="Next track"
          aria-label="Next track"
          disabled={!hasNext}
        >
          <NextIcon />
        </button>
      </div>

      {/* Row 2: Info (left) + Utilities (right) */}
      <div className="player-toolbar__info-row">
        <div className="player-toolbar__left">
          {currentTrack ? (
            <div className="player-toolbar__track-info">
              {currentTrack.coverArt && (
                <img
                  className="player-toolbar__cover"
                  src={currentTrack.coverArt}
                  alt="Cover"
                />
              )}
              <div className="player-toolbar__text">
                <div className="player-toolbar__title">{currentTrack.title}</div>
                <div className="player-toolbar__artist">{currentTrack.artist}</div>
              </div>
            </div>
          ) : (
            <div className="player-toolbar__open-buttons">
              <button className="skeuo-btn" onClick={openFileDialog}>
                Open Files
              </button>
              <button className="skeuo-btn" onClick={openFolderDialog}>
                Open Folder
              </button>
            </div>
          )}
        </div>

        <div className="player-toolbar__right">
          <button
            className="skeuo-btn skeuo-btn--small"
            onClick={openFolderDialog}
            title="Open Folder"
            aria-label="Open Folder"
          >
            <FolderIcon />
          </button>
          <SleepTimer />
          <SpeedControl />
          <VolumeControl />
        </div>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}

function PreviousIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}
