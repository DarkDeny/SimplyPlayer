import { useAudioActions } from '../../hooks/useAudioPlayer';
import { usePlayerStore } from '../../store/playerStore';
import './SeekButtons.css';

interface SeekStep {
  label: string;
  seconds: number;
}

const SEEK_BACK: SeekStep[] = [
  { label: '30m', seconds: 30 * 60 },
  { label: '10m', seconds: 10 * 60 },
  { label: '1m', seconds: 60 },
  { label: '15s', seconds: 15 },
];

const SEEK_FORWARD: SeekStep[] = [...SEEK_BACK].reverse();

export function SeekButtons() {
  const { seekRelative } = useAudioActions();
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  if (!currentTrack) return null;

  return (
    <div className="seek-buttons">
      <div className="seek-buttons__group">
        {SEEK_BACK.map(({ label, seconds }) => (
          <button
            key={`back-${label}`}
            className="skeuo-btn seek-buttons__btn"
            onClick={() => seekRelative(-seconds)}
            title={`Rewind ${label}`}
            aria-label={`Rewind ${label}`}
          >
            <RewindIcon />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="seek-buttons__group">
        {SEEK_FORWARD.map(({ label, seconds }) => (
          <button
            key={`fwd-${label}`}
            className="skeuo-btn seek-buttons__btn"
            onClick={() => seekRelative(seconds)}
            title={`Forward ${label}`}
            aria-label={`Forward ${label}`}
          >
            <span>{label}</span>
            <ForwardIcon />
          </button>
        ))}
      </div>
    </div>
  );
}

function RewindIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
    </svg>
  );
}

function ForwardIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
    </svg>
  );
}
