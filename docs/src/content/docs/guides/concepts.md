---
title: Core concepts
description: The two ideas — spelled pitch, and tuning as a separate layer — that the rest of the API rests on.
---

Two design decisions run through the whole library. Once they click, the rest of
the API stops surprising you.

## Pitch is spelled, not just numbered

A lot of libraries store a note as a number from 0 to 11 plus an octave. That's
called a pitch class, and it's enough to play the right key on a keyboard. But it
throws away the spelling, and the spelling carries real information. `E♯` and `F`
sound the same, yet they aren't the same note: they sit on different scale
degrees, they form different intervals, and they show up in different keys.

MusicTheoryJS stores a note as a letter, an accidental, and an octave, and keeps
those three apart.

```ts
import { Note } from "musictheoryjs";

const eSharp = new Note("E#4");
const f = new Note("F4");

eSharp.isEnharmonic(f); // true   same sounding pitch
eSharp.equals(f);       // false  different note
eSharp.letter;          // "E"
f.letter;               // "F"
```

The payoff is that generated notes read the way you'd write them:

```ts
Scale.from("C4", "major").noteNames();  // C4 D4 E4 F4 G4 A4 B4  (not E# or Fb)
Chord.from("Bdim7").noteNames();        // B4 D5 F5 Ab5          (Ab, not G#)
new Note("C4").transpose(interval(4, "d")).toString(); // "Fb4"  (a diminished 4th)
```

That last one is the tell. A diminished fourth and a major third land on the same
key, but a diminished fourth above C is spelled F♭, and the library knows the
difference.

## Frequency comes from a tuning

Spelling is one question. The frequency a note actually sounds at is a separate
one, and it depends on a tuning. Western music mostly uses twelve-tone equal
temperament, but that's a choice, not a law.

So the library keeps the two apart:

- A `Note` is a spelling.
- A `Tuning` says where each pitch sits, in cents, and therefore what frequency
  it plays at.
- Anything microtonal or non-Western is just a different tuning. It isn't a
  correction applied on top of the Western grid.

```ts
import { Note, frequencyOfNote, pythagorean, justIntonation } from "musictheoryjs";

frequencyOfNote(new Note("A4"));                   // 440  (12-TET, the default)
frequencyOfNote(new Note("E4"), justIntonation()); // a pure major third above C
frequencyOfNote(new Note("G4"), pythagorean());    // a pure fifth, 701.955 cents
```

When you leave twelve notes per octave behind entirely (quarter tones, a maqam,
a gamelan scale), you address a tuning's scale degrees directly instead of
spelling notes. That's covered in [Tuning & microtonal](/guides/tuning/).

## Nothing mutates

Every value is immutable. Operations return a new value and leave the original
alone.

```ts
const c = new Note("C4");
c.sharpen();    // returns a new Note, C#4
c.toString();   // "C4" — c hasn't changed
```

That makes notes and chords safe to hold onto, compare, and cache. Derived data
like the MIDI number, frequency, or name is computed when you ask for it, not
stored on the object.

## A class on top, functions underneath

`Note`, `Scale`, `Chord`, and `Key` are convenient wrappers. Underneath, the
work is done by plain functions, and those are exported too. Reach for them if
you like a functional style or want the smallest possible bundle.

```ts
import { transpose, interval } from "musictheoryjs/interval";
import { spelled } from "musictheoryjs";

transpose(spelled(0, 0, 4), interval(5, "P")); // a SpelledPitch for G4
```

Spelled pitch and a swappable tuning are the whole foundation. The rest of the
guides are mostly vocabulary built on these two ideas.
