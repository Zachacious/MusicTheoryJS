/**
 * @module progression/progression
 * Chord progressions in a key: parsing (roman numerals, chord symbols, and
 * `N.C.` no-chord slots), per-step harmonic analysis, and next-chord
 * suggestion with real, discriminating scores (root motion + functional
 * movement + dominant resolution — never a uniform tie).
 */

import { MusicTheoryError, distance, note } from "../core";
import { Chord, chord, tryChord } from "../chord";
import { Key, KeyHarmony, key } from "../key";
import {
  RomanNumeral,
  chordToRoman,
  romanToChord,
  tryRomanNumeral,
} from "../roman";

/** One slot of a parsed progression. `chord`/`roman` are `null` for "N.C.". */
export interface ProgressionStep {
  /** The token as given, e.g. "ii7", "G7", "N.C.". */
  readonly input: string;
  readonly chord: Chord | null;
  readonly roman: RomanNumeral | null;
  /** "T", "SD", "D" (applied dominants are "D"), or "" when unknown. */
  readonly function: string;
}

/**
 * Named progressions as roman numerals (major-scale degree frame; minor-key
 * progressions use lowercase/`b`-prefixed numerals).
 */
export const COMMON_PROGRESSIONS: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    "I-IV-V": Object.freeze(["I", "IV", "V"]),
    "50s": Object.freeze(["I", "vi", "IV", "V"]),
    pop: Object.freeze(["I", "V", "vi", "IV"]),
    pachelbel: Object.freeze(["I", "V", "vi", "iii", "IV", "I", "IV", "V"]),
    "ii-V-I": Object.freeze(["ii7", "V7", "Imaj7"]),
    "minor-ii-V-i": Object.freeze(["iiø7", "V7", "i"]),
    andalusian: Object.freeze(["i", "bVII", "bVI", "V"]),
    "12-bar-blues": Object.freeze([
      "I7", "IV7", "I7", "I7",
      "IV7", "IV7", "I7", "I7",
      "V7", "IV7", "I7", "V7",
    ]),
  });

const NO_CHORD_REGEX = /^n\.?c\.?$/i;

const harmoniesOf = (k: Key): readonly KeyHarmony[] =>
  k.type === "major" ? [k] : [k.natural, k.harmonic, k.melodic];

function gradeAccidental(grade: string): number {
  const m = /^(b+|#+)?/.exec(grade);
  const prefix = m?.[1] ?? "";
  return prefix.startsWith("#") ? prefix.length : -prefix.length;
}

/** Harmonic function of a numeral in a key ("" when it has none there). */
function functionOf(k: Key, r: RomanNumeral): string {
  if (r.secondary !== null) return "D";
  for (const harmony of harmoniesOf(k)) {
    const i = r.degree - 1;
    if (
      i >= 0 &&
      i < harmony.grades.length &&
      gradeAccidental(harmony.grades[i]) === r.accidental &&
      harmony.chordsHarmonicFunction[i] !== ""
    ) {
      return harmony.chordsHarmonicFunction[i];
    }
  }
  return "";
}

function freezeStep(
  input: string,
  c: Chord | null,
  r: RomanNumeral | null,
  fn: string
): ProgressionStep {
  return Object.freeze({ input, chord: c, roman: r, function: fn });
}

function parseToken(k: Key, token: string): ProgressionStep {
  if (NO_CHORD_REGEX.test(token)) return freezeStep(token, null, null, "");
  const r = tryRomanNumeral(token);
  if (r !== null) {
    return freezeStep(token, romanToChord(r, k), r, functionOf(k, r));
  }
  const c = tryChord(token);
  if (c !== null) {
    const analyzed = chordToRoman(c, k);
    return freezeStep(token, c, analyzed, functionOf(k, analyzed));
  }
  throw new MusicTheoryError(
    `Invalid progression token ${JSON.stringify(token)}: expected a roman numeral ("ii7", "V7/V"), a chord symbol ("Dm7"), or "N.C.".`
  );
}

function tokenize(input: string | readonly string[]): string[] {
  const raw = Array.isArray(input)
    ? (input as readonly string[])
    : (input as string).split(/[\s|,]+/);
  const tokens: string[] = [];
  for (const t of raw) {
    if (t === "" || t === "-") continue;
    tokens.push(t);
  }
  if (tokens.length === 0) {
    throw new MusicTheoryError("Cannot parse an empty progression.");
  }
  return tokens;
}

/**
 * Parse a progression in a key. Accepts an array of tokens or a string
 * separated by spaces, bars, or commas; each token is a roman numeral
 * ("ii7", "V65", "V7/V"), a chord symbol ("Dm7", "G7/B"), or "N.C.".
 * Every step carries both views (chord and numeral) plus a T/SD/D tag:
 * `parseProgression("C major", "ii7 V7 Imaj7")`.
 */
export function parseProgression(
  keyInput: string | Key,
  input: string | readonly string[]
): ProgressionStep[] {
  const k = key(keyInput);
  return tokenize(input).map((t) => parseToken(k, t));
}

/**
 * Resolve roman numerals to chord symbols in a key:
 * `progressionChords("C major", ["ii7", "V7", "Imaj7"])` →
 * `["Dm7", "G7", "Cmaj7"]`. "N.C." slots pass through unchanged.
 */
export function progressionChords(
  keyInput: string | Key,
  romans: readonly string[]
): string[] {
  return parseProgression(keyInput, romans).map((s) =>
    s.chord === null ? s.input : s.chord.symbol
  );
}

/**
 * Analyze chord symbols as roman numerals in a key:
 * `progressionRomans("C major", ["Dm7", "G7", "Cmaj7"])` →
 * `["ii7", "V7", "Imaj7"]`. Applied dominants are detected ("D7" → "V7/V").
 */
export function progressionRomans(
  keyInput: string | Key,
  chords: readonly string[]
): string[] {
  return parseProgression(keyInput, chords).map((s) =>
    s.roman === null ? s.input : s.roman.symbol
  );
}

/** A scored next-chord candidate. */
export interface ChordSuggestion {
  readonly symbol: string;
  readonly roman: string;
  readonly score: number;
  readonly function: string;
}

export interface SuggestNextChordsOptions {
  /** Maximum suggestions returned (default 5). */
  readonly maxResults?: number;
}

/** Ascending pitch-class semitones from one root to another. */
function rootMotion(from: string, to: string): number {
  return distance(note(from), note(to)).semitones;
}

const ROOT_MOTION_SCORES: readonly number[] = [
  //  0    1     2     3     4     5    6     7     8     9     10    11
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

function candidatePool(k: Key): string[] {
  const seen = new Set<string>();
  const pool: string[] = [];
  const add = (symbol: string): void => {
    if (symbol !== "" && !seen.has(symbol)) {
      seen.add(symbol);
      pool.push(symbol);
    }
  };
  if (k.type === "major") {
    for (const c of k.chords) add(c);
    for (const c of k.secondaryDominants) add(c);
  } else {
    for (const c of k.natural.chords) add(c);
    for (const c of k.harmonic.chords) add(c);
    for (const c of k.natural.secondaryDominants) add(c);
  }
  return pool;
}

/**
 * Rank likely next chords for a progression in a key. Scores combine root
 * motion (descending fifths strongest), functional movement (D→T, SD→D…),
 * and resolution of a pending applied dominant, so results discriminate:
 * after `["ii7"]` in C major, G7 ranks strictly first. With an empty
 * progression, tonic-function chords lead.
 */
export function suggestNextChords(
  keyInput: string | Key,
  progression: string | readonly string[],
  options?: SuggestNextChordsOptions
): ChordSuggestion[] {
  const k = key(keyInput);
  const maxResults = options?.maxResults ?? 5;
  if (!Number.isInteger(maxResults) || maxResults < 0) {
    throw new MusicTheoryError(
      `Invalid maxResults ${maxResults}: must be a non-negative integer.`
    );
  }
  const empty =
    (Array.isArray(progression) && progression.length === 0) ||
    (typeof progression === "string" && progression.trim() === "");
  const steps = empty ? [] : parseProgression(k, progression);
  const last = [...steps].reverse().find((s) => s.chord !== null) ?? null;

  const suggestions = candidatePool(k).map((symbol) => {
    const c = chord(symbol);
    const r = chordToRoman(c, k);
    const fn = functionOf(k, r);
    let score: number;
    if (last === null || last.chord === null) {
      score =
        (fn === "T" ? 0.6 : fn === "SD" ? 0.5 : 0.4) +
        (r.degree === 1 && r.accidental === 0 && r.secondary === null ? 0.4 : 0);
    } else {
      score = 0.1 + ROOT_MOTION_SCORES[rootMotion(last.chord.root, c.root)];
      const lastFn = last.function;
      if (lastFn !== "" && fn !== "") {
        score += FUNCTION_SCORES[`${lastFn}>${fn}`] ?? 0;
      }
      const lastRoman = last.roman;
      if (lastRoman !== null && lastRoman.secondary !== null) {
        // A pending applied dominant resolving to its target ranks highest.
        const target = romanToChord(lastRoman.secondary, k);
        if (note(target.root).step === note(c.root).step &&
            note(target.root).alt === note(c.root).alt) {
          score += 0.3;
        }
      }
    }
    return Object.freeze({
      symbol: c.symbol,
      roman: r.symbol,
      score: Math.min(1, Number(score.toFixed(4))),
      function: fn,
    });
  });

  suggestions.sort(
    (a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol)
  );
  return suggestions.slice(0, maxResults);
}
