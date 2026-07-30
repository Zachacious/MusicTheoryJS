---
title: Notes
description: "Create, parse, compare, and transpose correctly-spelled notes, with ranges, sorting, MIDI numbers, and frequencies."
---

A `Note` is an immutable, correctly-spelled pitch: a **letter** (A–G), an
**alteration** (sharps/flats as a signed integer), and an **octave** (scientific
pitch notation, middle C = C4).

## Creating notes

```ts
import { Note, note } from "musictheoryjs";

new Note("C#4");                       // from scientific pitch notation
new Note({ step: 0, alteration: 1 }); // from parts (octave defaults to 4)
note("Eb3");                           // `note(...)` is shorthand for `new Note`

// From a MIDI number or a frequency (great for MIDI/audio input)
Note.fromMidi(60);                     // C4
Note.fromMidi(61, "flat");             // Db4
Note.fromFrequency(440);               // A4  (snaps to nearest 12-TET note)
Note.fromFrequency(442);               // A4  (a little sharp, still A4)
```

Notation supports multiple accidentals and Unicode:

```ts
new Note("F##5"); // double sharp
new Note("Fx5");  // "x" is also double sharp
new Note("Bbb2"); // double flat
new Note("E♭3");  // Unicode flat
new Note("C-1");  // negative octaves are fine
```

## Reading a note

```ts
const n = new Note("Eb4");

n.letter;      // "E"
n.alteration;  // -1
n.octave;      // 4
n.pitchClass;  // 3   (0–11, C = 0)
n.midi;        // 63
n.toString();  // "Eb4"
```

`toString` can render alternative accidentals:

```ts
new Note("F##5").toString({ doubleSharpX: true });  // "Fx5"
new Note("C#4").toString({ unicodeAccidentals: true }); // "C♯4"
new Note("C#4").toString({ octave: false });        // "C#"
```

## Transforming notes (immutably)

Every method returns a **new** note:

```ts
import { Note, PERFECT_FIFTH, interval } from "musictheoryjs";

new Note("C4").sharpen().toString();          // "C#4"
new Note("C4").flatten().toString();          // "Cb4"
new Note("C#4").withOctave(6).toString();     // "C#6"

// Transpose by a spelled interval (keeps correct spelling)
new Note("C4").transpose(PERFECT_FIFTH).toString();     // "G4"
new Note("C4").transpose(interval(4, "d")).toString();  // "Fb4"
```

## Enharmonic respelling

`enharmonic()` respells a note to its simplest equivalent, preserving the
sounding pitch and crossing octave boundaries correctly:

```ts
new Note("E#4").enharmonic().toString();        // "F4"
new Note("Db4").enharmonic("sharp").toString(); // "C#4"
new Note("C#4").enharmonic("flat").toString();  // "Db4"
new Note("B#4").enharmonic().toString();        // "C5"  (octave crosses)
new Note("Cb4").enharmonic().toString();        // "B3"
```

## Comparing notes

There are two distinct notions of equality — this is the whole point of spelled
pitch:

```ts
const eSharp = new Note("E#4");

eSharp.equals("F4");        // false — different spelling
eSharp.isEnharmonic("F4");  // true  — same sounding pitch

// Ordering by pitch height
new Note("C4").compareTo("D4"); // negative (C4 is lower)
new Note("E#4").compareTo("F4"); // 0 (same height)
```

## Frequencies

Frequency depends on a tuning (default 12-TET, A4 = 440 Hz). See
[Tuning & Microtonal](/guides/tuning/) for the details.

```ts
import { Note, frequencyOfNote } from "musictheoryjs";

frequencyOfNote(new Note("A4"));                     // 440
frequencyOfNote(new Note("C4"));                     // 261.6256…
frequencyOfNote(new Note("A4"), undefined, { frequency: 432 }); // 432 (custom A4)
```

## Serialization

A `Note` serializes to its notation string, so it round-trips cleanly through
JSON:

```ts
JSON.stringify({ n: new Note("Eb3") }); // '{"n":"Eb3"}'
```

## Around the circle of fifths

`transposeFifths` moves a note by whole perfect fifths and keeps the spelling
the circle implies. This is how key signatures move, so it stays in the spelled
world rather than collapsing to pitch classes: six fifths up from C is F♯, six
down is G♭ — never each other's enharmonic.

```ts
import { transposeFifths } from "musictheoryjs";

transposeFifths("C4", 1).toString();  // "G4"
transposeFifths("C4", -1).toString(); // "F3"
transposeFifths("C4", 6).toString({ octave: false });  // "F#"
transposeFifths("C4", -6).toString({ octave: false }); // "Gb"
```

The fifths stack literally, so the register climbs with them — two fifths above
C4 is D5, not D4:

```ts
import { transposeFifths } from "musictheoryjs";

transposeFifths("C4", 2).toString();  // "D5"
transposeFifths("C4", -2).toString(); // "Bb2"
```

## Sorting

`sortNotes` orders by sounding pitch, low to high, and returns `Note` instances
whatever you hand it. The input is never mutated.

```ts
import { sortNotes, sortNotesUnique } from "musictheoryjs";

sortNotes(["G4", "C4", "E4"]).map(String);       // ["C4","E4","G4"]
sortNotes(["C4", "G4", "E4"], true).map(String); // ["G4","E4","C4"] — descending
```

`sortNotesUnique` also drops duplicates — but only identical *spellings*. Notes
that merely sound alike stay apart, because C♯4 and D♭4 are different notes:

```ts
import { sortNotesUnique } from "musictheoryjs";

sortNotesUnique(["G4", "C4", "G4"]).map(String); // ["C4","G4"]
sortNotesUnique(["C#4", "Db4"]).length;          // 2 — both kept
```

## Try it live

Edit and run — `log` prints, `play` sounds the notes:

```ts live
const note = new Note("Eb4");
log(note.toString(), "· midi", note.midi, "·", note.frequency.toFixed(2), "Hz");
log("up a fifth:", note.transpose("P5").toString());
play([note, note.transpose("M3"), note.transpose("P5")]);
```
