# Core Concepts

Two design ideas run through the whole library. Understanding them makes every
API predictable.

## 1. Pitch is *spelled*, not just numbered

Most simple libraries store a note as a number 0–11 (a "pitch class") plus an
octave. That throws away the note's **spelling** — and spelling is not cosmetic.
`E♯` and `F` sound identical but are different notes: they belong to different
scale degrees, form different intervals, and appear in different keys.

MusicTheoryJS stores a note as a **letter + accidental + octave**:

```ts
import { Note } from "musictheoryjs";

const eSharp = new Note("E#4");
const f = new Note("F4");

eSharp.isEnharmonic(f); // true  — same sounding pitch
eSharp.equals(f);       // false — different spelling
eSharp.letter;          // "E"
f.letter;               // "F"
```

Because spelling is preserved, results come out the way a musician would write
them:

```ts
Scale.from("C4", "major").noteNames();  // C4 D4 E4 F4 G4 A4 B4  (not E# / Fb)
Chord.from("Bdim7").noteNames();        // B4 D5 F5 Ab5          (Ab, not G#)
new Note("C4").transpose(interval(4, "d")).toString(); // "Fb4" (dim 4th, not E)
```

## 2. Frequency comes from a *tuning*, and 12-TET is just the default

A note's spelling is one thing; the actual **frequency** it sounds at is another,
and that depends on a **tuning system**. Standard Western music uses 12-tone
equal temperament (12-TET), but that's one choice among many.

The library separates these concerns:

- A **`Note`** is a Western spelling.
- A **`Tuning`** maps pitches to exact positions (in cents) and hence to
  frequencies.
- Everything microtonal or non-Western is expressed as an ordinary tuning —
  never as a "deviation" bolted onto the Western grid.

```ts
import { Note, frequencyOfNote, pythagorean, justIntonation } from "musictheoryjs";

frequencyOfNote(new Note("A4"));               // 440   (12-TET, the default)
frequencyOfNote(new Note("E4"), justIntonation()); // pure major third above C
frequencyOfNote(new Note("G4"), pythagorean());    // pure fifth (701.955¢)
```

For genuinely non-12 systems (quarter tones, maqam, gamelan), you work with a
tuning's **scale degrees** directly — see [Tuning & Microtonal](/guide/tuning).

## Everything is immutable

No object ever mutates. Operations return **new** values:

```ts
const c = new Note("C4");
c.sharpen();       // returns a new Note (C#4)
c.toString();      // still "C4" — the original is unchanged
```

This makes values safe to share, cache, and reason about. Derived data (MIDI
number, frequency, name) is **computed on demand**, never stored on the object.

## Functional core, fluent surface

The ergonomic classes (`Note`, `Scale`, `Chord`, `Key`) are thin wrappers over
pure functions. If you prefer a purely functional style — or want the smallest
possible bundle — the underlying functions are exported too:

```ts
import { transpose, intervalBetween, interval } from "musictheoryjs/interval";
import { spelled } from "musictheoryjs";

const g = transpose(spelled(0, 0, 4), interval(5, "P")); // SpelledPitch for G4
```

With those two ideas — **spelled pitch** and **tuning-agnostic frequency** — the
rest of the guide is just vocabulary.
