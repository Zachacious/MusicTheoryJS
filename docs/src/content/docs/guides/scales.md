---
title: Scales
---

A `Scale` is a tonic plus an ordered set of intervals. Because those intervals
are *spelled*, the generated notes come out with the right letters and
accidentals — a C-major scale is `C D E F G A B`, and a C-lydian scale uses `F♯`,
never `G♭`.

## Building a scale

```ts
import { Scale } from "musictheoryjs";

Scale.from("C4", "major").noteNames();
// ["C4", "D4", "E4", "F4", "G4", "A4", "B4"]

Scale.from("D4", "dorian").noteNames();
// ["D4", "E4", "F4", "G4", "A4", "B4", "C5"]

Scale.from("Bb3", "major").noteNames();
// ["Bb3", "C4", "D4", "Eb4", "F4", "G4", "A4"]  — keeps flats
```

## Degrees, membership, and notes

```ts
const cMajor = Scale.from("C4", "major");

cMajor.notes;          // Note[] within the tonic's octave
cMajor.noteNames();    // string[]
cMajor.size;           // 7

// Degrees are 1-based and wrap across octaves
cMajor.degree(1).toString(); // "C4"
cMajor.degree(3).toString(); // "E4"
cMajor.degree(8).toString(); // "C5"  (tonic, one octave up)
cMajor.degree(0).toString(); // "B3"  (wraps below)

// Membership is octave-agnostic and enharmonic-aware
cMajor.contains("E5");  // true
cMajor.contains("F#4"); // false
cMajor.contains("Fb4"); // true  (Fb = E, which is in C major)
```

## Built-in scale templates

MusicTheoryJS ships **92** scales, defined once in a single dictionary that
also drives detection and name parsing. Most have aliases — spaced spellings
(`"melodic minor"`), traditional names (`gypsyMinor` for `hungarianMinor`),
and reference names (`"dorian b2"`) all resolve to the same template. A
selection by family:

- **Modes** — `major` / `ionian`, `dorian`, `phrygian`, `lydian`, `mixolydian`,
  `aeolian` / `minor`, `locrian`
- **Minor variants and their modes** — `harmonicMinor`, `melodicMinor`,
  `harmonicMajor`, `dorianb2`, `lydianAugmented`, `lydianDominant`
  (`acoustic`), `mixolydianb6`, `halfDiminished`, `altered` (super locrian),
  `locrian6`, `majorAugmented`, `romanian`, `lydians2`, `lydianDiminished`,
  `ultralocrian`, `phrygianDominant`
- **Pentatonic** — `majorPentatonic`, `minorPentatonic`, `ionianPentatonic`,
  `mixolydianPentatonic`, `locrianPentatonic`, `minorSixPentatonic`,
  `scriabin`, `egyptian`, `yo`, `hirajoshi`, `insen`, `iwato`, `kumoi`,
  `kumoijoshi`, `vietnamese`, `malkosRaga`, `pelog`, and more
- **Blues** — `minorBlues`, `majorBlues`, `compositeBlues`
- **Hexatonic & symmetric** — `wholeTone`, `augmented`, `prometheus`,
  `prometheusNeapolitan`, `minorHexatonic`, `piongio`, `sixToneSymmetric`,
  `messiaen5`, `enigmatic`
- **Heptatonic exotics** — `doubleHarmonic`, `doubleHarmonicLydian`,
  `hungarianMinor`, `hungarianMajor`, `neapolitanMajor`, `neapolitanMinor`,
  `persian`, `arabian`, `oriental`, `flamenco`, `todiRaga`, `lydianMinor`,
  `leadingWholeTone`
- **Octatonic and larger** — `diminished`, `dominantDiminished`,
  `bebopDominant`, `bebopMajor`, `bebopMinor`, `bebopHarmonicMinor`,
  `bebopLocrian`, `minorSixDiminished`, `ichikosucho`, `kafiRaga`,
  `purviRaga`, the remaining Messiaen modes, and `chromatic`

```ts
import { SCALE_TEMPLATES, SCALE_DEFINITIONS, isScaleName, Scale } from "musictheoryjs";

Object.keys(SCALE_TEMPLATES);      // every name and alias
SCALE_DEFINITIONS.length;          // 92 (one entry per scale)
isScaleName("dorian");             // true
Scale.from("C4 melodic minor");    // spaced aliases parse too
```

## Modes

Any scale's modes are its rotations — each degree treated as a new tonic:

```ts
import { Scale, mode, modes } from "musictheoryjs";

mode(Scale.from("C4", "major"), 2).noteNames();
// D dorian: ["D4","E4","F4","G4","A4","B4","C5"]

modes(Scale.from("C4", "major")).map((m) => m.tonic.letter);
// ["C","D","E","F","G","A","B"]  — all seven modes
```

## Detecting scales from notes

Given a set of notes, find every known scale that fits (matching is by
pitch-class set, so the white keys match C major, A minor, and the other modes):

```ts
import { detectScales } from "musictheoryjs";

detectScales(["C4", "D4", "E4", "F4", "G4", "A4", "B4"]);
// [{ tonic: C, name: "major" }, { tonic: A, name: "minor" }, { tonic: D, name: "dorian" }, …]

detectScales(["C4", "D4", "E4", "G4", "A4"]);
// includes { tonic: C, name: "majorPentatonic" }
```

Exact matching requires the scale to equal the input's pitch-class set. Ask
for **subset** matching to find every scale that merely *contains* the notes —
"which scales can I play over these?" — including scales rooted on a tonic
you never played. Matching runs on 12-bit pitch-class masks, so each
candidate is a couple of integer operations:

```ts
import { detectScales, scalesContaining } from "musictheoryjs";

scalesContaining(["D4", "F4", "G4"]);
// smallest scales first; includes { tonic: C, name: "major" } — no C was played

detectScales(["C4", "Eb4", "G4"], { match: "subset", prefer: "flat" });
// the same query in long form; `prefer` spells tonics the input didn't sound
```

## Custom & microtonal scales

Pass your own intervals to build any Western scale, or source a scale from a
**tuning** for microtonal and non-Western material — see
[Tuning & Microtonal](/guides/tuning/).

```ts
import { Scale, interval } from "musictheoryjs";

// A custom scale from spelled intervals
new Scale("C4", [interval(1, "P"), interval(2, "M"), interval(3, "M")]);
```
