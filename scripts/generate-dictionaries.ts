/**
 * Regenerates src/dict/chord-types.ts and src/dict/scale-types.ts.
 *
 * The entries are seeded from an established open-source dictionary (a
 * dev-dependency, never shipped) with intervals normalized to our canonical
 * names and chromas recomputed by our own core — the test suite then verifies
 * both integrity and coverage. Run with:  bun scripts/generate-dictionaries.ts
 */
import { writeFileSync } from "node:fs";
import { ChordType, ScaleType } from "tonal";

import { interval, intervalName } from "../src/core";
import { mod } from "../src/core/util";

interface SourceEntry {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly intervals: readonly string[];
}

function canonicalIntervals(source: readonly string[]): string[] {
  return source.map((token) => intervalName(interval(token)));
}

function chromaOf(intervals: readonly string[]): number {
  let c = 0;
  for (const i of intervals) c |= 1 << mod(interval(i).semitones, 12);
  return c;
}

function emitEntries(entries: SourceEntry[]): string {
  return entries
    .map((e) => {
      const intervals = canonicalIntervals(e.intervals);
      return `  { name: ${JSON.stringify(e.name)}, aliases: ${JSON.stringify(
        e.aliases
      )}, intervals: ${JSON.stringify(intervals)}, chroma: ${chromaOf(intervals)} },`;
    })
    .join("\n");
}

function emitFile(
  kind: "Chord" | "Scale",
  constName: string,
  entries: SourceEntry[]
): string {
  return `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: bun scripts/generate-dictionaries.ts
 * (${entries.length} ${kind.toLowerCase()} types; verified by the test suite.)
 */

import { ${kind}TypeData } from "./types";

const entries: ${kind}TypeData[] = [
${emitEntries(entries)}
];

// Deep-freeze: the dictionary is shared module state and must be immutable.
for (const entry of entries) {
  Object.freeze(entry.aliases);
  Object.freeze(entry.intervals);
  Object.freeze(entry);
}

export const ${constName}: readonly ${kind}TypeData[] = Object.freeze(entries);
`;
}

const chordTypes: SourceEntry[] = ChordType.all().map((t) => ({
  name: t.name,
  aliases: t.aliases,
  intervals: t.intervals,
}));

const scaleTypes: SourceEntry[] = ScaleType.all().map((t) => ({
  name: t.name,
  aliases: t.aliases,
  intervals: t.intervals,
}));

writeFileSync("src/dict/chord-types.ts", emitFile("Chord", "CHORD_TYPES", chordTypes));
writeFileSync("src/dict/scale-types.ts", emitFile("Scale", "SCALE_TYPES", scaleTypes));

console.log(`Wrote ${chordTypes.length} chord types and ${scaleTypes.length} scale types.`);
