# MusicTheoryJS

A modern, tree-shakable music theory library for JavaScript and TypeScript.

Primarily Western and ergonomic — correct enharmonic spelling, spelled intervals,
scales, and chords — with **first-class support for non-standard tunings and
microtonal / non-Western music** through a pluggable tuning system.

- **Correct by construction.** Notes carry their spelling (letter + accidental),
  so `E#` and `F` are distinct, a C‑major scale spells `C D E F G A B`, and a
  diminished-seventh chord spells its seventh as `A♭`, not `G#`.
- **Immutable.** Every operation returns a new value; nothing mutates in place.
- **Tuning-agnostic core.** 12‑TET is just the default. `n`‑EDO, Pythagorean,
  meantone, Just Intonation, maqam/gamelan cents tables, and Scala `.scl` files
  are all ordinary tunings — none is privileged.
- **Tree-shakable, zero runtime dependencies.** Import only what you use.
- **Dual ESM + CJS**, fully typed.

```bash
bun add musictheoryjs   # or: npm i musictheoryjs / pnpm add musictheoryjs
```

## Western quick start

```ts
import { Note, Scale, Chord, interval, PERFECT_FIFTH } from "musictheoryjs";

// Notes are immutable and spelled
const c4 = new Note("C4");
c4.transpose(PERFECT_FIFTH).toString();  // "G4"
c4.transpose(interval(4, "d")).toString(); // "Fb4"  (diminished 4th, not E)
new Note("E#4").isEnharmonic("F4");        // true
new Note("E#4").equals("F4");              // false (different spelling)

// Scales spell correctly
Scale.from("C4", "major").noteNames();
// ["C4","D4","E4","F4","G4","A4","B4"]
Scale.from("C4", "lydian").noteNames();    // contains "F#4", never "Gb4"
Scale.from("D4", "dorian").degree(3).toString(); // "F4"

// Chords from symbols
Chord.from("Cmaj7").noteNames();  // ["C4","E4","G4","B4"]
Chord.from("Bdim7").noteNames();  // ["B4","D5","F5","Ab5"]
Chord.from("C").invert().noteNames(); // ["E4","G4","C5"]
```

## Frequencies & tunings

```ts
import { Note, frequencyOfNote, pythagorean, justIntonation } from "musictheoryjs";

frequencyOfNote(new Note("A4"));               // 440
frequencyOfNote(new Note("C4"));               // 261.6256…
frequencyOfNote(new Note("A4"), undefined, { frequency: 432 }); // 432

// The same note under a different tuning
frequencyOfNote(new Note("E4"), justIntonation()); // pure major third above C
frequencyOfNote(new Note("G4"), pythagorean());    // pure fifth (701.955¢)
```

## Keys, Roman numerals & analysis

```ts
import { Key, detectChord, detectScales, drop2, Chord } from "musictheoryjs";

const c = Key.major("C");
c.signature.count;                 // 0  (positive = sharps, negative = flats)
c.chord(2).toString();             // "Dm"   (ii)
c.chord(5, { seventh: true }).toString(); // "G7"  (V7)

// Roman numerals, both directions
c.romanNumeral(Chord.from("G7"));  // "V7"
c.romanNumeral(Chord.from("Bb"));  // "bVII"
c.chordFromRoman("ii7").toString(); // "Dm7"
c.progression("I V vi IV").map(String); // [C, G, Am, F]

c.relative().toString();           // "A minor"
c.parallel().toString();           // "C minor"

// Detection (the inverse of building from a symbol)
detectChord(["G4", "B4", "D5", "F5"])?.toString(); // "G7"
detectScales(["C4","D4","E4","F4","G4","A4","B4"]); // C major, A minor, D dorian, …

// Voicings
drop2(Chord.from("Cmaj7")).map(String); // ["G3","C4","E4","B4"]
```

## Analyzing note streams

The library is purely symbolic — it never touches audio. A client app supplies
timed `NoteEvent`s (from MIDI, a transcriber, a sequencer, live input, …) and
gets music theory back.

```ts
import {
  detectKey, segmentChords, onsetTimes, intervalClassVector, Note,
} from "musictheoryjs";

// Turn a detected pitch or MIDI number into a note
Note.fromFrequency(442);  // A4  (snapped to nearest 12-TET)
Note.fromMidi(60);        // C4

// Key detection (Krumhansl-Schmuckler) — ranked, best first
detectKey(["C4","E4","G4","A4","D5","F5"])[0].key.toString(); // "C major"

// Set-theory fingerprint (transposition/inversion-invariant)
intervalClassVector(["C4","Eb4","Gb4","A4"]); // [0,0,4,0,0,2]  (dim7)

// Chord timeline from a timed stream
const stream = [
  { pitch: new Note("D4"), start: 0, duration: 4 },
  { pitch: new Note("F4"), start: 0, duration: 4 },
  { pitch: new Note("A4"), start: 0, duration: 4 },
  { pitch: new Note("G4"), start: 4, duration: 4 },
  /* … */
];
segmentChords(stream, [...onsetTimes(stream), 12]);
// [{ start:0, end:4, chord: Dm }, { start:4, end:8, chord: G }, …]
```

Feed the detected chords into a `Key` for Roman-numeral analysis, or the
duration-weighted histogram (`pitchClassWeightsFromStream`) into `detectKey`.

## Microtonal & non-Western music

Microtonal pitches are not "deviations" from the Western grid — they are ordinary
pitches in a tuning that happens not to have 12 equal steps.

```ts
import {
  equalTemperament,
  centsTuning,
  ratioTuning,
  scalaTuning,
  scaleFromTuning,
} from "musictheoryjs";

// 24-EDO (quarter tones)
scaleFromTuning(equalTemperament(24));
// [{ degree: 0, cents: 0, frequency: 440 }, { degree: 1, cents: 50, … }, …]

// A maqam Rast, as a cents table, anchored so its tonic sounds at 264 Hz
const rast = centsTuning([0, 204, 355, 498, 702, 906, 1057], { name: "Rast" });
scaleFromTuning(rast, { frequency: 264 }, true); // includes the closing octave

// Just-intonation major scale from ratios
ratioTuning(["1/1", "9/8", "5/4", "4/3", "3/2", "5/3", "15/8"]);

// Import a Scala .scl tuning file
scalaTuning(fs.readFileSync("bohlen-pierce.scl", "utf8"));
```

Non-octave periods work too — e.g. a Bohlen–Pierce-style tuning that repeats at a
3/1 "tritave":

```ts
centsTuning([0, 500, 1000], { period: 1901.955 });
```

## Subpath imports (smaller bundles)

Every area is also a subpath, so you can pull in exactly one concern:

```ts
import { Note } from "musictheoryjs/note";
import { Chord } from "musictheoryjs/chord";
import { Key } from "musictheoryjs/key";
import { detectKey } from "musictheoryjs/analysis";
import { equalTemperament } from "musictheoryjs/tuning";
```

## API overview

| Module | Highlights |
| --- | --- |
| `note` | `Note` — `transpose`, `sharpen`/`flatten`, `enharmonic`, `intervalTo`, `isEnharmonic`, `midi`, `pitchClass` |
| `interval` | `interval(n, quality)`, `intervalBetween`, `transpose`, `intervalName`, named constants (`PERFECT_FIFTH`, …) |
| `scale` | `Scale.from(tonic, name)`, `.notes`/`.degree`/`.contains`, `mode`/`modes`, `detectScales`, `scaleFromTuning` |
| `chord` | `Chord.from(symbol)`, `Chord.of(root, quality)`, `.invert`, quality tests, `detectChord`, `closeVoicing`/`drop2`/`drop3`/`spread` |
| `key` | `Key.major`/`Key.minor`, `.signature`, `.chord(degree)`, `.romanNumeral`/`.chordFromRoman`, `.progression`, `.relative`/`.parallel` |
| `analysis` | `NoteEvent`/`NoteStream`, `detectKey`, `detectChordAt`/`segmentChords`/`onsetTimes`, `pitchClasses`/`intervalClassVector`; `Note.fromMidi`/`fromFrequency` |
| `tuning` | `Tuning` interface, `equalTemperament`/`edo`, `pythagorean`, `quarterCommaMeantone`, `justIntonation`, `centsTuning`, `ratioTuning`, `scalaTuning`, `frequencyOfNote`, `frequencyOfDegree` |
| `pitch` | Low-level `SpelledPitch` and `PitchPoint` primitives, parsing/formatting |

See [`examples/`](examples) for runnable scripts.

## Development

```bash
bun install
bun test          # run the test suite
bun run typecheck # tsc --noEmit
bun run lint      # biome check
bun run build     # ESM + CJS + .d.ts into dist/
```

## License

ISC © Zach Moore
