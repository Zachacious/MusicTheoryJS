/**
 * @module dict/detect
 * Ranked chord and scale detection over the dictionaries, driven by the
 * chroma engine. Scores discriminate between different pitch-class content;
 * the handful of chord-type synonyms that share an identical chroma tie and
 * are ordered by alias count (a commonness proxy), then dictionary order.
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
import {
  chromaCardinality,
  chromaFromNotes,
  rotateChroma,
} from "../pcset";
import { CHORD_TYPES } from "./chord-types";
import { SCALE_TYPES } from "./scale-types";
import { chordDisplayAlias } from "./display";

/** Pitch-class name of a note, octave and cents stripped. */
function pcName(p: Pitch): string {
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

/**
 * Rank scale interpretations of a set of notes. Every input pitch class is
 * tried as a root; similarity is Jaccard over pitch-class sets, weighted
 * ×0.9 when the candidate root is not the preferred tonic.
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

  const matches: Array<ScaleDetection & { index: number }> = [];
  for (const { pc, name } of distinctPcs(parsed)) {
    const rooted = rotateChroma(inputChroma, -pc);
    SCALE_TYPES.forEach((type, index) => {
      // Both sets always contain the root (bit 0), so shared >= 1.
      const shared = chromaCardinality(rooted & type.chroma);
      const union = chromaCardinality(rooted | type.chroma);
      const score = (shared / union) * (pc === tonicPc ? 1 : 0.9);
      if (score >= minScore) {
        matches.push({
          tonic: name,
          type: type.name,
          score,
          exact: rooted === type.chroma,
          index,
        });
      }
    });
  }
  matches.sort((a, b) => b.score - a.score || a.index - b.index);
  return matches
    .slice(0, maxResults)
    .map(({ tonic, type, score, exact }) => ({ tonic, type, score, exact }));
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

/** Chord types without a perfect fifth are less likely interpretations. */
function typeWeight(typeChroma: number): number {
  return (typeChroma & (1 << 7)) !== 0 ? 1 : 0.93;
}

/**
 * Rank chord interpretations of a set of notes. Every input pitch class is
 * tried as a root; exact chroma matches score highest (root position above
 * inversions), then missing-note partials (e.g. omitted fifths), then
 * extra-note partials. When octaves are given, the lowest note is the bass.
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
  const inputCardinality = chromaCardinality(inputChroma);

  const allHaveOctaves = parsed.every((p) => p.oct !== undefined);
  const bass = allHaveOctaves
    ? parsed.reduce((lowest, p) =>
        (semitoneHeight(p) as number) < (semitoneHeight(lowest) as number) ? p : lowest
      )
    : parsed[0];
  const bassPc = pcOf(bass);
  const bassName = pcName(bass);

  const matches: Array<ChordDetection & { index: number; aliasCount: number }> = [];
  for (const { pc, name } of candidates) {
    const rooted = rotateChroma(inputChroma, -pc);
    CHORD_TYPES.forEach((type, index) => {
      const typeCardinality = chromaCardinality(type.chroma);
      const shared = chromaCardinality(rooted & type.chroma);
      const exact = rooted === type.chroma;
      let score: number;
      if (exact) {
        score = (pc === bassPc ? 1 : 0.95) * typeWeight(type.chroma);
      } else if (shared === inputCardinality) {
        // Input is missing some chord tones (e.g. an omitted fifth).
        score = 0.9 * (inputCardinality / typeCardinality) * typeWeight(type.chroma);
      } else if (shared === typeCardinality) {
        // Input has extra tones beyond this chord type.
        score = 0.8 * (typeCardinality / inputCardinality) * typeWeight(type.chroma);
      } else {
        return;
      }
      const inverted = exact && pc !== bassPc;
      matches.push({
        symbol: `${name}${chordDisplayAlias(type)}${inverted ? `/${bassName}` : ""}`,
        tonic: name,
        type: type.name,
        score,
        exact,
        ...(inverted && { bass: bassName }),
        index,
        aliasCount: type.aliases.length,
      });
    });
  }
  matches.sort(
    (a, b) => b.score - a.score || b.aliasCount - a.aliasCount || a.index - b.index
  );
  return matches
    .slice(0, maxResults)
    .map(({ symbol, tonic, type, score, exact, bass: b }) => ({
      symbol,
      tonic,
      type,
      score,
      exact,
      ...(b !== undefined && { bass: b }),
    }));
}
