const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export type EqBandFrequency = (typeof EQ_BANDS)[number];

export interface EqPreset {
  name: string;
  gains: number[];
}

export const EQ_PRESETS: EqPreset[] = [
  { name: 'Flat',       gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Bass Boost', gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
  { name: 'Treble Boost', gains: [0, 0, 0, 0, 0, 0, 2, 4, 5, 6] },
  { name: 'Rock',       gains: [5, 4, 2, 0, -1, -1, 2, 3, 4, 5] },
  { name: 'Pop',        gains: [-1, 1, 3, 4, 3, 0, -1, -1, 1, 2] },
  { name: 'Jazz',       gains: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3] },
  { name: 'Classical',  gains: [4, 3, 2, 1, 0, 0, 0, 1, 2, 4] },
  { name: 'Vocal',      gains: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1] },
];

export const EQ_BAND_COUNT = EQ_BANDS.length;

export function getEqFrequencies(): readonly number[] {
  return EQ_BANDS;
}

let audioContext: AudioContext | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let filters: BiquadFilterNode[] = [];
let eqEnabled = true;

export function initAudioEngine(audioElement: HTMLAudioElement): void {
  if (audioContext) return;

  audioContext = new AudioContext();
  sourceNode = audioContext.createMediaElementSource(audioElement);

  filters = EQ_BANDS.map((freq, i) => {
    const filter = audioContext!.createBiquadFilter();
    if (i === 0) {
      filter.type = 'lowshelf';
    } else if (i === EQ_BANDS.length - 1) {
      filter.type = 'highshelf';
    } else {
      filter.type = 'peaking';
    }
    filter.frequency.value = freq;
    filter.Q.value = 1.4;
    filter.gain.value = 0;
    return filter;
  });

  connectChain();
}

function connectChain(): void {
  if (!sourceNode || !audioContext) return;

  sourceNode.disconnect();
  filters.forEach((f) => f.disconnect());

  if (eqEnabled && filters.length > 0) {
    sourceNode.connect(filters[0]);
    for (let i = 0; i < filters.length - 1; i++) {
      filters[i].connect(filters[i + 1]);
    }
    filters[filters.length - 1].connect(audioContext.destination);
  } else {
    sourceNode.connect(audioContext.destination);
  }
}

export function setEqBandGain(bandIndex: number, gain: number): void {
  if (bandIndex >= 0 && bandIndex < filters.length) {
    filters[bandIndex].gain.value = Math.max(-12, Math.min(12, gain));
  }
}

export function setAllBandGains(gains: number[]): void {
  for (let i = 0; i < filters.length && i < gains.length; i++) {
    filters[i].gain.value = Math.max(-12, Math.min(12, gains[i]));
  }
}

export function getAllBandGains(): number[] {
  return filters.map((f) => f.gain.value);
}

export function setEqEnabled(enabled: boolean): void {
  eqEnabled = enabled;
  connectChain();
}

export function isEqEnabled(): boolean {
  return eqEnabled;
}

export function ensureAudioContextResumed(): void {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
}
