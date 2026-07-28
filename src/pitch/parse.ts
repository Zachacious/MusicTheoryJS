/**
 * Parsing spelled pitches from scientific pitch notation.
 *
 * The grammar is: a letter (A–G, case-insensitive), an optional run of
 * accidentals, and an optional octave. Accidentals stack, so multiple sharps or
 * flats are allowed:
 *
 *   `C`, `C4`, `C#4`, `Db3`, `F##5` / `Fx5`, `Bbb2`, `E#4`
 *
 * Unicode accidentals `♯ ♭ 𝄪 𝄫` are accepted alongside their ASCII forms. When
 * the octave is omitted it defaults to 4. Parsing is a pure regex + fold — there
 * are no lookup tables and no import-time side effects.
 */

import {
  LETTER_STEPS,
  type Letter,
  type SpelledPitch,
  type Step,
} from "./spelled";

/** Default octave used when a note string omits its octave. */
export const DEFAULT_OCTAVE = 4;

const NOTE_RE = /^\s*([A-Ga-g])([#♯bx♭𝄪𝄫]*)(-?\d+)?\s*$/u;

/** Sum the semitone alteration contributed by a run of accidental characters. */
function foldAccidentals(token: string): number {
  let alteration = 0;
  for (const ch of token) {
    switch (ch) {
      case "#":
      case "♯":
        alteration += 1;
        break;
      case "b":
      case "♭":
        alteration -= 1;
        break;
      case "x":
      case "𝄪":
        alteration += 2;
        break;
      case "𝄫":
        alteration -= 2;
        break;
    }
  }
  return alteration;
}

/**
 * Parse a note string into a {@link SpelledPitch}, or return `null` if it does
 * not match the grammar. Prefer this when invalid input should be handled
 * without exceptions.
 */
export function tryParseNote(input: string): SpelledPitch | null {
  const match = NOTE_RE.exec(input);
  if (!match) return null;

  const [, letterRaw, accidentals = "", octaveRaw] = match;
  const letter = (letterRaw as string).toUpperCase() as Letter;
  const step: Step = LETTER_STEPS[letter];
  const alteration = foldAccidentals(accidentals);
  const octave = octaveRaw !== undefined ? Number(octaveRaw) : DEFAULT_OCTAVE;

  return { step, alteration, octave };
}

/**
 * Parse a note string into a {@link SpelledPitch}.
 * @throws {SyntaxError} when the string is not valid scientific pitch notation.
 */
export function parseNote(input: string): SpelledPitch {
  const parsed = tryParseNote(input);
  if (!parsed) {
    throw new SyntaxError(`invalid note notation: "${input}"`);
  }
  return parsed;
}
