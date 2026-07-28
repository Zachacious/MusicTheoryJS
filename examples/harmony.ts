/**
 * Keys, Roman numerals, progressions, and analysis.
 * Run with: `bun run examples/harmony.ts`
 */

import {
  Chord,
  Key,
  Scale,
  detectChord,
  detectScales,
  drop2,
  mode,
} from "../src/index";

// Keys and diatonic harmony
const c = Key.major("C");
console.log("C major signature:", c.signature.count, "accidentals");
console.log(
  "Diatonic triads:",
  [1, 2, 3, 4, 5, 6, 7].map((d) => c.chord(d).toString()).join(" ")
);
console.log(
  "Diatonic sevenths:",
  [1, 2, 3, 4, 5, 6, 7]
    .map((d) => c.chord(d, { seventh: true }).toString())
    .join(" ")
);

// Roman numerals both directions
console.log("V7 chord in C:", c.chordFromRoman("V7").toString());
console.log(
  "ii-V-I in C:",
  c
    .progression("ii7 V7 Imaj7")
    .map((ch) => ch.toString())
    .join(" ")
);

// Relative / parallel
console.log("Relative of C major:", c.relative().toString());
console.log("Parallel of C major:", c.parallel().toString());

// Chord detection (the inverse of building from a symbol)
console.log(
  "Detect [G4,B4,D5,F5]:",
  detectChord(["G4", "B4", "D5", "F5"])?.toString()
);

// Voicings
console.log(
  "Cmaj7 drop2:",
  drop2(Chord.from("Cmaj7"))
    .map((n) => n.toString())
    .join(" ")
);

// Scale detection & modes
console.log(
  "Detect white keys:",
  detectScales(["C4", "D4", "E4", "F4", "G4", "A4", "B4"])
    .slice(0, 3)
    .map((m) => `${m.tonic.letter} ${m.name}`)
    .join(", ")
);
console.log(
  "2nd mode of C major:",
  mode(Scale.from("C4", "major"), 2).noteNames().join(" ")
);
