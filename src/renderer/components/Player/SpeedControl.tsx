import { usePlayerStore } from '../../store/playerStore';
import './SpeedControl.css';

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export function SpeedControl() {
  const playbackRate = usePlayerStore((s) => s.playbackRate);
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate);

  const handleDecrease = () => {
    const currentIndex = SPEED_PRESETS.indexOf(playbackRate);
    if (currentIndex > 0) {
      setPlaybackRate(SPEED_PRESETS[currentIndex - 1]);
    } else if (currentIndex === -1) {
      // Current speed is not a preset, find nearest lower
      const lower = SPEED_PRESETS.filter((s) => s < playbackRate);
      if (lower.length > 0) {
        setPlaybackRate(lower[lower.length - 1]);
      }
    }
  };

  const handleIncrease = () => {
    const currentIndex = SPEED_PRESETS.indexOf(playbackRate);
    if (currentIndex < SPEED_PRESETS.length - 1 && currentIndex >= 0) {
      setPlaybackRate(SPEED_PRESETS[currentIndex + 1]);
    } else if (currentIndex === -1) {
      const higher = SPEED_PRESETS.filter((s) => s > playbackRate);
      if (higher.length > 0) {
        setPlaybackRate(higher[0]);
      }
    }
  };

  const handleReset = () => {
    setPlaybackRate(1);
  };

  const formatRate = (rate: number) => {
    return rate === Math.floor(rate) ? `${rate}.0x` : `${rate}x`;
  };

  return (
    <div className="speed-control">
      <button
        className="skeuo-btn speed-control__btn"
        onClick={handleDecrease}
        disabled={playbackRate <= SPEED_PRESETS[0]}
        aria-label="Decrease speed"
        title="Decrease speed"
      >
        <MinusIcon />
      </button>
      <button
        className="speed-control__value"
        onClick={handleReset}
        title="Reset to 1.0x"
        aria-label={`Speed: ${formatRate(playbackRate)}. Click to reset.`}
      >
        {formatRate(playbackRate)}
      </button>
      <button
        className="skeuo-btn speed-control__btn"
        onClick={handleIncrease}
        disabled={playbackRate >= SPEED_PRESETS[SPEED_PRESETS.length - 1]}
        aria-label="Increase speed"
        title="Increase speed"
      >
        <PlusIcon />
      </button>
    </div>
  );
}

function MinusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 13H5v-2h14v2z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );
}
