/**
 * `SpelledPitch` — the Western diatonic identity of a pitch.
 *
 * A spelled pitch is a *letter* (its diatonic step), an *alteration* (how many
 * semitones sharp/flat), and an *octave*. This is what distinguishes E# from F
 * or Cb from B: they share a pitch class but are spelled differently. Correct
 * enharmonic spelling, interval spelling, and key signatures all depend on
 * keeping the letter and the alteration separate rather than collapsing to a
 * single semitone number.
 *
 * The mapping from a spelled pitch to an *exact* pitch (frequency) depends on a
 * tuning and lives in the `tuning` module; this file only concerns the
 * 12-tone-per-octave diatonic grid.
 */

import { mod } from "../math/index";

/** Diatonic step: 0 = C, 1 = D, 2 = E, 3 = F, 4 = G, 5 = A, 6 = B. */
export type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** The seven diatonic letter names, indexed by {@link Step}. */
export type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";

/**
 * A pitch spelled on the diatonic staff.
 * @property step - Diatonic letter (0–6, C–B).
 * @property alteration - Semitone offset from the natural note. `0` natural,
 *   `1` sharp, `-1` flat, `2` double-sharp, and so on. Unbounded, so triple
 *   accidentals are representable.
 * @property octave - Scientific octave number (middle C = C4).
 */
export interface SpelledPitch {
  readonly step: Step;
  readonly alteration: number;
  readonly octave: number;
}

/** Semitone offset from C for each natural diatonic step. */
export const STEP_SEMITONES: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

/** Letter name for each diatonic step. */
export const STEP_LETTERS: readonly Letter[] = [
  "C",
  "D",
  "E",
  "F",
  "G",
  "A",
  "B",
];

/** Reverse lookup: letter name → diatonic step. */
export const LETTER_STEPS: Readonly<Record<Letter, Step>> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

/** Create a spelled pitch. Defaults to a natural note in octave 4. */
export function spelled(step: Step, alteration = 0, octave = 4): SpelledPitch {
  return { step, alteration, octave };
}

/** The letter name (A–G) of a spelled pitch. */
export function letterOf(pitch: SpelledPitch): Letter {
  return STEP_LETTERS[pitch.step] as Letter;
}

/**
 * Absolute chromatic position in semitones above C0, keeping the spelling's
 * alteration. C0 = 0, C4 = 48, A4 = 57. This is tuning-independent index math
 * on the 12-per-octave grid, not a frequency.
 */
export function chroma(pitch: SpelledPitch): number {
  return (
    (STEP_SEMITONES[pitch.step] as number) +
    pitch.alteration +
    12 * pitch.octave
  );
}

/** Pitch class (0–11, C = 0) of a spelled pitch, wrapping enharmonically. */
export function pitchClass(pitch: SpelledPitch): number {
  return mod(chroma(pitch), 12);
}

/**
 * MIDI note number (middle C = 60). Non-integer alterations are not expected
 * here; microtonal offsets are handled at the tuning/`PitchPoint` layer.
 */
export function midi(pitch: SpelledPitch): number {
  return chroma(pitch) + 12;
}

/** True when two spelled pitches have identical spelling (step, alteration, octave). */
export function spelledEquals(a: SpelledPitch, b: SpelledPitch): boolean {
  return (
    a.step === b.step && a.alteration === b.alteration && a.octave === b.octave
  );
}

/**
 * True when two spelled pitches sound the same in 12-TET (same chromatic
 * position) regardless of how they are spelled — e.g. E#4 and F4.
 */
export function isEnharmonic(a: SpelledPitch, b: SpelledPitch): boolean {
  return chroma(a) === chroma(b);
}
