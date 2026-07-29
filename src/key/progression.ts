/**
 * Chord progressions in a key: parsing (Roman numerals, chord symbols, and
 * `N.C.` no-chord slots side by side), a library of named progressions,
 * per-step harmonic-function labels, and next-chord suggestion with
 * discriminating scores (root motion + functional movement + dominant
 * resolution — never a uniform tie).
 */

import { Chord } from "../chord/chord";
import { tryParseChordSymbol } from "../chord/parse";
import { Note } from "../note/note";
import { scaleChord } from "../scale/harmony";
import {
  type HarmonicFunction,
  Key,
  type KeyLike,
  type MinorVariant,
  diatonicChords,
  secondaryDominants,
} from "./key";
import {
  type RomanNumeral,
  chordToRoman,
  romanToChord,
  tryParseRomanNumeral,
} from "./roman";

/** One slot of a parsed progression. `chord`/`roman` are `null` for "N.C.". */
export interface ProgressionStep {
  /** The token as given, e.g. `"ii7"`, `"G7"`, `"N.C."`. */
  readonly input: string;
  readonly chord: Chord | null;
  readonly roman: RomanNumeral | null;
  /** `"T"`, `"SD"`, `"D"` (applied dominants count as `"D"`), or `""`. */
  readonly function: HarmonicFunction;
}

/**
 * Named progressions as Roman numerals. Numerals are scale-relative (the
 * library's convention), so minor-key entries write the subtonic as `VII`,
 * not `bVII`; resolve minor entries in a minor key.
 */
export const COMMON_PROGRESSIONS: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    "I-IV-V": Object.freeze(["I", "IV", "V"]),
    "50s": Object.freeze(["I", "vi", "IV", "V"]),
    pop: Object.freeze(["I", "V", "vi", "IV"]),
    pachelbel: Object.freeze(["I", "V", "vi", "iii", "IV", "I", "IV", "V"]),
    "ii-V-I": Object.freeze(["ii7", "V7", "Imaj7"]),
    "minor-ii-V-i": Object.freeze(["iiø7", "V7", "i"]),
    andalusian: Object.freeze(["i", "VII", "VI", "V"]),
    "12-bar-blues": Object.freeze([
      "I7",
      "IV7",
      "I7",
      "I7",
      "IV7",
      "IV7",
      "I7",
      "I7",
      "V7",
      "IV7",
      "I7",
      "V7",
    ]),
  });

const NO_CHORD = /^n\.?c\.?$/i;

/** Harmonic function of a numeral in a key ("" when it has none there). */
function functionOf(key: Key, r: RomanNumeral): HarmonicFunction {
  if (r.secondary !== null) return "D";
  if (r.alteration !== 0) return "";
  if (key.mode === "major") return key.harmonicFunction(r.degree);
  // Minor: read the function from the variant this quality is diatonic to,
  // so vii° (harmonic minor's leading tone) is "D" while VII stays "SD".
  for (const variant of ["natural", "harmonic", "melodic"] as const) {
    const scale = key.variantScale(variant as MinorVariant);
    if (
      scaleChord(scale, r.degree).quality === r.quality ||
      scaleChord(scale, r.degree, { seventh: true }).quality === r.quality
    ) {
      return key.harmonicFunction(r.degree, { variant });
    }
  }
  return key.harmonicFunction(r.degree);
}

function parseToken(key: Key, token: string): ProgressionStep {
  if (NO_CHORD.test(token)) {
    return Object.freeze({
      input: token,
      chord: null,
      roman: null,
      function: "" as const,
    });
  }
  const r = tryParseRomanNumeral(token);
  if (r !== null) {
    return Object.freeze({
      input: token,
      chord: romanToChord(r, key),
      roman: r,
      function: functionOf(key, r),
    });
  }
  if (tryParseChordSymbol(token) !== null) {
    const chord = Chord.from(token);
    const roman = chordToRoman(chord, key);
    return Object.freeze({
      input: token,
      chord,
      roman,
      function: functionOf(key, roman),
    });
  }
  throw new SyntaxError(
    `invalid progression token "${token}": expected a Roman numeral ("ii7", "V7/V"), a chord symbol ("Dm7"), or "N.C."`
  );
}

function tokenize(input: string | readonly string[]): string[] {
  const raw = Array.isArray(input)
    ? (input as readonly string[])
    : (input as string).split(/[\s|,]+/);
  return raw.filter((t) => t !== "");
}

/**
 * Parse a progression in a key. Accepts an array of tokens, a string
 * separated by spaces, bars, or commas, or the name of a
 * {@link COMMON_PROGRESSIONS} entry; each token is a Roman numeral
 * (`"ii7"`, `"V65"`, `"V7/V"`), a chord symbol (`"Dm7"`, `"F#m7b5"`), or
 * `"N.C."`. Every step carries both views (chord and numeral) plus its
 * T/SD/D function in the key.
 *
 * @example
 * ```ts
 * import { parseProgression } from "musictheoryjs";
 * const steps = parseProgression("C major", "Dm7 | G7 | Cmaj7");
 * steps.map((s) => s.roman?.symbol); // => ["ii7", "V7", "Imaj7"]
 * steps.map((s) => s.function); // => ["SD", "D", "T"]
 * parseProgression("C major", ["N.C.", "A7"])[1]?.roman?.symbol; // => "V7/ii"
 * parseProgression("G major", "pop").map((s) => s.chord?.toString()); // => ["G", "D", "Em", "C"]
 * ```
 */
export function parseProgression(
  k: KeyLike,
  input: string | readonly string[]
): ProgressionStep[] {
  const named =
    typeof input === "string" && Object.hasOwn(COMMON_PROGRESSIONS, input)
      ? COMMON_PROGRESSIONS[input]
      : undefined;
  const key = Key.from(k);
  return tokenize(named ?? input).map((t) => parseToken(key, t));
}

/**
 * Resolve Roman numerals (or a named entry of {@link COMMON_PROGRESSIONS})
 * to chord symbols in a key. `"N.C."` slots pass through unchanged.
 *
 * @example
 * ```ts
 * import { progressionChords } from "musictheoryjs";
 * progressionChords("Bb major", ["ii7", "V7", "Imaj7"]); // => ["Cm7", "F7", "Bbmaj7"]
 * progressionChords("F major", ["I", "V7/ii", "ii7", "V7"]); // => ["F", "D7", "Gm7", "C7"]
 * progressionChords("C major", "ii-V-I"); // => ["Dm7", "G7", "Cmaj7"]
 * ```
 */
export function progressionChords(
  k: KeyLike,
  romans: string | readonly string[]
): string[] {
  return parseProgression(k, romans).map((s) =>
    s.chord === null ? s.input : s.chord.toString()
  );
}

/**
 * Analyze chord symbols as Roman numerals in a key. Applied dominants are
 * detected (`"D7"` in C major → `"V7/V"`); `"N.C."` passes through.
 *
 * @example
 * ```ts
 * import { progressionRomans } from "musictheoryjs";
 * progressionRomans("C major", ["Dm7", "G7", "Cmaj7"]); // => ["ii7", "V7", "Imaj7"]
 * progressionRomans("C major", ["C", "A7", "Dm7", "G7"]); // => ["I", "V7/ii", "ii7", "V7"]
 * ```
 */
export function progressionRomans(
  k: KeyLike,
  chords: string | readonly string[]
): string[] {
  return parseProgression(k, chords).map((s) =>
    s.roman === null ? s.input : s.roman.symbol
  );
}

/** A scored next-chord candidate. */
export interface ChordSuggestion {
  readonly chord: Chord;
  readonly roman: string;
  /** In [0, 1]; strictly ordered — ties are broken alphabetically. */
  readonly score: number;
  readonly function: HarmonicFunction;
}

/** Options for {@link suggestNextChords}. */
export interface SuggestNextChordsOptions {
  /** Maximum suggestions returned (default 5). */
  readonly maxResults?: number;
}

/** Score for each ascending pitch-class root motion (index = semitones up). */
const ROOT_MOTION_SCORES: readonly number[] = [
  0, 0.2, 0.2, 0.08, 0.08, 0.35, 0.05, 0.1, 0.15, 0.15, 0.12, 0.12,
];

const FUNCTION_SCORES: Readonly<Record<string, number>> = {
  "D>T": 0.3,
  "SD>D": 0.25,
  "T>SD": 0.15,
  "T>D": 0.1,
  "SD>T": 0.08,
  "T>T": 0.05,
  "SD>SD": 0.05,
  "D>D": 0.05,
  "D>SD": 0,
};

/** Diatonic sevenths plus secondary dominants, deduplicated by symbol. */
function candidatePool(key: Key): Chord[] {
  const seen = new Set<string>();
  const pool: Chord[] = [];
  const add = (chord: Chord | null): void => {
    if (chord === null) return;
    const symbol = chord.toString();
    if (!seen.has(symbol)) {
      seen.add(symbol);
      pool.push(chord);
    }
  };
  for (const c of diatonicChords(key, { seventh: true })) add(c);
  if (key.mode === "minor") {
    for (const c of diatonicChords(key, { seventh: true, variant: "harmonic" }))
      add(c);
  }
  for (const c of secondaryDominants(key)) add(c);
  return pool;
}

/**
 * Rank likely next chords for a progression in a key. Scores combine root
 * motion (descending fifths strongest), functional movement (D→T, SD→D, …),
 * and resolution of a pending applied dominant, so results discriminate:
 * after `["Dm7"]` in C major, `G7` ranks strictly first. With an empty
 * progression, tonic-function chords lead.
 *
 * @example
 * ```ts
 * import { suggestNextChords } from "musictheoryjs";
 * const next = suggestNextChords("C major", ["Dm7"]);
 * next[0]?.chord.toString(); // => "G7"
 * next[0]?.function; // => "D"
 * suggestNextChords("C major", "ii7 V7", { maxResults: 3 }).map((s) => s.chord.toString()); // => ["Cmaj7", "Am7", "Em7"]
 * suggestNextChords("C major", [])[0]?.chord.toString(); // => "Cmaj7"
 * ```
 */
export function suggestNextChords(
  k: KeyLike,
  progression: string | readonly string[],
  options: SuggestNextChordsOptions = {}
): ChordSuggestion[] {
  const key = Key.from(k);
  const maxResults = options.maxResults ?? 5;
  if (!Number.isInteger(maxResults) || maxResults < 0) {
    throw new RangeError(
      `maxResults must be a non-negative integer, got ${maxResults}`
    );
  }
  const steps = parseProgression(key, progression);
  const last = [...steps].reverse().find((s) => s.chord !== null) ?? null;
  const pending = last?.roman?.secondary ?? null;
  const pendingTarget =
    pending === null ? null : romanToChord(pending, key).root;

  const suggestions = candidatePool(key).map((chord) => {
    const roman = chordToRoman(chord, key);
    const fn = functionOf(key, roman);
    let score: number;
    if (last === null || last.chord === null) {
      score =
        (fn === "T" ? 0.6 : fn === "SD" ? 0.5 : 0.4) +
        (roman.degree === 1 &&
        roman.alteration === 0 &&
        roman.secondary === null
          ? 0.4
          : 0);
    } else {
      const motion =
        (((chord.root.pitchClass - last.chord.root.pitchClass) % 12) + 12) % 12;
      score = 0.1 + (ROOT_MOTION_SCORES[motion] as number);
      if (last.function !== "" && fn !== "") {
        score += FUNCTION_SCORES[`${last.function}>${fn}`] ?? 0;
      }
      if (
        pending !== null &&
        pendingTarget !== null &&
        pendingTarget.step === chord.root.step &&
        pendingTarget.alteration === chord.root.alteration &&
        // The candidate must *be* the tonicized chord, not merely share its
        // root — after V7/ii, Dm7 resolves the tension; D7 restarts it.
        (pending.quality === "maj" ? chord.isMajor() : chord.isMinor())
      ) {
        // A pending applied dominant resolving to its target ranks highest.
        score += 0.3;
      }
    }
    return Object.freeze({
      chord,
      roman: roman.symbol,
      score: Math.min(1, Number(score.toFixed(4))),
      function: fn,
    });
  });

  suggestions.sort(
    (a, b) =>
      b.score - a.score || a.chord.toString().localeCompare(b.chord.toString())
  );
  return suggestions.slice(0, maxResults);
}
