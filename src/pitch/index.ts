/**
 * The pitch layer: the pure, tuning-agnostic computational core.
 *
 * - {@link SpelledPitch} — Western diatonic identity (letter, alteration, octave).
 * - {@link PitchPoint} — exact pitch as cents above C0, plus frequency math.
 * - parsing/formatting of scientific pitch notation.
 */

export * from "./spelled";
export * from "./point";
export * from "./parse";
export * from "./format";
