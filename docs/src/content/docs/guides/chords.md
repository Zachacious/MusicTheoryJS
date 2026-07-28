---
title: Chords
---

A `Chord` is a root plus a set of spelled intervals. Chords can be built from a
symbol, from a root and a quality, or from arbitrary intervals — and their tones
always spell correctly.

## Creating chords

```ts
import { Chord, chord } from "musictheoryjs";

Chord.from("Cmaj7");         // parse a chord symbol (root octave defaults to 4)
Chord.of("C4", "min7");      // root note + canonical quality
chord("F#m7b5");             // `chord(...)` is shorthand for `Chord.from`

Chord.from("Cmaj7").noteNames(); // ["C4", "E4", "G4", "B4"]
Chord.from("Bdim7").noteNames();  // ["B4", "D5", "F5", "Ab5"]  (Ab, not G#)
Chord.of("D4", "min7").noteNames(); // ["D4", "F4", "A4", "C5"]
```

## Chord symbols

Parsing accepts common aliases and accidental roots:

```ts
Chord.from("C");       // C major
Chord.from("Cm");      // C minor  ("min", "-" also work)
Chord.from("CM7");     // C major 7 ("maj7", "Δ" also work)
Chord.from("C7");      // C dominant 7
Chord.from("Cm7b5");   // half-diminished ("ø" also works)
Chord.from("F#dim7");
Chord.from("Bb13");
```

MusicTheoryJS ships **32** chord qualities: triads (`maj`, `min`, `dim`, `aug`,
`sus2`, `sus4`, `power`), sixths (`maj6`, `min6`, `maj69`, `min69`), sevenths
(`dom7`, `maj7`, `min7`, `minMaj7`, `dim7`, `min7b5`, `aug7`, `dom7b5`), altered
dominants (`dom7b9`, `dom7s9`, `dom7s11`), ninths (`dom9`, `maj9`, `min9`,
`add9`), elevenths (`dom11`, `maj11`, `min11`), and thirteenths (`dom13`,
`maj13`, `min13`).

```ts
import { CHORD_TEMPLATES, parseChordSymbol } from "musictheoryjs";

Object.keys(CHORD_TEMPLATES);      // every quality
parseChordSymbol("F#m7").quality;  // "min7"
```

## Inspecting quality

```ts
const c = Chord.from("Cm");

c.isMajor();      // false
c.isMinor();      // true
c.isDiminished(); // false
c.isAugmented();  // false
c.quality;        // "min"
c.root;           // Note C4
c.notes;          // Note[]
c.toString();     // "Cm"
```

## Inversions

`invert()` moves the lowest tone up an octave (immutably):

```ts
Chord.from("C").invert().noteNames(); // ["E4", "G4", "C5"]
Chord.from("C").invert().invert().noteNames(); // ["G4", "C5", "E5"]
```

## Voicings

Rearrange chord tones across octaves without changing which notes are present:

```ts
import { Chord, closeVoicing, drop2, drop3, spread } from "musictheoryjs";

const c = Chord.from("Cmaj7"); // C4 E4 G4 B4

closeVoicing(c).map(String); // ["C4","E4","G4","B4"]
drop2(c).map(String);        // ["G3","C4","E4","B4"]  (2nd-from-top down an octave)
drop3(c).map(String);        // ["E3","C4","G4","B4"]
spread(c).map(String);       // widened across octaves
```

## Detecting a chord from notes

The inverse of building from a symbol — identify the chord a set of notes forms.
Every note is tried as a potential root, preferring the lowest as the bass:

```ts
import { detectChord } from "musictheoryjs";

detectChord(["C4", "E4", "G4"])?.toString();        // "C"
detectChord(["C4", "Eb4", "G4"])?.toString();       // "Cm"
detectChord(["G4", "B4", "D5", "F5"])?.toString();  // "G7"
detectChord(["E4", "G#4", "C5"])?.root.letter;      // "C" (aug, roots on bass)
```

Feed a detected chord into a [`Key`](/MusicTheoryJS/guides/keys/) to get its Roman numeral, or
segment a whole performance into a chord timeline — see
[Analysis](/MusicTheoryJS/guides/analysis/).
