/**
 * Western music example. Run with: `bun run examples/western.ts`
 */

import {
  Chord,
  Note,
  PERFECT_FIFTH,
  Scale,
  frequencyOfNote,
  interval,
} from "../src/index";

// Correct enharmonic spelling
console.log("C4 up a P5:", new Note("C4").transpose(PERFECT_FIFTH).toString());
console.log(
  "C4 up a d4:",
  new Note("C4").transpose(interval(4, "d")).toString()
);
console.log("E#4 == F4 (sound):", new Note("E#4").isEnharmonic("F4"));
console.log("E#4 == F4 (spelling):", new Note("E#4").equals("F4"));

// Scales
console.log("C major:", Scale.from("C4", "major").noteNames().join(" "));
console.log("D dorian:", Scale.from("D4", "dorian").noteNames().join(" "));
console.log("Bb major:", Scale.from("Bb3", "major").noteNames().join(" "));

// Chords
console.log("Cmaj7:", Chord.from("Cmaj7").noteNames().join(" "));
console.log("Bdim7:", Chord.from("Bdim7").noteNames().join(" "));
console.log("C/E (1st inv):", Chord.from("C").invert().noteNames().join(" "));

// Frequencies
console.log("A4 =", frequencyOfNote(new Note("A4")), "Hz");
console.log(
  "A4 (432) =",
  frequencyOfNote(new Note("A4"), undefined, { frequency: 432 }),
  "Hz"
);
