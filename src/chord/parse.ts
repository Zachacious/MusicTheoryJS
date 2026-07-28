/**
 * Parsing chord symbols like `Cmaj7`, `F#m`, `Bb7`, `Gdim`, `Am7b5`.
 *
 * A symbol is a root note (letter + accidentals, no octave) followed by a
 * quality suffix. Suffix spellings are mapped to canonical
 * {@link ChordQuality} names; many common aliases are accepted.
 */

import { parseNote, tryParseNote } from "../pitch/parse";
import type { SpelledPitch } from "../pitch/spelled";
import type { ChordQuality } from "./templates";

/** Maps chord-symbol suffix aliases to canonical quality names. */
const SUFFIX_ALIASES: Readonly<Record<string, ChordQuality>> = {
  "": "maj",
  maj: "maj",
  major: "maj",
  M: "maj",
  m: "min",
  min: "min",
  minor: "min",
  "-": "min",
  dim: "dim",
  "°": "dim",
  o: "dim",
  aug: "aug",
  "+": "aug",
  sus2: "sus2",
  sus4: "sus4",
  sus: "sus4",
  "6": "maj6",
  m6: "min6",
  min6: "min6",
  "7": "dom7",
  dom7: "dom7",
  maj7: "maj7",
  M7: "maj7",
  Δ: "maj7",
  Δ7: "maj7",
  m7: "min7",
  min7: "min7",
  "-7": "min7",
  mMaj7: "minMaj7",
  mM7: "minMaj7",
  dim7: "dim7",
  "°7": "dim7",
  o7: "dim7",
  m7b5: "min7b5",
  min7b5: "min7b5",
  ø: "min7b5",
  ø7: "min7b5",
  aug7: "aug7",
  "7#5": "aug7",
  "9": "dom9",
  maj9: "maj9",
  M9: "maj9",
  m9: "min9",
  min9: "min9",
  add9: "add9",
};

/** A chord symbol split into its root pitch and canonical quality. */
export interface ParsedChordSymbol {
  readonly root: SpelledPitch;
  readonly quality: ChordQuality;
}

/**
 * Parse a chord symbol into a root and canonical quality, or return `null` if
 * it isn't recognised. The root defaults to octave 4.
 */
export function tryParseChordSymbol(symbol: string): ParsedChordSymbol | null {
  const match = /^\s*([A-Ga-g][#♯bx♭𝄪𝄫]*)(.*?)\s*$/u.exec(symbol);
  if (!match) return null;

  const [, rootRaw, suffixRaw = ""] = match;
  const root = tryParseNote(rootRaw as string);
  if (!root) return null;

  const quality = SUFFIX_ALIASES[suffixRaw];
  if (quality === undefined) return null;

  return { root, quality };
}

/**
 * Parse a chord symbol into a root and canonical quality.
 * @throws {SyntaxError} when the symbol is not recognised.
 */
export function parseChordSymbol(symbol: string): ParsedChordSymbol {
  const parsed = tryParseChordSymbol(symbol);
  if (!parsed) {
    // Re-parse the root to surface a precise error where possible.
    parseNote(symbol);
    throw new SyntaxError(`unrecognised chord symbol: "${symbol}"`);
  }
  return parsed;
}
