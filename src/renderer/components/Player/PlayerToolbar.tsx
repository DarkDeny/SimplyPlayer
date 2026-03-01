import { usePlayerStore } from '../../store/playerStore';
import { useAudioActions } from '../../hooks/useAudioPlayer';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { SeekButtons } from './SeekButtons';
import { SpeedControl } from './SpeedControl';
import { SleepTimer } from '../Audiobook/SleepTimer';
import './PlayerToolbar.css';

export function PlayerToolbar() {
  const { togglePlay, stop, openFileDialog } = useAudioActions();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

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
          <SeekButtons />
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
            className="skeuo-btn"
            onClick={openFileDialog}
            title="Open File"
            aria-label="Open File"
          >
            <FolderIcon />
          </button>
        </div>

        <div className="player-toolbar__right">
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

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}
