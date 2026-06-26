import { create } from 'zustand';
import {
  setEqBandGain,
  setAllBandGains,
  setEqEnabled,
  EQ_BAND_COUNT,
  EQ_PRESETS,
} from '../audio/audioEngine';

interface EqState {
  enabled: boolean;
  gains: number[];
  presetName: string | null;

  setEnabled: (enabled: boolean) => void;
  setBandGain: (index: number, gain: number) => void;
  applyPreset: (presetName: string) => void;
  resetToFlat: () => void;
  loadFromSaved: (enabled: boolean, gains: number[], presetName: string | null) => void;
}

const flatGains = () => new Array(EQ_BAND_COUNT).fill(0) as number[];

export const useEqStore = create<EqState>((set) => ({
  enabled: true,
  gains: flatGains(),
  presetName: 'Flat',

  setEnabled: (enabled) => {
    setEqEnabled(enabled);
    set({ enabled });
    saveEqDebounced();
  },

  setBandGain: (index, gain) => {
    setEqBandGain(index, gain);
    set((state) => {
      const gains = [...state.gains];
      gains[index] = gain;
      return { gains, presetName: null };
    });
    saveEqDebounced();
  },

  applyPreset: (presetName) => {
    const preset = EQ_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    setAllBandGains(preset.gains);
    set({ gains: [...preset.gains], presetName });
    saveEqDebounced();
  },

  resetToFlat: () => {
    const gains = flatGains();
    setAllBandGains(gains);
    set({ gains, presetName: 'Flat' });
    saveEqDebounced();
  },

  loadFromSaved: (enabled, gains, presetName) => {
    setEqEnabled(enabled);
    setAllBandGains(gains);
    set({ enabled, gains: [...gains], presetName });
  },
}));

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveEqDebounced(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { enabled, gains, presetName } = useEqStore.getState();
    window.electronAPI.saveEqSettings({ enabled, gains, presetName }).catch((err: unknown) => {
      console.error('Failed to save EQ settings:', err);
    });
  }, 500);
}
