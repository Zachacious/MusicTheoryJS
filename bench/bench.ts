/**
 * Benchmark suite (REDESIGN.md §6): head-to-head against the reference
 * music-theory library (a dev-dependency; deliberately unnamed in published
 * docs) on the operations that matter. Run with `bun run bench`.
 *
 * Prints a markdown table suitable for pasting into BENCHMARKS.md.
 * Numbers are machine-dependent; treat relative ratios as the signal.
 */

import { Bench } from "tinybench";
import { Chord as RefChord, Note as RefNote, Scale as RefScale } from "tonal";

import {
  chord,
  detectChords,
  detectKeys,
  detectScales,
  interval,
  note,
  noteName,
  transpose,
} from "../src";

// Rotating corpora so caches on either side see realistic (repeated) traffic
// rather than a single hot literal.
const NOTES = ["C4", "Eb4", "F#3", "Bb2", "G#5", "Db4", "A3", "E5", "Cb4", "B#3"];
const INTERVALS = ["m3", "P5", "M2", "A4", "m7", "M6", "d5", "P4"];
const SYMBOLS = [
  "C", "Cm", "Cmaj7", "Cm7", "C7", "Cm7b5", "Cdim7", "Caug", "C6", "Cm6",
  "C9", "C13", "Csus4", "C7sus4", "Cadd9", "Cm(maj7)", "C13#11", "C7b9",
  "C7alt", "C5", "F#m7", "Bbmaj7", "Ebm9", "G7b13", "Abmaj9", "Dm11",
  "E7#9", "Am7b5", "Bdim7", "Gbmaj7#11", "C#m7", "F13", "Bb7sus4", "D6/9",
  "Eaug7", "Fm(maj9)", "G#dim", "Ab7", "Db9#5", "Em(add9)",
];
const NOTE_OBJS = NOTES.map((n) => note(n));
const INTERVAL_OBJS = INTERVALS.map((i) => interval(i));
const CM7_NOTES = ["C", "Eb", "G", "Bb"];
const C_MAJOR_NOTES = ["C", "D", "E", "F", "G", "A", "B"];
const MELODY = ["C4", "E4", "G4", "B4", "D5", "C5", "A4", "F4", "G4", "E4", "C4", "G3"];

let i = 0;
const bench = new Bench({ time: 250, warmupTime: 100 });

bench
  .add("transpose, string → Pitch — ours", () => {
    i++;
    transpose(NOTES[i % NOTES.length], INTERVALS[i % INTERVALS.length]);
  })
  .add("transpose, string → name — ours", () => {
    i++;
    noteName(transpose(NOTES[i % NOTES.length], INTERVALS[i % INTERVALS.length]));
  })
  .add("transpose, object → Pitch — ours", () => {
    i++;
    transpose(NOTE_OBJS[i % NOTE_OBJS.length], INTERVAL_OBJS[i % INTERVAL_OBJS.length]);
  })
  .add("transpose, string → name — reference", () => {
    i++;
    RefNote.transpose(NOTES[i % NOTES.length], INTERVALS[i % INTERVALS.length]);
  })
  .add("chord symbol parse — ours", () => {
    i++;
    chord(SYMBOLS[i % SYMBOLS.length]);
  })
  .add("chord symbol parse — reference", () => {
    i++;
    RefChord.get(SYMBOLS[i % SYMBOLS.length]);
  })
  .add("chord detect — ours", () => {
    detectChords(CM7_NOTES);
  })
  .add("chord detect — reference", () => {
    RefChord.detect(CM7_NOTES);
  })
  .add("scale detect — ours", () => {
    detectScales(C_MAJOR_NOTES);
  })
  .add("scale detect — reference", () => {
    RefScale.detect(C_MAJOR_NOTES);
  })
  .add("key detection (K–S, 12 notes) — ours", () => {
    detectKeys(MELODY);
  });

await bench.run();

interface Row {
  name: string;
  hz: number;
  rme: string;
}

const rows: Row[] = bench.tasks.map((task) => {
  const throughput = task.result?.throughput;
  const hz = throughput?.mean ?? 0;
  const rme = throughput ? `±${throughput.rme.toFixed(2)}%` : "n/a";
  return { name: task.name, hz, rme };
});

const fmt = (hz: number): string =>
  hz >= 1e6 ? `${(hz / 1e6).toFixed(2)}M` : hz >= 1e3 ? `${(hz / 1e3).toFixed(0)}k` : hz.toFixed(0);

console.log("\n| Operation | ops/sec | margin |");
console.log("|---|---:|---:|");
for (const row of rows) {
  console.log(`| ${row.name} | ${fmt(row.hz)} | ${row.rme} |`);
}

// Ratios our README talks about — computed, not hand-written.
const byName = new Map(rows.map((r) => [r.name, r.hz]));
const ratio = (a: string, b: string): string => {
  const x = byName.get(a);
  const y = byName.get(b);
  return x && y ? `${(x / y).toFixed(1)}x` : "n/a";
};
console.log("\nours vs reference:");
console.log(`  transpose (string → name): ${ratio("transpose, string → name — ours", "transpose, string → name — reference")}`);
console.log(`  transpose (string → Pitch): ${ratio("transpose, string → Pitch — ours", "transpose, string → name — reference")}`);
console.log(`  transpose (object → Pitch): ${ratio("transpose, object → Pitch — ours", "transpose, string → name — reference")}`);
console.log(`  chord parse:        ${ratio("chord symbol parse — ours", "chord symbol parse — reference")}`);
console.log(`  chord detect:       ${ratio("chord detect — ours", "chord detect — reference")}`);
console.log(`  scale detect:       ${ratio("scale detect — ours", "scale detect — reference")}`);
console.log("  key detection:      reference offers no key detection");
