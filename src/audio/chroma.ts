/**
 * Chroma (pitch-class profile) extraction from a sample frame.
 *
 * A chromagram folds the magnitude spectrum onto the 12 pitch classes, giving a
 * tuning-robust summary of "how much of each pitch class" is present. It feeds
 * naturally into the symbolic analysis layer — e.g. as weights for
 * `detectKey`. Pure DSP over caller-provided samples.
 */

import { hann, magnitudeSpectrum, nextPow2 } from "./fft";

export interface ChromaOptions {
  /** Ignore spectral content below this frequency (Hz). Default 55 (A1). */
  minFrequency?: number;
  /** Ignore spectral content above this frequency (Hz). Default 5000. */
  maxFrequency?: number;
  /** Reference frequency for A4 in Hz. Default 440. */
  referenceA4?: number;
  /** Apply a Hann window before the transform. Default true. */
  window?: boolean;
}

/**
 * A 12-bin chroma vector (index 0 = C … 11 = B) for `samples`, normalised so
 * the largest bin is 1 (all-zero input yields all zeros).
 */
export function chromagram(
  samples: Float32Array | Float64Array,
  sampleRate: number,
  options: ChromaOptions = {}
): Float64Array {
  const minFreq = options.minFrequency ?? 55;
  const maxFreq = options.maxFrequency ?? 5000;
  const a4 = options.referenceA4 ?? 440;
  const windowed = options.window === false ? samples : hann(samples);

  const mag = magnitudeSpectrum(windowed);
  const fftSize = nextPow2(windowed.length);
  const chroma = new Float64Array(12);

  for (let i = 1; i < mag.length; i++) {
    const freq = (i * sampleRate) / fftSize;
    if (freq < minFreq || freq > maxFreq) continue;
    // MIDI-style pitch, then fold to a pitch class (C = 0).
    const midi = 69 + 12 * Math.log2(freq / a4);
    const pc = ((Math.round(midi) % 12) + 12) % 12;
    chroma[pc] = (chroma[pc] as number) + (mag[i] as number);
  }

  let max = 0;
  for (let i = 0; i < 12; i++) max = Math.max(max, chroma[i] as number);
  if (max > 0) {
    for (let i = 0; i < 12; i++) chroma[i] = (chroma[i] as number) / max;
  }
  return chroma;
}
