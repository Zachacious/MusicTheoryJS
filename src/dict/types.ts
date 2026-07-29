/**
 * @module dict/types
 * Shapes of the chord-type and scale-type dictionary entries.
 */

import { Chroma } from "../pcset";

/** A chord type: intervals from the root, canonical name, symbol aliases. */
export interface ChordTypeData {
  /** Full name, e.g. "major seventh" (may be empty for exotic types). */
  readonly name: string;
  /** Symbol suffixes, most common first: ["maj7", "Δ", "ma7", …]. */
  readonly aliases: readonly string[];
  /** Canonical interval names from the root: ["P1", "M3", "P5", "M7"]. */
  readonly intervals: readonly string[];
  /** 12-bit pitch-class set with the root at bit 0. */
  readonly chroma: Chroma;
}

/** A scale type: intervals from the tonic, canonical name, aliases. */
export interface ScaleTypeData {
  /** Primary name, e.g. "major", "dorian", "harmonic minor". */
  readonly name: string;
  /** Alternative names: major → ["ionian"]. */
  readonly aliases: readonly string[];
  /** Canonical interval names from the tonic. */
  readonly intervals: readonly string[];
  /** 12-bit pitch-class set with the tonic at bit 0. */
  readonly chroma: Chroma;
}
