/**
 * Benchmark suite (dev-only): run with `bun run bench`.
 *
 * Tracks the hot paths so perf work in later phases (memoization, bitmask
 * pitch-class sets) has a before/after. Numbers are machine-relative; compare
 * runs on the same machine, not across machines.
 */

import { Bench } from "tinybench";
import { detectKey } from "../src/analysis/key";
import { detectChord } from "../src/chord/analysis";
import { Chord } from "../src/chord/chord";
import { interval, transpose } from "../src/interval/interval";
import { parseInterval } from "../src/interval/parse";
import { Note, transposeNotes } from "../src/note/note";
import { noteRange } from "../src/note/range";
import { parseNote } from "../src/pitch/parse";
import { detectScales } from "../src/scale/detection";
import { Scale } from "../src/scale/scale";

const P5 = interval(5, "P");
const C4 = parseNote("C4");
const WHITE_KEYS = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];
const G7 = ["G4", "B4", "D5", "F5"];

const bench = new Bench({ time: 250 });

bench
  .add("parseNote C#4", () => parseNote("C#4"))
  .add("parseInterval P5", () => parseInterval("P5"))
  .add("transpose spelled", () => transpose(C4, P5))
  .add("Note.from + transpose by name", () => Note.from("C4").transpose("P5"))
  .add("Chord.from symbol", () => Chord.from("Cmaj7"))
  .add("Chord notes", () => Chord.from("Cmaj7").noteNames())
  .add("Scale notes", () => Scale.from("D4", "dorian").noteNames())
  .add("detectChord G7", () => detectChord(G7))
  .add("detectScales white keys", () => detectScales(WHITE_KEYS))
  .add("detectKey white keys", () => detectKey(WHITE_KEYS))
  .add("noteRange two octaves", () => noteRange("C3", "C5"))
  .add("transposeNotes 7 notes", () => transposeNotes(WHITE_KEYS, "M2"));

await bench.run();
// biome-ignore lint/suspicious/noConsole: the table is the bench's output
console.table(bench.table());
