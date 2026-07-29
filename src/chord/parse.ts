/**
 * Parsing chord symbols like `Cmaj7`, `F#m`, `Bb7`, `Gdim`, `Am7b5`.
 *
 * A symbol is a root note (letter + accidentals, no octave) followed by a
 * quality suffix. The accepted suffixes come straight from the chord
 * dictionary: every canonical {@link ChordQuality} name, every display
 * suffix, and every alias in {@link CHORD_DEFINITIONS} parses. Unicode
 * accidentals in the suffix (`♭9`, `♯11`) are read as `b9`, `#11`.
 */

import { parseNote, tryParseNote } from "../pitch/parse";
import type { SpelledPitch } from "../pitch/spelled";
import {
  CHORD_DEFINITIONS,
  type ChordQuality,
  chordDictionaryVersion,
  isChordQuality,
} from "./templates";

/**
 * Suffix → canonical quality, generated from the chord dictionary. Rebuilt
 * whenever the dictionary changes, so a quality registered at runtime is
 * parseable from its symbol immediately.
 */
let suffixCache: ReadonlyMap<string, ChordQuality> = new Map();
let suffixCacheVersion = -1;

function suffixToQuality(): ReadonlyMap<string, ChordQuality> {
  const version = chordDictionaryVersion();
  if (version === suffixCacheVersion) return suffixCache;
  const map = new Map<string, ChordQuality>();
  for (const def of CHORD_DEFINITIONS) {
    for (const suffix of [def.name, def.suffix, ...def.aliases]) {
      const existing = map.get(suffix);
      if (existing !== undefined && existing !== def.name) {
        throw new Error(
          `chord dictionary conflict: suffix "${suffix}" maps to both "${existing}" and "${def.name}"`
        );
      }
      map.set(suffix, def.name);
    }
  }
  suffixCache = map;
  suffixCacheVersion = version;
  return map;
}

/** Fold unicode accidentals/symbols in a quality suffix to their ASCII forms. */
function normalizeSuffix(suffix: string): string {
  return suffix.replace(/♯/gu, "#").replace(/♭/gu, "b").replace(/˚/gu, "°");
}

/**
 * The canonical quality for a name that may already be canonical (`"min7"`)
 * or a symbol-suffix alias (`"m7"`, `"Δ"`, `"-7"`), or `null` when unknown.
 *
 * @example
 * ```ts
 * import { normalizeChordQuality } from "musictheoryjs";
 * normalizeChordQuality("m7"); // => "min7"
 * normalizeChordQuality("min7"); // => "min7"
 * normalizeChordQuality("ø"); // => "min7b5"
 * normalizeChordQuality("what"); // => null
 * ```
 */
export function normalizeChordQuality(name: string): ChordQuality | null {
  if (isChordQuality(name)) return name;
  return suffixToQuality().get(normalizeSuffix(name)) ?? null;
}

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

  const quality = suffixToQuality().get(normalizeSuffix(suffixRaw));
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
