/**
 * Monophonic pitch detection via the YIN algorithm.
 *
 * YIN estimates the fundamental period of a (single-voice) signal from its
 * cumulative-mean-normalised difference function, then refines it with
 * parabolic interpolation. Pure math over a sample buffer — no audio I/O and no
 * dependencies. Polyphonic transcription is out of scope and belongs to a client
 * app with a suitable model.
 */

import { Note } from "../note/note";

export interface PitchOptions {
  /** YIN absolute threshold (lower = stricter). Default 0.15. */
  threshold?: number;
  /** Lowest detectable frequency in Hz. Default 50. */
  minFrequency?: number;
  /** Highest detectable frequency in Hz. Default 2000. */
  maxFrequency?: number;
}

/** Refine an integer minimum `tau` to sub-sample precision (parabolic). */
function parabolicTau(d: Float64Array, tau: number): number {
  const x0 = tau > 0 ? tau - 1 : tau;
  const x2 = tau + 1 < d.length ? tau + 1 : tau;
  if (x0 === tau) return (d[tau] as number) <= (d[x2] as number) ? tau : x2;
  if (x2 === tau) return (d[tau] as number) <= (d[x0] as number) ? tau : x0;
  const s0 = d[x0] as number;
  const s1 = d[tau] as number;
  const s2 = d[x2] as number;
  const denom = 2 * (2 * s1 - s2 - s0);
  return denom === 0 ? tau : tau + (s2 - s0) / denom;
}

/**
 * Estimate the fundamental frequency (Hz) of `samples`, or `null` if the frame
 * is unpitched/too noisy. `sampleRate` is the audio sample rate (e.g. 44100).
 */
export function detectPitch(
  samples: Float32Array | Float64Array,
  sampleRate: number,
  options: PitchOptions = {}
): number | null {
  const threshold = options.threshold ?? 0.15;
  const minFreq = options.minFrequency ?? 50;
  const maxFreq = options.maxFrequency ?? 2000;

  const n = samples.length;
  const w = n >> 1;
  if (w < 2) return null;

  // Difference function d(tau).
  const d = new Float64Array(w);
  for (let tau = 1; tau < w; tau++) {
    let sum = 0;
    for (let j = 0; j < w; j++) {
      const diff = (samples[j] as number) - (samples[j + tau] as number);
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  // Cumulative mean normalised difference d'(tau).
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau < w; tau++) {
    running += d[tau] as number;
    d[tau] = running === 0 ? 1 : ((d[tau] as number) * tau) / running;
  }

  const minTau = Math.max(1, Math.floor(sampleRate / maxFreq));
  const maxTau = Math.min(w - 1, Math.ceil(sampleRate / minFreq));

  // First dip below threshold that is a local minimum.
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if ((d[t] as number) < threshold) {
      let best = t;
      while (
        best + 1 <= maxTau &&
        (d[best + 1] as number) < (d[best] as number)
      )
        best++;
      tau = best;
      break;
    }
  }
  if (tau === -1) return null;

  const refined = parabolicTau(d, tau);
  if (refined <= 0) return null;
  return sampleRate / refined;
}

/**
 * The nearest spelled {@link Note} to the detected pitch of a frame, or `null`
 * if no pitch is found.
 */
export function detectNote(
  samples: Float32Array | Float64Array,
  sampleRate: number,
  options: PitchOptions = {}
): Note | null {
  const freq = detectPitch(samples, sampleRate, options);
  return freq === null ? null : Note.fromFrequency(freq);
}
