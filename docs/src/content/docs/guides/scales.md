---
title: Scales
description: "Build any of 92 scale types, walk modes and their relations, detect scales from notes, and match scales to chords."
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

## Diatonic chords of any scale

Stack alternating degrees on each step of *any* template — not just major
and minor — and get correctly spelled chords with detected qualities:

```ts
import { scaleChord, scaleChords } from "musictheoryjs";

scaleChords("C4 major").map(String);
// ["C", "Dm", "Em", "F", "G", "Am", "Bdim"]

scaleChords("C4 melodicMinor", { seventh: true }).map(String);
// ["CmMaj7", "Dm7", "Ebmaj7#5", "F7", "G7", "Am7b5", "Bm7b5"]

scaleChord("C4 harmonicMajor", 6, { seventh: true }).toString(); // "Abmaj7#5"
```

A chord whose tones match no known quality still builds — it just prints its
note names instead of a symbol.

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

## Chord-scale matching

Which scales can you play over a chord? `chordScales` ranks every scale
(rooted on the chord's root) that contains the chord, with **avoid-note
awareness** — a scale tone a half step above a chord tone is penalized, so
the rankings match jazz practice:

```ts
import { chordScales } from "musictheoryjs";

chordScales("Dm7")[0]?.scale.name;   // "dorian"          (avoid-free)
chordScales("Cmaj7")[0]?.scale.name; // "lydian"          (major carries the F avoid note)
chordScales("G7")[0]?.scale.name;    // "lydianDominant"
chordScales("Bm7b5")[0]?.scale.name; // "halfDiminished"  (locrian ♮2)

const major = chordScales("Cmaj7", { maxResults: 20 })
  .find((m) => m.scale.name === "major");
major?.avoidNotes.map((n) => n.toString({ octave: false })); // ["F"]
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

## Wider and narrower scales

Every scale sits inside larger ones and contains smaller ones. `scaleSupersets`
answers "what could I widen this into without losing a note?", and
`scaleSubsets` the reverse. Both compare rooted on the same tonic and never list
the scale itself.

```ts
import { scaleSupersets, scaleSubsets } from "musictheoryjs";

scaleSupersets("major"); // ["bebopDominant", "bebopMajor", "ichikosucho", "chromatic"]
scaleSubsets("major");   // ["majorPentatonic", "ionianPentatonic", "yo", …]
```

Subsets come back smallest first, which makes the first entry the most
economical choice — useful when simplifying a line for a beginner, or picking a
safe pentatonic to solo with over a modal vamp.

## Relating modes

Two scales that are rotations of one parent have a distance: how far the second
mode's tonic sits from the first's when both share a key signature.
`modeDistance` reports it the way musicians name it, in whichever direction is
nearer.

```ts
import { modeDistance, intervalName } from "musictheoryjs";

intervalName(modeDistance("major", "dorian")); // "M2"
intervalName(modeDistance("dorian", "major")); // "-M2" — down, not up a seventh
intervalName(modeDistance("major", "minor"));  // "-m3" — C major to A minor
```

`relativeTonic` answers the practical version: given a tonic for one mode, which
tonic gives the other the same notes?

```ts
import { relativeTonic } from "musictheoryjs";

relativeTonic("major", "dorian", "C4").toString({ octave: false }); // "D"
relativeTonic("major", "minor", "C4").toString({ octave: false });  // "A"
relativeTonic("dorian", "major", "D4").toString({ octave: false }); // "C"
```

Scales that are not modes of one another throw rather than returning a
misleading answer — major and harmonic minor have no such relationship.

## Splitting a scale name

`tokenizeScaleName` separates a tonic from a template without validating either,
which is what you want while a user is still typing. Templates can be
multi-word, and the tonic is optional, so it resolves the ambiguity by checking
which prefix actually reads as a note.

```ts
import { tokenizeScaleName } from "musictheoryjs";

tokenizeScaleName("C major");           // ["C", "major"]
tokenizeScaleName("C4 melodic minor");  // ["C4", "melodic minor"]
tokenizeScaleName("dorian");            // ["", "dorian"]
```

## Try it live

```ts live
const scale = Scale.from("A3", "harmonicMinor");
log(scale.noteNames());
log("3rd degree:", scale.degree(3).toString());
play(scale);
```
