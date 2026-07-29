/**
 * Constant-Q analysis: log-spaced frequency bins, one (or more) per semitone.
 *
 * Where the FFT spaces bins linearly in Hz — coarse for low notes, wasteful
 * for high ones — the constant-Q transform keeps a fixed number of bins per
 * octave, so every semitone gets its own bin. Computed directly (windowed
 * correlation per bin, no FFT kernel), which is plenty for frame-sized input
 * and keeps the module dependency-free.
 */

export interface CqtOptions {
  /** Frequency bins per octave. Default 12 (one per semitone). */
  binsPerOctave?: number;
  /** Frequency of the first bin in Hz. Default C1 (~32.7 Hz). */
  minFrequency?: number;
  /** Number of octaves to cover. Default 7. */
  octaves?: number;
  /** Reference frequency for A4, used to label bins with pitch classes.
   * Default 440. */
  referenceA4?: number;
}

const C1 = 440 * 2 ** (-45 / 12); // 45 semitones below A4

/**
 * The constant-Q magnitude spectrum of a frame: `binsPerOctave × octaves`
 * bins, bin `k` centred on `minFrequency · 2^(k / binsPerOctave)`. Each bin
 * is a Hann-windowed correlation whose window shrinks with frequency (the
 * constant Q), normalised so a full-scale sine reads ~0.5 at its bin. Bins at
 * or above Nyquist are zero; bins whose ideal window is longer than the frame
 * use the whole frame and resolve more coarsely.
 *
 * @example
 * ```ts
 * import { cqt } from "musictheoryjs";
 * const sr = 44100;
 * const tone = Float64Array.from({ length: 8192 }, (_, i) =>
 *   Math.sin((2 * Math.PI * 440 * i) / sr)
 * );
 * const bins = cqt(tone, sr);
 * bins.length; // => 84
 * bins.indexOf(Math.max(...bins)); // => 45
 * ```
 */
export function cqt(
  samples: Float32Array | Float64Array,
  sampleRate: number,
  options: CqtOptions = {}
): Float64Array {
  const bpo = options.binsPerOctave ?? 12;
  const fmin = options.minFrequency ?? C1;
  const octaves = options.octaves ?? 7;
  const bins = bpo * octaves;
  // Q so that each window spans ~one bin width: f / (f·(2^(1/bpo) − 1)).
  const q = 1 / (2 ** (1 / bpo) - 1);

  const out = new Float64Array(bins);
  for (let k = 0; k < bins; k++) {
    const freq = fmin * 2 ** (k / bpo);
    if (freq >= sampleRate / 2) break;
    const length = Math.min(
      samples.length,
      Math.max(2, Math.round((q * sampleRate) / freq))
    );
    const omega = (2 * Math.PI * freq) / sampleRate;
    let re = 0;
    let im = 0;
    let windowSum = 0;
    for (let n = 0; n < length; n++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (length - 1)));
      const s = (samples[n] as number) * w;
      re += s * Math.cos(omega * n);
      im -= s * Math.sin(omega * n);
      windowSum += w;
    }
    out[k] = windowSum === 0 ? 0 : Math.hypot(re, im) / windowSum;
  }
  return out;
}

/**
 * A 12-bin chroma vector (index 0 = C … 11 = B) from the constant-Q
 * spectrum, normalised so the largest bin is 1. Sharper than the FFT-based
 * {@link chromagram} in the bass, where linear bins blur neighbouring
 * semitones together.
 *
 * @example
 * ```ts
 * import { cqtChroma } from "musictheoryjs";
 * const sr = 44100;
 * const tone = Float64Array.from({ length: 8192 }, (_, i) =>
 *   Math.sin((2 * Math.PI * 220 * i) / sr)
 * );
 * const chroma = cqtChroma(tone, sr);
 * chroma.length; // => 12
 * chroma.indexOf(Math.max(...chroma)); // => 9
 * ```
 */
export function cqtChroma(
  samples: Float32Array | Float64Array,
  sampleRate: number,
  options: CqtOptions = {}
): Float64Array {
  const bpo = options.binsPerOctave ?? 12;
  const fmin = options.minFrequency ?? C1;
  const a4 = options.referenceA4 ?? 440;
  const bins = cqt(samples, sampleRate, options);

  const chroma = new Float64Array(12);
  for (let k = 0; k < bins.length; k++) {
    const freq = fmin * 2 ** (k / bpo);
    const midi = 69 + 12 * Math.log2(freq / a4);
    const pc = ((Math.round(midi) % 12) + 12) % 12;
    chroma[pc] = (chroma[pc] as number) + (bins[k] as number);
  }
  let max = 0;
  for (let i = 0; i < 12; i++) max = Math.max(max, chroma[i] as number);
  if (max > 0) {
    for (let i = 0; i < 12; i++) chroma[i] = (chroma[i] as number) / max;
  }
  return chroma;
}
