// Type-level consumer of the BUILT package, resolved by name through the
// exports map. Compiled by scripts/e2e-types.mjs; never run.
import { Chord, Key, type Note, Scale, VERSION, interval } from "musictheoryjs";
import { notesSoundingAt } from "musictheoryjs/analysis";
import { detectPitch } from "musictheoryjs/audio";
import { detectChord } from "musictheoryjs/chord";
import { range } from "musictheoryjs/collection";
import { interval as subpathInterval } from "musictheoryjs/interval";
import { key } from "musictheoryjs/key";
import { parseMidi } from "musictheoryjs/midi";
import { toABC } from "musictheoryjs/notation";
import { Note as SubpathNote } from "musictheoryjs/note";
import { duration } from "musictheoryjs/rhythm";
import { Scale as SubpathScale } from "musictheoryjs/scale";
import { arpeggiate } from "musictheoryjs/sequence";
import { centsTuning } from "musictheoryjs/tuning";

export const names: string[] = Scale.from("C4", "major").noteNames();
// Fails if the declarations degrade to `any`: the directive would go unused.
// @ts-expect-error noteNames() returns string[]
export const wrong: number = Chord.from("Cmaj7").noteNames();
export const sameClass: typeof Note = SubpathNote;
export const sameScale: typeof Scale = SubpathScale;

export const used = [
  Key,
  VERSION,
  interval,
  notesSoundingAt,
  detectPitch,
  detectChord,
  range,
  subpathInterval,
  key,
  parseMidi,
  toABC,
  duration,
  arpeggiate,
  centsTuning,
];
