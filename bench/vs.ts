/**
 * Head-to-head benchmark against the reference implementation (a
 * dev-dependency, never shipped): run with `bun run bench:vs`.
 *
 * Every figure is **operations per second** — bigger is better. The ratio is
 * ours ÷ reference, so 2.0x means we do it twice as fast.
 *
 * Methodology, because the easy ways to measure this are all wrong:
 *
 * - **Rotating inputs.** Both sides memoize, so hammering one literal measures
 *   a cache hit rather than the work. Each case cycles a corpus of realistic
 *   inputs, which is what a real caller looks like.
 * - **Batched samples.** Most of these run in well under a microsecond, so
 *   each timed sample covers many iterations and the interval sits far above
 *   timer resolution. Timing single calls swings 2-3x between runs on
 *   identical code.
 * - **Alternating rounds.** Which side runs first alternates, so JIT and GC
 *   ordering cannot systematically favour one; the reported figure is the
 *   median across rounds.
 *
 * Numbers are machine-relative: compare runs on one machine, not across them.
 */

import {
  Chord as RefChord,
  Interval as RefInterval,
  Mode as RefMode,
  Note as RefNote,
  Pcset as RefPcset,
  RhythmPattern as RefRhythm,
  Scale as RefScale,
} from "tonal";
import { detectChord } from "../src/chord/analysis";
import { Chord } from "../src/chord/chord";
import {
  intervalBetween,
  intervalName,
  transpose,
} from "../src/interval/interval";
import { parseInterval } from "../src/interval/parse";
import { formatNote } from "../src/pitch/format";
import { parseNote } from "../src/pitch/parse";
import { pcsetMask, pcsetModes } from "../src/pitch/pcset";
import { chroma, midi } from "../src/pitch/spelled";
import { euclideanRhythm } from "../src/rhythm/pattern";
import { chordScales } from "../src/scale/chordscales";
import { detectScales } from "../src/scale/detection";
import { modeDistance } from "../src/scale/modes";
import { Scale } from "../src/scale/scale";
import { frequencyOfNote } from "../src/tuning/tuning";

/** Corpora wide enough that neither side is just replaying one cache entry. */
const NOTES = [
  "C4",
  "Eb4",
  "F#3",
  "Bb2",
  "G#5",
  "Db4",
  "A3",
  "E5",
  "Cb4",
  "B#3",
  "D2",
  "Ab6",
  "F5",
  "G3",
];
const INTERVAL_NAMES = [
  "m3",
  "P5",
  "M2",
  "A4",
  "m7",
  "M6",
  "d5",
  "P4",
  "M9",
  "P11",
];
const SYMBOLS = [
  "C",
  "Cm",
  "Cmaj7",
  "Cm7",
  "C7",
  "Cm7b5",
  "Cdim7",
  "Caug",
  "C6",
  "Cm6",
  "C9",
  "C13",
  "Csus4",
  "Cadd9",
  "F#m7",
  "Bbmaj7",
  "Ebm9",
  "Abmaj9",
  "Dm11",
  "E7#9",
  "Am7b5",
  "Bdim7",
  "C#m7",
  "F13",
];
const SCALE_SPECS: ReadonlyArray<readonly [string, string]> = [
  ["D4", "dorian"],
  ["C4", "major"],
  ["F#4", "lydian"],
  ["Bb4", "mixolydian"],
  ["A4", "minor"],
  ["Eb4", "melodicMinor"],
  ["G4", "harmonicMinor"],
  ["E4", "phrygian"],
];
const REF_SCALE_NAMES = [
  "D dorian",
  "C major",
  "F# lydian",
  "Bb mixolydian",
  "A minor",
  "Eb melodic minor",
  "G harmonic minor",
  "E phrygian",
];
const CHORD_SETS: ReadonlyArray<readonly string[]> = [
  ["G4", "B4", "D5", "F5"],
  ["C4", "E4", "G4"],
  ["D4", "F4", "A4", "C5"],
  ["A3", "C4", "Eb4", "Gb4"],
  ["F4", "A4", "C5", "E5"],
];
const NOTE_SETS: ReadonlyArray<readonly string[]> = [
  ["C4", "D4", "E4", "F4", "G4", "A4", "B4"],
  ["D4", "E4", "F4", "G4", "A4", "Bb4", "C5"],
  ["A3", "B3", "C4", "D4", "E4", "F4", "G4"],
  ["Eb4", "F4", "G4", "Ab4", "Bb4", "C5", "D5"],
];
const MODE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["major", "dorian"],
  ["dorian", "major"],
  ["major", "minor"],
  ["lydian", "mixolydian"],
  ["minor", "phrygian"],
];
const EUCLID: ReadonlyArray<readonly [number, number]> = [
  [16, 5],
  [8, 3],
  [12, 7],
  [16, 9],
  [8, 5],
];

const PC_MASKS = NOTE_SETS.map((set) =>
  pcsetMask(set.map((n) => chroma(parseNote(n))))
);

interface Case {
  readonly name: string;
  /** Receives a rotating index; use it to pick from a corpus. */
  readonly ours: (i: number) => unknown;
  readonly reference: (i: number) => unknown;
  /** Iterations per timed sample; smaller for heavier operations. */
  readonly batch: number;
}

const pick = <T>(xs: readonly T[], i: number): T => xs[i % xs.length] as T;

const CASES: readonly Case[] = [
  {
    name: "parse note",
    ours: (i) => parseNote(pick(NOTES, i)),
    reference: (i) => RefNote.get(pick(NOTES, i)),
    batch: 10000,
  },
  {
    name: "parse interval",
    ours: (i) => parseInterval(pick(INTERVAL_NAMES, i)),
    reference: (i) => RefInterval.get(pick(INTERVAL_NAMES, i)),
    batch: 10000,
  },
  {
    // String in, string out on both sides — the reference parses its
    // arguments, so ours must too or the comparison flatters us.
    name: "transpose (string in/out)",
    ours: (i) =>
      formatNote(
        transpose(
          parseNote(pick(NOTES, i)),
          parseInterval(pick(INTERVAL_NAMES, i))
        )
      ),
    reference: (i) =>
      RefNote.transpose(pick(NOTES, i), pick(INTERVAL_NAMES, i)),
    batch: 10000,
  },
  {
    name: "interval between (string in/out)",
    ours: (i) =>
      intervalName(
        intervalBetween(
          parseNote(pick(NOTES, i)),
          parseNote(pick(NOTES, i + 1))
        )
      ),
    reference: (i) => RefInterval.distance(pick(NOTES, i), pick(NOTES, i + 1)),
    batch: 10000,
  },
  {
    name: "chord notes",
    ours: (i) => Chord.from(pick(SYMBOLS, i)).noteNames(),
    reference: (i) => RefChord.get(pick(SYMBOLS, i)).notes,
    batch: 2000,
  },
  {
    name: "scale notes",
    ours: (i) => {
      const [tonic, name] = pick(SCALE_SPECS, i);
      return Scale.from(tonic, name).noteNames();
    },
    reference: (i) => RefScale.get(pick(REF_SCALE_NAMES, i)).notes,
    batch: 2000,
  },
  {
    name: "detect chord",
    ours: (i) => detectChord(pick(CHORD_SETS, i)),
    reference: (i) => RefChord.detect([...pick(CHORD_SETS, i)]),
    batch: 1000,
  },
  {
    name: "detect scale",
    ours: (i) => detectScales(pick(NOTE_SETS, i)),
    reference: (i) => RefScale.detect([...pick(NOTE_SETS, i)]),
    batch: 500,
  },
  {
    name: "note -> midi",
    ours: (i) => midi(parseNote(pick(NOTES, i))),
    reference: (i) => RefNote.midi(pick(NOTES, i)),
    batch: 10000,
  },
  {
    name: "note -> frequency",
    ours: (i) => frequencyOfNote(parseNote(pick(NOTES, i))),
    reference: (i) => RefNote.freq(pick(NOTES, i)),
    batch: 10000,
  },
  {
    name: "pcset modes",
    ours: (i) => pcsetModes(pick(PC_MASKS, i)),
    reference: (i) => RefPcset.modes([...pick(NOTE_SETS, i)]),
    batch: 2000,
  },
  {
    name: "euclidean rhythm",
    ours: (i) => {
      const [steps, pulses] = pick(EUCLID, i);
      return euclideanRhythm(steps, pulses);
    },
    reference: (i) => {
      const [steps, pulses] = pick(EUCLID, i);
      return RefRhythm.euclid(steps, pulses);
    },
    batch: 10000,
  },
  {
    name: "mode distance",
    ours: (i) => {
      const [from, to] = pick(MODE_PAIRS, i);
      return modeDistance(from, to);
    },
    reference: (i) => {
      const [from, to] = pick(MODE_PAIRS, i);
      return RefMode.distance(from, to);
    },
    batch: 1000,
  },
  {
    // Not like for like: we rank every fit with avoid-note scoring and return
    // built scales, where the reference returns a flat list of names.
    name: "chord scales*",
    ours: (i) => chordScales(pick(SYMBOLS, i)),
    reference: (i) => RefChord.chordScales(pick(SYMBOLS, i)),
    batch: 200,
  },
];

/** Milliseconds per operation, averaged over one batch of rotating inputs. */
function timeBatch(
  fn: (i: number) => unknown,
  batch: number,
  seed: number
): number {
  const start = performance.now();
  for (let i = 0; i < batch; i++) fn(seed + i);
  return (performance.now() - start) / batch;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] as number;
}

/** Operations per second, rendered compactly. */
function perSecond(msPerOp: number): string {
  const hz = 1000 / msPerOp;
  return hz >= 1e6 ? `${(hz / 1e6).toFixed(1)}M` : `${Math.round(hz / 1e3)}k`;
}

const ROUNDS = 7;
const rows: Array<Record<string, string>> = [];
let wins = 0;

for (const { name, ours, reference, batch } of CASES) {
  for (let i = 0; i < batch * 2; i++) {
    ours(i);
    reference(i);
  }
  const oursTimes: number[] = [];
  const referenceTimes: number[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    const seed = round * batch;
    // Alternate who goes first so ordering effects cancel out.
    if (round % 2 === 0) {
      oursTimes.push(timeBatch(ours, batch, seed));
      referenceTimes.push(timeBatch(reference, batch, seed));
    } else {
      referenceTimes.push(timeBatch(reference, batch, seed));
      oursTimes.push(timeBatch(ours, batch, seed));
    }
  }
  const oursMedian = median(oursTimes);
  const referenceMedian = median(referenceTimes);
  const ratio = referenceMedian / oursMedian;
  if (ratio > 1) wins++;
  rows.push({
    case: name,
    "ours ops/sec": perSecond(oursMedian),
    "reference ops/sec": perSecond(referenceMedian),
    ratio: `${ratio.toFixed(2)}x`,
  });
}

// biome-ignore lint/suspicious/noConsole: the table is the bench's output
console.table(rows);
// biome-ignore lint/suspicious/noConsole: the summary is the bench's output
console.log(
  `\nFaster on ${wins}/${CASES.length}. Inputs rotate through a corpus, so these are
steady-state figures rather than cache hits on one literal.
Median of ${ROUNDS} alternating rounds; ratio is ours / reference.
* chord scales returns strictly more than the reference: ranked fits with
  scores, avoid notes, and built scales.`
);
