/**
 * Onset detection via spectral flux.
 *
 * Spectral flux measures how much the magnitude spectrum *increases* frame to
 * frame; peaks in it mark note/percussive onsets. This is a lightweight,
 * dependency-free way to segment audio into events a client can then pitch-track
 * or feed to the symbolic layer. Operates on caller-provided samples.
 */

import { hann, magnitudeSpectrum } from "./fft";

export interface OnsetOptions {
  /** Analysis frame size in samples (power of two recommended). Default 1024. */
  frameSize?: number;
  /** Hop between frames in samples. Default 512. */
  hop?: number;
  /**
   * Peak threshold as a multiple of the mean flux. Higher = fewer onsets.
   * Default 1.5.
   */
  sensitivity?: number;
}

/**
 * The spectral-flux novelty curve, one value per frame (the summed positive
 * spectral change from the previous frame).
 */
export function spectralFlux(
  samples: Float32Array | Float64Array,
  options: OnsetOptions = {}
): number[] {
  const frameSize = options.frameSize ?? 1024;
  const hop = options.hop ?? 512;
  const flux: number[] = [];
  let prev: Float64Array | null = null;

  for (let start = 0; start + frameSize <= samples.length; start += hop) {
    const frame = hann(samples.subarray(start, start + frameSize));
    const mag = magnitudeSpectrum(frame);
    if (prev) {
      let sum = 0;
      for (let i = 0; i < mag.length; i++) {
        const diff = (mag[i] as number) - (prev[i] as number);
        if (diff > 0) sum += diff;
      }
      flux.push(sum);
    } else {
      flux.push(0);
    }
    prev = mag;
  }
  return flux;
}

/**
 * Detect onset times in seconds by peak-picking the spectral flux. A frame is
 * an onset if its flux exceeds `sensitivity × mean` and is a local maximum.
 */
export function detectOnsets(
  samples: Float32Array | Float64Array,
  sampleRate: number,
  options: OnsetOptions = {}
): number[] {
  const hop = options.hop ?? 512;
  const sensitivity = options.sensitivity ?? 1.5;
  const flux = spectralFlux(samples, options);
  if (flux.length === 0) return [];

  const mean = flux.reduce((a, b) => a + b, 0) / flux.length;
  const threshold = mean * sensitivity;

  const onsets: number[] = [];
  for (let i = 1; i < flux.length - 1; i++) {
    const f = flux[i] as number;
    if (
      f > threshold &&
      f >= (flux[i - 1] as number) &&
      f > (flux[i + 1] as number)
    ) {
      onsets.push((i * hop) / sampleRate);
    }
  }
  return onsets;
}
