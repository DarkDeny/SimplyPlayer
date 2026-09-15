import { useEffect } from 'react';
import { useEqStore } from '../../store/eqStore';
import { CollapsiblePanel } from '../Layout/CollapsiblePanel';
import { getEqFrequencies, EQ_PRESETS } from '../../audio/audioEngine';
import './Equalizer.css';

const FREQUENCIES = getEqFrequencies();

function formatFreq(freq: number): string {
  return freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
}

function formatGain(gain: number): string {
  const rounded = Math.round(gain);
  if (rounded > 0) return `+${rounded}`;
  return `${rounded}`;
}

export function Equalizer() {
  const enabled = useEqStore((s) => s.enabled);
  const gains = useEqStore((s) => s.gains);
  const presetName = useEqStore((s) => s.presetName);
  const setEnabled = useEqStore((s) => s.setEnabled);
  const setBandGain = useEqStore((s) => s.setBandGain);
  const applyPreset = useEqStore((s) => s.applyPreset);
  const resetToFlat = useEqStore((s) => s.resetToFlat);
  const loadFromSaved = useEqStore((s) => s.loadFromSaved);

  useEffect(() => {
    window.electronAPI.getEqSettings().then((saved) => {
      if (saved) {
        loadFromSaved(saved.enabled, saved.gains, saved.presetName);
      }
    });
  }, [loadFromSaved]);

  const toggle = (
    <button
      className={`equalizer__toggle${enabled ? ' equalizer__toggle--on' : ''}`}
      onClick={() => setEnabled(!enabled)}
      title={enabled ? 'Disable EQ' : 'Enable EQ'}
      aria-label={enabled ? 'Disable equalizer' : 'Enable equalizer'}
    />
  );

  return (
    <CollapsiblePanel title="Equalizer" storageKey="equalizer" defaultCollapsed headerActions={toggle}>
      <div className={enabled ? '' : 'equalizer--disabled'}>
        <div className="equalizer__preset-row">
          <select
            className="equalizer__preset-select"
            value={presetName ?? ''}
            onChange={(e) => applyPreset(e.target.value)}
          >
            {!presetName && <option value="">Custom</option>}
            {EQ_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="equalizer__reset-btn" onClick={resetToFlat} title="Reset to flat">
            Reset
          </button>
        </div>

        <div className="equalizer__bands skeuo-inset">
          {FREQUENCIES.map((freq, i) => (
            <div className="equalizer__band" key={freq}>
              <span className="equalizer__band-value">{formatGain(gains[i])}</span>
              <div className="equalizer__slider-wrap">
                <div className="equalizer__slider-track" />
                <div className="equalizer__slider-zero" />
                <input
                  className="equalizer__slider-input"
                  type="range"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={gains[i]}
                  onChange={(e) => setBandGain(i, parseFloat(e.target.value))}
                  title={`${formatFreq(freq)} Hz: ${formatGain(gains[i])} dB`}
                  aria-label={`${formatFreq(freq)} Hz`}
                />
              </div>
              <span className="equalizer__band-label">{formatFreq(freq)}</span>
            </div>
          ))}
        </div>
      </div>
    </CollapsiblePanel>
  );
}
