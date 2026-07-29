/**
 * @module dict/detect
 * Ranked chord and scale detection over the dictionaries, driven by the
 * chroma engine. Scores discriminate between different pitch-class content;
 * the handful of chord-type synonyms that share an identical chroma tie and
 * are ordered by alias count (a commonness proxy), then dictionary order.
 *
 * Performance shape: dictionary chromas and cardinalities are mirrored into
 * flat typed arrays (built once, lazily), candidates go through a bounded
 * top-K selection instead of a collect-everything sort, and results are
 * memoized per (pitch-class content, options) — repeated queries are cache
 * hits. Cached result objects are frozen; each call returns a fresh array.
 */

import {
  MusicTheoryError,
  Pitch,
  chroma as pcOf,
  note,
  noteName,
  pitch,
  semitoneHeight,
} from "../core";
import { chromaFromNotes } from "../pcset";
import { POPCOUNT12 } from "../pcset/popcount";
import { CHORD_TYPES } from "./chord-types";
import { SCALE_TYPES } from "./scale-types";
import { chordDisplayAlias } from "./display";

/** Pitch-class name of a note, octave and cents stripped. */
function pcName(p: Pitch): string {
  if (p.oct === undefined && p.cents === undefined) return noteName(p);
  return noteName(pitch(p.step, p.alt));
}

interface PcCandidate {
  readonly pc: number;
  readonly name: string;
}

/** Distinct pitch classes in input order, keeping the first spelling seen. */
function distinctPcs(notes: readonly Pitch[]): PcCandidate[] {
  const seen = new Set<number>();
  const result: PcCandidate[] = [];
  for (const n of notes) {
    const pc = pcOf(n);
    if (!seen.has(pc)) {
      seen.add(pc);
      result.push({ pc, name: pcName(n) });
    }
  }
  return result;
}

function parseAll(notes: ReadonlyArray<string | Pitch>, what: string): Pitch[] {
  if (notes.length === 0) {
    throw new MusicTheoryError(`Cannot detect ${what} from an empty note list.`);
  }
  return notes.map(note);
}

function resolveMaxResults(value: number | undefined, fallback: number): number {
  const max = value ?? fallback;
  if (!Number.isInteger(max) || max < 0) {
    throw new MusicTheoryError(
      `Invalid maxResults ${max}: must be a non-negative integer.`
    );
  }
  return max;
}

/** Rotate a chroma so pitch class `pc` sits at bit 0 (valid inputs only). */
function rootChroma(c: number, pc: number): number {
  const n = (12 - pc) % 12;
  return ((c << n) | (c >>> (12 - n))) & 0xfff;
}

/**
 * Bounded top-K accumulator. `better(a, b)` must be a strict total-order
 * test; ties keep the earlier insertion (matching a stable sort + slice).
 */
class TopK<T> {
  private readonly items: T[] = [];
  constructor(
    private readonly k: number,
    private readonly better: (a: T, b: T) => boolean
  ) {}
  /** The current cut line, or undefined while there is still room. */
  worst(): T | undefined {
    return this.items.length === this.k ? this.items[this.items.length - 1] : undefined;
  }
  offer(candidate: T): void {
    const items = this.items;
    if (items.length === this.k) {
      if (this.k === 0 || !this.better(candidate, items[items.length - 1])) return;
      items.pop();
    }
    let i = items.length;
    while (i > 0 && this.better(candidate, items[i - 1])) i--;
    items.splice(i, 0, candidate);
  }
  values(): T[] {
    return this.items;
  }
}

/** Struct-of-arrays mirror of a dictionary, for tight scoring loops. */
interface TypeIndex {
  readonly chromas: Int16Array;
  readonly cards: Uint8Array;
}

function buildIndex(types: ReadonlyArray<{ readonly chroma: number }>): TypeIndex {
  const chromas = new Int16Array(types.length);
  const cards = new Uint8Array(types.length);
  for (let i = 0; i < types.length; i++) {
    chromas[i] = types[i].chroma;
    cards[i] = POPCOUNT12[types[i].chroma];
  }
  return { chromas, cards };
}

let scaleIndex: TypeIndex | null = null;
let chordIndex: TypeIndex | null = null;
/** Score multiplier per chord type: no perfect fifth = less likely. */
let chordWeights: Float64Array | null = null;

const CACHE_LIMIT = 500;
const scaleCache = new Map<string, readonly ScaleDetection[]>();
const chordCache = new Map<string, readonly ChordDetection[]>();

export interface ScaleDetection {
  /** Tonic pitch-class name, spelled as given in the input. */
  readonly tonic: string;
  /** Scale type name from the dictionary (e.g. "major", "dorian"). */
  readonly type: string;
  /** 1.0 = exact pitch-class match on the preferred tonic; less otherwise. */
  readonly score: number;
  /** True when the input's pitch-class set equals the scale's exactly. */
  readonly exact: boolean;
}

export interface DetectScalesOptions {
  /**
   * Preferred tonic; defaults to the first input note. If its pitch class is
   * absent from the input it can never root a candidate, so matches are then
   * ranked without the tonic bonus (maximum score 0.9).
   */
  readonly tonic?: string | Pitch;
  /** Drop matches scoring below this (default 0.5). */
  readonly minScore?: number;
  /** Maximum matches returned (default 10). */
  readonly maxResults?: number;
}

interface ScaleMatch {
  tonic: string;
  typeIndex: number;
  score: number;
  exact: boolean;
}

function betterScale(a: ScaleMatch, b: ScaleMatch): boolean {
  return a.score > b.score || (a.score === b.score && a.typeIndex < b.typeIndex);
}

/**
 * Rank scale interpretations of a set of notes. Every input pitch class is
 * tried as a root; similarity is Jaccard over pitch-class sets, weighted
 * ×0.9 when the candidate root is not the preferred tonic.
 *
 * @example
 * ```ts
 * import { detectScales } from "musictheoryjs";
 *
 * const [best] = detectScales(["D", "E", "F", "G", "A", "B", "C"]);
 * best.type; // => "dorian"
 * best.exact; // => true
 * // Same white keys, but prefer A as the tonic:
 * detectScales(["C", "D", "E", "F", "G", "A", "B"], { tonic: "A" })[0].type; // => "minor"
 * ```
 */
export function detectScales(
  notes: ReadonlyArray<string | Pitch>,
  options?: DetectScalesOptions
): ScaleDetection[] {
  const parsed = parseAll(notes, "scales");
  const inputChroma = chromaFromNotes(parsed);
  const tonicPc = pcOf(options?.tonic ?? parsed[0]);
  const minScore = options?.minScore ?? 0.5;
  if (!Number.isFinite(minScore)) {
    throw new MusicTheoryError(`Invalid minScore ${minScore}: must be a finite number.`);
  }
  const maxResults = resolveMaxResults(options?.maxResults, 10);
  const candidates = distinctPcs(parsed);

  let cacheKey = `${inputChroma}|${tonicPc}|${minScore}|${maxResults}`;
  for (const c of candidates) cacheKey += `|${c.name}`;
  const cached = scaleCache.get(cacheKey);
  if (cached !== undefined) return [...cached];

  if (scaleIndex === null) scaleIndex = buildIndex(SCALE_TYPES);
  const { chromas, cards } = scaleIndex;
  const inputCardinality = POPCOUNT12[inputChroma];

  const top = new TopK<ScaleMatch>(maxResults, betterScale);
  for (const { pc, name } of candidates) {
    const rooted = rootChroma(inputChroma, pc);
    const weight = pc === tonicPc ? 1 : 0.9;
    for (let index = 0; index < chromas.length; index++) {
      const typeChroma = chromas[index];
      // Both sets always contain the root (bit 0), so shared >= 1; the union
      // size follows by inclusion-exclusion.
      const shared = POPCOUNT12[rooted & typeChroma];
      const score = (shared / (inputCardinality + cards[index] - shared)) * weight;
      if (score < minScore) continue;
      // Reject against the cut line before allocating a match object.
      const worst = top.worst();
      if (
        worst !== undefined &&
        (score < worst.score || (score === worst.score && index >= worst.typeIndex))
      ) {
        continue;
      }
      top.offer({ tonic: name, typeIndex: index, score, exact: rooted === typeChroma });
    }
  }

  const results = top.values().map((m) =>
    Object.freeze({
      tonic: m.tonic,
      type: SCALE_TYPES[m.typeIndex].name,
      score: m.score,
      exact: m.exact,
    })
  );
  if (scaleCache.size > CACHE_LIMIT) scaleCache.clear();
  scaleCache.set(cacheKey, results);
  return [...results];
}

export interface ChordDetection {
  /** Full symbol, e.g. "Cmaj7", "Am7/C". */
  readonly symbol: string;
  /** Root pitch-class name, spelled as given in the input. */
  readonly tonic: string;
  /** Chord type name from the dictionary (may be empty for exotic types). */
  readonly type: string;
  /**
   * Ranking weight in (0, 1]: root-position exact matches rank above
   * inversions, then partials; chord types lacking a perfect fifth are
   * down-weighted as less likely interpretations (so an exact Cdim7 scores
   * 0.93, not 1.0). Gate on `exact`, not on score, to test set identity.
   */
  readonly score: number;
  /** True when the input's pitch-class set equals the chord type's exactly. */
  readonly exact: boolean;
  /** Bass pitch-class name when it differs from the root. */
  readonly bass?: string;
}

export interface DetectChordsOptions {
  /** Maximum matches returned (default 5). */
  readonly maxResults?: number;
}

interface ChordMatch {
  name: string;
  typeIndex: number;
  score: number;
  exact: boolean;
  inverted: boolean;
}

let chordAliasCounts: Uint8Array | null = null;

function betterChord(a: ChordMatch, b: ChordMatch): boolean {
  if (a.score !== b.score) return a.score > b.score;
  const counts = chordAliasCounts as Uint8Array;
  const aAliases = counts[a.typeIndex];
  const bAliases = counts[b.typeIndex];
  if (aAliases !== bAliases) return aAliases > bAliases;
  return a.typeIndex < b.typeIndex;
}

/**
 * Rank chord interpretations of a set of notes. Every input pitch class is
 * tried as a root; exact chroma matches score highest (root position above
 * inversions), then missing-note partials (e.g. omitted fifths), then
 * extra-note partials. When octaves are given, the lowest note is the bass.
 *
 * @example
 * ```ts
 * import { detectChords } from "musictheoryjs";
 *
 * detectChords(["C", "Eb", "G", "Bb"])[0].symbol; // => "Cm7"
 * // With octaves, the lowest note becomes the slash bass:
 * detectChords(["E3", "C4", "G4"])[0].symbol; // => "C/E"
 * detectChords(["G", "B", "D", "F"], { maxResults: 1 })[0].type; // => "dominant seventh"
 * ```
 */
export function detectChords(
  notes: ReadonlyArray<string | Pitch>,
  options?: DetectChordsOptions
): ChordDetection[] {
  const parsed = parseAll(notes, "chords");
  const candidates = distinctPcs(parsed);
  const maxResults = resolveMaxResults(options?.maxResults, 5);
  if (candidates.length < 2) return [];
  const inputChroma = chromaFromNotes(parsed);

  const allHaveOctaves = parsed.every((p) => p.oct !== undefined);
  const bass = allHaveOctaves
    ? parsed.reduce((lowest, p) =>
        (semitoneHeight(p) as number) < (semitoneHeight(lowest) as number) ? p : lowest
      )
    : parsed[0];
  const bassPc = pcOf(bass);
  const bassName = pcName(bass);

  let cacheKey = `${inputChroma}|${bassPc}|${bassName}|${maxResults}`;
  for (const c of candidates) cacheKey += `|${c.name}`;
  const cached = chordCache.get(cacheKey);
  if (cached !== undefined) return [...cached];

  if (chordIndex === null) {
    chordIndex = buildIndex(CHORD_TYPES);
    chordWeights = new Float64Array(CHORD_TYPES.length);
    chordAliasCounts = new Uint8Array(CHORD_TYPES.length);
    for (let i = 0; i < CHORD_TYPES.length; i++) {
      chordWeights[i] = (CHORD_TYPES[i].chroma & (1 << 7)) !== 0 ? 1 : 0.93;
      chordAliasCounts[i] = CHORD_TYPES[i].aliases.length;
    }
  }
  const { chromas, cards } = chordIndex;
  const weights = chordWeights as Float64Array;
  const inputCardinality = POPCOUNT12[inputChroma];

  const top = new TopK<ChordMatch>(maxResults, betterChord);
  for (const { pc, name } of candidates) {
    const rooted = rootChroma(inputChroma, pc);
    for (let index = 0; index < chromas.length; index++) {
      const typeChroma = chromas[index];
      const typeCardinality = cards[index];
      const shared = POPCOUNT12[rooted & typeChroma];
      const exact = rooted === typeChroma;
      let score: number;
      if (exact) {
        score = (pc === bassPc ? 1 : 0.95) * weights[index];
      } else if (shared === inputCardinality) {
        // Input is missing some chord tones (e.g. an omitted fifth).
        score = 0.9 * (inputCardinality / typeCardinality) * weights[index];
      } else if (shared === typeCardinality) {
        // Input has extra tones beyond this chord type.
        score = 0.8 * (typeCardinality / inputCardinality) * weights[index];
      } else {
        continue;
      }
      // Reject against the cut line before allocating a match object.
      const worst = top.worst();
      if (worst !== undefined && score < worst.score) continue;
      top.offer({ name, typeIndex: index, score, exact, inverted: exact && pc !== bassPc });
    }
  }

  // Symbols are only materialized for the matches that survive ranking.
  const results = top.values().map((m) => {
    const type = CHORD_TYPES[m.typeIndex];
    return Object.freeze({
      symbol: `${m.name}${chordDisplayAlias(type)}${m.inverted ? `/${bassName}` : ""}`,
      tonic: m.name,
      type: type.name,
      score: m.score,
      exact: m.exact,
      ...(m.inverted && { bass: bassName }),
    });
  });
  if (chordCache.size > CACHE_LIMIT) chordCache.clear();
  chordCache.set(cacheKey, results);
  return [...results];
}
