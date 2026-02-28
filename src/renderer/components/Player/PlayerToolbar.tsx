import { usePlayerStore } from '../../store/playerStore';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import './PlayerToolbar.css';

export function PlayerToolbar() {
  const { togglePlay, stop, openFileDialog, isPlaying } = useAudioPlayer();
  const { currentTrack, currentTime, duration } = usePlayerStore();

  return (
    <div className="player-toolbar skeuo-panel">
      <ProgressBar />
      <div className="player-toolbar__controls">
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
            <button className="skeuo-btn" onClick={openFileDialog}>
              Open File
            </button>
          )}
        </div>

        <div className="player-toolbar__center">
          <button
            className="skeuo-btn-round"
            onClick={stop}
            title="Stop"
            disabled={!currentTrack}
          >
            <StopIcon />
          </button>
          <button
            className="skeuo-btn-play"
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            disabled={!currentTrack}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            className="skeuo-btn"
            onClick={openFileDialog}
            title="Open File"
          >
            <FolderIcon />
          </button>
        </div>

        <div className="player-toolbar__right">
          <VolumeControl />
        </div>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}
