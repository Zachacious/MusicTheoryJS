# Migrating from MusicTheoryJS v2 to v3

v3 is a ground-up rewrite. The v2 class API
(`Note`, `Scale`, `Chord`, `Instrument`) is gone, replaced by small pure
functions over immutable values. This guide maps every v2 concept to its v3
equivalent. (Every v3 snippet in this guide runs in CI, and the `// =>`
values are asserted.)

## Why the break?

v2 represented notes as a chromatic `semitone` number (0–11) plus a
`Modifier`. That representation cannot distinguish D# from Eb, so spelling in
v2 came from lookup-table preference — good enough for MIDI, wrong for
notation, analysis, and historical tunings. v3 stores the *spelling* itself
(letter step + alteration + optional octave), and everything else — chords,
scales, keys, tuning — derives exact spellings by arithmetic. `transpose("C4",
"m3")` is Eb4, not D#4, because a minor third is up two letters; no preference
table is consulted.

The other three big shifts:

| v2 | v3 |
|---|---|
| Classes with mutating methods (`chord.minor()` changes the chord) | Pure functions returning new frozen values; nothing ever mutates |
| `buildTables()` warm-up call for string parsing | Gone. String parsing is memoized automatically; no setup step exists |
| One entry point, everything bundled | Subpath exports (`musictheoryjs/core`, `/chord`, `/tuning`, …), fully tree-shakeable |

## Setup

```bash
npm install musictheoryjs
```

```ts no-run
// v2
import { Scale, Chord, Note, Instrument, buildTables } from "musictheoryjs";
buildTables(); // required for fast string parsing
```

```ts
// v3 — import from the root, or from a subpath for smaller bundles
import { note, scale, chord } from "musictheoryjs";

scale("C major").notes; // => ["C", "D", "E", "F", "G", "A", "B"]
```

There is no `buildTables` and no `Instrument` to construct. CommonJS
(`require("musictheoryjs")`) and a browser UMD build
(`dist/musictheory.umd.min.js`, global `MusicTheoryJS`) are also shipped.

## Notes: `new Note(...)` → `note(...)`

v2's `Note` wrapped a `semitone` (0–11) and an `octave`, both mutable. v3's
`Pitch` is a frozen `{ step, alt, oct?, cents? }` — letter and alteration
stored separately, octave optional (no octave = a pitch class), plus an
optional microtonal `cents` deviation v2 had no equivalent for.

```ts no-run
// v2
const n = new Note("D4");
n.semitone;        // 2
n.octave;          // 4
n.sharp();         // mutates n to D#4
const other = n.sharpened(); // non-mutating variant
n.equals(other);
n.toString();
```

```ts
// v3
import { note, noteName, chroma, transpose, sameSpelling, samePitch, midi, freq } from "musictheoryjs";

const n = note("D4");
n.step; // => 1
n.oct; // => 4
chroma(n); // => 2
noteName(transpose(n, "A1")); // => "D#4"
sameSpelling("D#4", "Eb4"); // => false
samePitch("D#4", "Eb4"); // => true
noteName(n); // => "D4"
midi("E5"); // => 76
freq("E5"); // => ~659.26
```

Migration notes:

- **`semitone` numbers → `chroma()`**. The v2 `Semitone` enum (0 = C … 11 = B)
  is exactly v3's chroma. To go the other way, `spellChroma(3)` gives `D#`
  (or `Eb` with `{ prefer: "flat" }`) — but prefer carrying `Pitch` values so
  no spelling guess is ever needed.
- **`Modifier` (flat = −1, sharp = 1) → the `alt` field**, which is unbounded:
  `note("F##3").alt` is `2`.
- **`sharp()` / `flat()` mutators → `transpose(p, "A1")` / `transpose(p, "-A1")`.**
  Nothing mutates; you always get a new value back.
- **`copy()` is unnecessary** — values are frozen and safe to share.
- **`equals()` split in two**: `sameSpelling` (D# ≠ Eb) and `samePitch`
  (D# = Eb enharmonically). v2 could not make this distinction.

## Scales: `new Scale("C5(major)")` → `scale("C major")`

v3 scales are pitch-class-first: a scale is a set of spelled pitch classes,
and octaves only appear when you realize it in register. This removes the v2
gotcha where scale identity depended on the octave you built it in.

```ts no-run
// v2
const s = new Scale("C5(major)");
s.getNoteNames();     // ["C5", "D5", "E5", "F5", "G5", "A5", "B5"]
s.degree(3);          // Note E5
s.relativeMinor();
s.dorian();           // or s.shift(...) for modes
```

```ts
// v3
import { scale, scaleNotes, mode, majorKey } from "musictheoryjs";

scale("C major").notes; // => ["C", "D", "E", "F", "G", "A", "B"]
scaleNotes("C major", 5); // => ["C5", "D5", "E5", "F5", "G5", "A5", "B5"]
scale("C major").notes[2]; // => "E"
majorKey("C").minorRelative; // => "A"
mode("C major", 2).name; // => "D dorian"
```

Migration notes:

- The v2 string format `"C5(major)"` is replaced by `"C major"` /
  `scale("C", "major")`. 92 scale types and their aliases are available —
  `scale("C ionian")` normalizes to `C major`.
- **`shift()` / `ionian()` … `locrian()` → `mode(scaleOrName, degree)`** (or
  `modes()` for all of them). Modes are computed by rotation on the parent's
  spelling, so `mode("Eb major", 6)` is `C minor` with Eb major's flats intact.
- **`degree(n)`** → index into `.notes` (0-based), or `scaleNotes(s, octave)`
  for octave-realized names.
- v2 had no key model; `majorKey` / `minorKey` now carry signatures, diatonic
  chords, harmonic functions, and secondary/substitute dominants (see the
  README tour).

## Chords: `new Chord("(Ab3)maj7")` → `chord("Abmaj7")`

```ts no-run
// v2
const c = new Chord("(Ab3)maj7");
c.getNoteNames();   // note names, spelling from lookup tables
c.minor();          // mutates the template
c.invert();         // mutates to the next inversion
c.isMajor();
```

```ts
// v3
import { chord, chordNotes, transposeChord } from "musictheoryjs";

chord("Abmaj7").notes; // => ["Ab", "C", "Eb", "G"]
chordNotes("Abmaj7", 3); // => ["Ab3", "C4", "Eb4", "G4"]
chord("Ab", "m7").symbol; // => "Abm7"
chord("Abmaj7").type; // => "major seventh"
transposeChord("Abmaj7", "M2").symbol; // => "Bbmaj7"
chord("Am7/G").bass; // => "G"
```

Migration notes:

- The v2 symbol format `"(Ab3)maj7"` is replaced by ordinary chord symbols:
  `"Abmaj7"`, `"F#m7b5"`, `"C13#11"`, `"Cm(maj7)"`, `"Am7/G"` all parse. An
  unknown quality **throws with a suggestion** ("did you mean …") instead of
  silently defaulting — v2's parser fell back to major for typos.
- **Quality mutators (`minor()`, `augment()`, …) → build the chord you want**:
  `chord("Ab", "m7")`. Checking quality: compare `chord(...).type` or
  `.quality` instead of `isMajor()`/`isMinor()`.
- **`invert()` → slash chords and voicings.** Chords are pitch-class-first, so
  inversion is a *voicing* concern: `chord("C/E")` records the bass, and the
  `voiceChord` / `nextVoicing` functions in `musictheoryjs/harmony` produce
  octave-realized voicings with real voice-leading.
- **Detection is new**: `detectChords(["C", "Eb", "G", "Bb"])` ranks
  interpretations with scores — v2 had nothing comparable.

## Instrument / tuning: `new Instrument(432)` → tuning systems

v2's `Instrument` held an A4 reference and converted notes to frequency/MIDI.
v3 replaces it with plain functions plus a real tuning-system model.

```ts no-run
// v2
const instrument = new Instrument(432);
instrument.getFrequency(note); // 12-TET only
instrument.getMidiKey(note);
```

```ts
// v3
import { freq, midi, frequency, equalTemperament, meantoneTuning, pitchBend } from "musictheoryjs";

freq("A4"); // => 440
freq("A4", { a4: 432 }); // => 432
midi("A4"); // => 69
// Beyond 12-TET — something v2 could not express at all:
frequency("A4", equalTemperament({ a4: 432 })); // => 432
meantoneTuning().offset("G#"); // => ~-17.11
meantoneTuning().offset("Ab"); // => ~23.95
pitchBend("C4"); // => 8192
```

Because v3 pitches are spelled, temperaments genuinely distinguish G# from Ab
(quarter-comma meantone above), and `pitchBend` turns any tuning offset into a
14-bit MIDI pitch-bend value for playback.

## Quick reference

| v2 | v3 |
|---|---|
| `new Note("D4")` | `note("D4")` |
| `note.semitone` | `chroma(p)` |
| `note.octave` | `p.oct` |
| `Modifier.FLAT` (−1) | `p.alt < 0` |
| `note.sharp()` / `note.flat()` | `transpose(p, "A1")` / `transpose(p, "-A1")` |
| `note.equals(other)` | `sameSpelling(a, b)` or `samePitch(a, b)` |
| `note.copy()` | not needed (frozen values) |
| `note.toString()` | `noteName(p)` |
| `new Scale("C5(major)")` | `scale("C major")` |
| `scale.getNoteNames()` | `scale(...).notes` / `scaleNotes(s, octave)` |
| `scale.degree(3)` | `scale(...).notes[2]` |
| `scale.relativeMajor()` / `relativeMinor()` | `minorKey(t).relativeMajor` / `majorKey(t).minorRelative` |
| `scale.dorian()`, `scale.shift(n)` | `mode(s, degree)`, `modes(s)` |
| `new Chord("(Ab3)maj7")` | `chord("Abmaj7")` |
| `chord.getNoteNames()` | `chord(...).notes` / `chordNotes(c, octave)` |
| `chord.minor()` etc. | `chord(root, quality)` |
| `chord.isMajor()` etc. | `chord(...).type` / `.quality` |
| `chord.invert()` | `chord("C/E")`, `voiceChord`, `nextVoicing` |
| `new Instrument(a4)` | `{ a4 }` option / `equalTemperament({ a4 })` |
| `instrument.getFrequency(n)` | `freq(p, options?)` / `frequency(p, tuning)` |
| `instrument.getMidiKey(n)` | `midi(p)` |
| `Semitone` enum | chroma numbers 0–11, `spellChroma()` |
| `buildTables()` | removed — parsing is memoized automatically |

## Error handling

v2 constructors threw plain `Error`s on bad strings and silently defaulted in
places (unknown chord qualities became major). v3 never silently defaults:
creation functions throw a typed `MusicTheoryError` (with a "did you mean"
suggestion when one is close), and every creation function has a `try*`
variant returning `null` for soft paths.

```ts
// v3
import { tryNote, tryChord, chord, MusicTheoryError } from "musictheoryjs";

tryNote("H4"); // => null
tryChord("Cwat"); // => null
chord("Cmj7"); // => throws "did you mean"

let caught = "";
try {
  chord("Cmj7");
} catch (e) {
  caught = e instanceof MusicTheoryError ? e.name : "other";
}
caught; // => "MusicTheoryError"
```

## What's new in v3 (no v2 equivalent)

- **Spelled interval arithmetic**: `interval`, `distance`, `add`, `invert` —
  m3 and A2 are different values, and `transpose(p, distance(p, q))` is `q`.
- **Pitch-class sets** (`musictheoryjs/pcset`): 12-bit chroma engine.
- **Keys** (`/key`): signatures, harmonic functions, secondary/substitute dominants.
- **Roman numerals** (`/roman`): including secondary functions (`V7/V`).
- **Progressions** (`/progression`): parsing, roman analysis, next-chord suggestion.
- **Harmony analysis** (`/harmony`): Krumhansl–Schmuckler key detection, voice
  leading, Neo-Riemannian transforms, negative harmony, cadence and modulation
  detection, chord-scale matching.
- **Microtonality** (`/micro`) and **tuning systems** (`/tuning`): cents on
  every pitch, EDO arithmetic, just intonation, spelled temperaments, MIDI
  pitch-bend.
