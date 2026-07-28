---
title: Tuning & Microtonal
---

This is where MusicTheoryJS goes beyond most theory libraries. 12-tone equal
temperament is the **default**, not an assumption baked into the core. A
`Tuning` maps scale degrees to exact pitches (in cents) and hence to
frequencies — so n-EDO, historical temperaments, Just Intonation, maqam cents
tables, gamelan scales, and Scala files are all ordinary tunings.

## Two ways to address a pitch

- **By spelled note** — a Western `Note`. Meaningful for 12-note-per-octave
  tunings, where each pitch class is one degree. Use `frequencyOfNote`.
- **By degree** — an integer index into the tuning's period. Works for *any*
  tuning (24-EDO, a 7-note maqam, …). Use `frequencyOfDegree` /
  `scaleFromTuning`.

## Equal temperaments

```ts
import { equalTemperament, edo, TET12, frequencyOfNote } from "musictheoryjs";

frequencyOfNote(new Note("A4"));            // 440   (TET12, the default)
frequencyOfNote(new Note("A4"), TET12, { frequency: 432 }); // 432 (custom anchor)

const edo24 = equalTemperament(24); // quarter tones  (`edo` is an alias)
edo24.centsForDegree(1);            // 50
const edo19 = equalTemperament(19); // 19-EDO
```

## Realising a tuning as a scale

`scaleFromTuning` returns one period of a tuning as exact pitches — cents above
the tonic and, anchored to a frequency, real Hz:

```ts
import { scaleFromTuning, equalTemperament } from "musictheoryjs";

scaleFromTuning(equalTemperament(24));
// [{ degree: 0, cents: 0, frequency: 440 }, { degree: 1, cents: 50, … }, …]
```

## Historical Western tunings

Pythagorean, quarter-comma meantone, and 5-limit Just Intonation are provided as
12-note tunings (computed from first principles, not hard-coded):

```ts
import { pythagorean, quarterCommaMeantone, justIntonation } from "musictheoryjs";

pythagorean().centsForDegree(7);          // 701.955  (pure fifth)
quarterCommaMeantone().centsForDegree(4); // 386.31   (pure major third)
justIntonation().centsForDegree(4);       // 386.31   (5/4)

frequencyOfNote(new Note("E4"), justIntonation()); // pure third above C
```

## Custom tunings (maqam, gamelan, xenharmonic)

Define a tuning from an explicit list of cents, from ratios, or from a Scala
file. This is the door to non-Western systems.

```ts
import { centsTuning, ratioTuning, scaleFromTuning } from "musictheoryjs";

// A maqam Rast, as a cents table, anchored so its tonic sounds at 264 Hz
const rast = centsTuning([0, 204, 355, 498, 702, 906, 1057], { name: "Rast" });
scaleFromTuning(rast, { frequency: 264 }, true); // include the closing octave

// A 5-limit major scale from ratios
ratioTuning(["1/1", "9/8", "5/4", "4/3", "3/2", "5/3", "15/8"]);
```

Non-octave periods work too — e.g. a Bohlen–Pierce-style tuning that repeats at
a 3/1 "tritave" (~1902 cents):

```ts
centsTuning([0, 500, 1000], { period: 1901.955 });
```

## Scala (`.scl`) files

Import any of the thousands of tunings in the Scala archive:

```ts
import { scalaTuning } from "musictheoryjs";

const scl = `
! example.scl
Example just major scale
 7
 9/8
 5/4
 4/3
 3/2
 5/3
 15/8
 2/1
`;
const tuning = scalaTuning(scl);
tuning.size;                // 7
tuning.centsForDegree(4);   // 701.955  (the 3/2)
```

Ratios (`3/2`), integers (`2`), and cents (`701.955`) are all recognised, per
the Scala format.

## Turning frequencies back into notes

To go the other way — from a detected/desired frequency to the nearest Western
note — use `Note.fromFrequency` (see [Notes](/guides/notes/)) or the lower-level
`PitchPoint` helpers.
