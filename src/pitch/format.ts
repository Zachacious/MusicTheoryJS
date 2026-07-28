/**
 * Rendering spelled pitches back to strings.
 *
 * Formatting is a *presentation* concern kept separate from a note's identity,
 * so alternative notations (Unicode accidentals, `x` for double-sharp, and
 * later microtonal schemes) are opt-in via {@link FormatOptions} rather than
 * baked into the data.
 */

import { STEP_LETTERS, type SpelledPitch } from "./spelled";

export interface FormatOptions {
  /** Use Unicode `♯`/`♭` instead of ASCII `#`/`b`. Default `false`. */
  unicodeAccidentals?: boolean;
  /** Render a double-sharp as a single `x` (or `𝄪`) instead of two sharps. Default `false`. */
  doubleSharpX?: boolean;
  /** Include the octave number. Default `true`. */
  octave?: boolean;
}

/** Render just the accidental portion for a given alteration. */
export function formatAccidental(
  alteration: number,
  options: FormatOptions = {}
): string {
  const { unicodeAccidentals = false, doubleSharpX = false } = options;
  if (alteration === 0) return "";

  if (alteration > 0) {
    const sharp = unicodeAccidentals ? "♯" : "#";
    if (doubleSharpX) {
      const x = unicodeAccidentals ? "𝄪" : "x";
      return (
        x.repeat(Math.floor(alteration / 2)) + sharp.repeat(alteration % 2)
      );
    }
    return sharp.repeat(alteration);
  }

  const flat = unicodeAccidentals ? "♭" : "b";
  return flat.repeat(-alteration);
}

/** Render a {@link SpelledPitch} as a string, e.g. `"C#4"`, `"Eb3"`, `"Fx5"`. */
export function formatNote(
  pitch: SpelledPitch,
  options: FormatOptions = {}
): string {
  const { octave = true } = options;
  const letter = STEP_LETTERS[pitch.step];
  const accidental = formatAccidental(pitch.alteration, options);
  return octave
    ? `${letter}${accidental}${pitch.octave}`
    : `${letter}${accidental}`;
}
