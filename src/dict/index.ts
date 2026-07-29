/**
 * @module dict
 * Chord-type and scale-type dictionaries (generated, verified by tests),
 * lookup by name or alias, and ranked detection.
 */

import { CHORD_TYPES } from "./chord-types";
import { SCALE_TYPES } from "./scale-types";
import { ChordTypeData, ScaleTypeData } from "./types";

export { CHORD_TYPES } from "./chord-types";
export { SCALE_TYPES } from "./scale-types";
export type { ChordTypeData, ScaleTypeData } from "./types";
export {
  type ChordDetection,
  type DetectChordsOptions,
  type DetectScalesOptions,
  type ScaleDetection,
  detectChords,
  detectScales,
} from "./detect";

let chordIndex: Map<string, ChordTypeData> | null = null;
let scaleIndex: Map<string, ScaleTypeData> | null = null;

function buildIndex<T extends { name: string; aliases: readonly string[] }>(
  entries: readonly T[]
): Map<string, T> {
  const index = new Map<string, T>();
  for (const entry of entries) {
    if (entry.name !== "" && !index.has(entry.name)) index.set(entry.name, entry);
    for (const alias of entry.aliases) {
      if (alias !== "" && !index.has(alias)) index.set(alias, entry);
    }
  }
  return index;
}

/** Look up a chord type by name ("major seventh") or alias ("maj7", "Δ"). */
export function getChordType(nameOrAlias: string): ChordTypeData | null {
  if (chordIndex === null) chordIndex = buildIndex(CHORD_TYPES);
  return chordIndex.get(nameOrAlias) ?? null;
}

/** Look up a scale type by name ("major") or alias ("ionian"). */
export function getScaleType(nameOrAlias: string): ScaleTypeData | null {
  if (scaleIndex === null) scaleIndex = buildIndex(SCALE_TYPES);
  return scaleIndex.get(nameOrAlias) ?? null;
}
