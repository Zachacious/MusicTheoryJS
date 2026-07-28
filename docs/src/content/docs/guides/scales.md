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

MusicTheoryJS ships **46** templates, from the church modes to world and
symmetric scales. A selection:

- **Modes** — `major` / `ionian`, `dorian`, `phrygian`, `lydian`, `mixolydian`,
  `aeolian` / `minor`, `locrian`
- **Minor variants** — `harmonicMinor`, `melodicMinor`, `harmonicMajor`
- **Pentatonic & blues** — `majorPentatonic`, `minorPentatonic`, `minorBlues`,
  `majorBlues`
- **Symmetric** — `wholeTone`, `diminished`, `dominantDiminished`, `augmented`,
  `enigmatic`, `prometheus`
- **Jazz** — `bebopDominant`, `bebopMajor`, `acoustic` (lydian dominant),
  `lydianDominant`, `phrygianDominant`, `halfDiminished`
- **World** — `hungarianMinor`, `hungarianMajor`, `gypsyMinor`, `doubleHarmonic`,
  `neapolitanMajor`, `neapolitanMinor`, `romanian`, `persian`, `arabian`,
  `oriental`, `egyptian`, `yo`, `hirajoshi`, `insen`, `iwato`, `kumoi`,
  `chinese`, `pelog`

```ts
import { SCALE_TEMPLATES, isScaleName } from "musictheoryjs";

Object.keys(SCALE_TEMPLATES); // every template name
isScaleName("dorian");        // true
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

## Custom & microtonal scales

Pass your own intervals to build any Western scale, or source a scale from a
**tuning** for microtonal and non-Western material — see
[Tuning & Microtonal](/MusicTheoryJS/guides/tuning/).

```ts
import { Scale, interval } from "musictheoryjs";

// A custom scale from spelled intervals
new Scale("C4", [interval(1, "P"), interval(2, "M"), interval(3, "M")]);
```
