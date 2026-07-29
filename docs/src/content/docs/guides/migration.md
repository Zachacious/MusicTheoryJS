---
title: Migrating from 2.x
description: Map every MusicTheoryJS 2.x concept to its v3 equivalent.
---

v3 is a ground-up rewrite and is not API-compatible with 2.x. This page maps
every 2.x concept to its v3 equivalent. All of the v3 snippets on this page
run as part of the library's test suite — the `// =>` values are asserted on
every commit, so what you read here is what the code does.

## The three big changes

1. **Notes are spelled.** A 2.x note was a semitone number 0–11 plus an
   octave, so D♯ and E♭ were the same value. A v3 note keeps its letter,
   accidental, and octave — D♯4 and E♭4 are enharmonic but not equal, scales
   come out with one of each letter, and intervals spell correctly.
2. **Everything is immutable.** 2.x entities mutated in place (`chord.minor()`
   changed the chord; `minored()` returned a copy). Every v3 operation
   returns a new value, so there are no paired mutate/copy methods.
3. **There is nothing to set up.** `buildTables()` is gone — parsing needs no
   lookup tables, and string initializers are the fast path, not a trap.

```js
// 2.x
import { buildTables, Note } from "musictheoryjs";
buildTables(); // required before string initializers were fast
```

```ts
// v3 — just import and go
import { Note } from "musictheoryjs";
new Note("D4").toString(); // => "D4"
```

## Notes

| 2.x | v3 |
| --- | --- |
| `new Note("D4")` | `new Note("D4")` (unchanged) |
| `new Note({ semitone: 4, octave: 5 })` | `Note.fromMidi(4 + 12 * (5 + 1))` |
| `note.semitone` | `note.pitchClass` (same 0 = C … 11 = B numbering) |
| `note.octave` | `note.octave` (unchanged) |
| `note.sharp()` / `note.sharpen()` | `note.transpose("A1")` — up a semitone, same letter |
| `note.flat()` / `note.flatten()` | `note.transpose("-A1")` — down a semitone, same letter |
| `note.isSharp()` | `note.alteration > 0` |
| `Note.A(5)` | `new Note("A5")` |
| `note.copy()` | not needed — notes are immutable |

```ts
import { Note } from "musictheoryjs";

const note = new Note("E5");
note.pitchClass; // => 4
Note.fromMidi(4 + 12 * 6).toString(); // => "E5"
new Note("C4").transpose("A1").toString(); // => "C#4"
new Note("D4").transpose("-A1").toString(); // => "Db4"
// Bare numbers work too, spelled conventionally: one semitone is a minor
// second, so it changes the letter — that's spelling doing its job.
new Note("C4").transpose(1).toString(); // => "Db4"
new Note("F#4").alteration; // => 1
```

Because notes are now spelled, equality splits into two honest questions:

```ts
import { Note } from "musictheoryjs";

new Note("D#4").equals("Eb4"); // => false
new Note("D#4").isEnharmonic("Eb4"); // => true
```

## Scales

| 2.x | v3 |
| --- | --- |
| `new Scale("C5(major)")` | `Scale.from("C5", "major")` |
| `new Scale({ key, octave, template })` | `Scale.fromSemitones(tonic, offsets)` |
| `scale.getNoteNames(preferSharpKey)` | `scale.noteNames()` — spelling comes from the tonic |
| `scale.degree(3)` | `scale.degree(3)` (unchanged, 1-based) |
| `scale.dorian()`, `scale.lydian()`, … | `Scale.from(scale.tonic, "dorian")`, … — same key, new pattern |
| `scale.shift(n)` / `scale.shifted(n)` | same idea: 2.x rotated the pattern over an unchanged key, so `shift(1)` on a major scale is `Scale.from(scale.tonic, "dorian")` |
| *(no 2.x equivalent)* | `mode(scale, n)` / `modes(scale)` — true modes, rooted on degree `n` |
| `scale.relativeMinor()` | `mode(scale, 6)` (or work in a `Key` and use `key.relative()`) |
| `scale.template` (interval numbers) | `Scale.fromSemitones` / template names via `isScaleName` |

```ts
import { Scale, mode } from "musictheoryjs";

const scale = Scale.from("C5", "major");
scale.noteNames(); // => ["C5", "D5", "E5", "F5", "G5", "A5", "B5"]
scale.degree(3).toString(); // => "E5"

// 2.x: scale.dorian() / scale.shift(1) — the dorian pattern on the same key
Scale.from(scale.tonic, "dorian").noteNames()[2]; // => "Eb5"

// 2.x: scale.relativeMinor()
mode(scale, 6).noteNames()[0]; // => "A5"

// 2.x: new Scale({ key: 0, octave: 4, template: [...] })
Scale.fromSemitones("C4", [0, 2, 4, 5, 7, 9, 11]).noteNames()[6]; // => "B4"
```

The template dictionary grew from 67 scales to 92, and most 2.x names carry
over (`major`, `dorian`, `harmonicMinor`, `majorPentatonic`, …). v3 also
detects scales from notes — see the [scales guide](/guides/scales/).

## Chords

| 2.x | v3 |
| --- | --- |
| `new Chord("(Ab3)maj7")` | `Chord.from("Abmaj7")` (octave 4) or `Chord.from({ root: "Ab3", quality: "maj7" })` |
| `chord.getNoteNames()` | `chord.noteNames()` |
| `chord.notes` | `chord.notes` (unchanged) |
| `chord.major()` / `chord.majored()` | `Chord.of(chord.root, "maj")` — build the quality you want |
| `chord.isMajor()` | `chord.quality === "maj"` |
| `chord.invert()` / `chord.inverted()` | `chord.invert()` (immutable — returns a new chord) |
| `chord.baseScale` | gone — qualities come from a 108-entry dictionary |

```ts
import { Chord, invertChord, parseChordSymbol } from "musictheoryjs";

Chord.from({ root: "Ab3", quality: "maj7" }).noteNames(); // => ["Ab3", "C4", "Eb4", "G4"]
Chord.from("Abmaj7").noteNames(); // => ["Ab4", "C5", "Eb5", "G5"]
parseChordSymbol("Cm7").quality; // => "min7"
invertChord("C").noteNames(); // => ["E4", "G4", "C5"]
```

The 2.x parenthesized string format `"(Ab3)maj7"` is gone; v3 parses the
symbols musicians actually write (`"Abmaj7"`, `"F#m7b5"`, `"Bb7#9"`, …),
tested against a corpus of real-world chord charts.

## Instrument → tunings

The 2.x `Instrument` bundled an A4 reference frequency with frequency/MIDI
lookups. In v3, frequency is a property of the note under a *tuning* — and
tunings go far beyond an A4 number (equal temperaments of any size, Just
Intonation, maqamat, Scala files — see the [tuning guide](/guides/tuning/)).

| 2.x | v3 |
| --- | --- |
| `new Instrument().getFrequency(note)` | `note.frequency` (or `frequencyOfNote(note)`) |
| `new Instrument(442).getFrequency(note)` | `frequencyOfNote(note, TET12, { frequency: 442 })` |
| `new Instrument().getMidiKey(note)` | `note.midi` |

```ts
import { Note, Scale, TET12, frequencyOfNote } from "musictheoryjs";

const third = Scale.from("C5", "major").degree(3);
third.frequency; // => ~659.26
third.midi; // => 76
frequencyOfNote(new Note("A4"), TET12, { frequency: 442 }); // => 442
```

## Semitones and Modifiers

The 2.x `Semitone` (0 = C … 11 = B) and `Modifier` (−1 flat, 0 natural,
1 sharp) enums are plain numbers in v3, and numbers are a first-class path
everywhere: transpose by a semitone count, build intervals from semitones,
read `note.pitchClass` and `note.alteration` with the same conventions.

```ts
import { Note, intervalFromSemitones, intervalName } from "musictheoryjs";

new Note("C4").transpose(7).toString(); // => "G4"
intervalName(intervalFromSemitones(7)); // => "P5"
new Note("Bb3").alteration; // => -1
```

## New since 2.x

Things that had no 2.x equivalent at all, if you were working around them:
keys with Roman numerals and progressions ([keys](/guides/keys/)), harmonic
analysis and key detection ([analysis](/guides/analysis/)), MIDI file
read/write and retuning ([MIDI](/guides/midi/)), audio pitch detection and
melody transcription ([audio](/guides/audio/)), rhythm and quantization
([rhythm](/guides/rhythm/)), and ABC/MusicXML export
([notation](/guides/notation/)).
