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

## Presets: maqamat, ragas, gamelan

Common non-Western systems ship as presets — each an ordinary `Tuning`:

```ts
import { maqamTuning, ragaTuning, slendro, pelog, scaleFromTuning } from "musictheoryjs";

maqamTuning("rast").centsForDegree(2);   // 350 — the neutral third
ragaTuning("bhairav");                    // thaat as 5-limit just ratios
slendro();                                // five near-equal gamelan steps
scaleFromTuning(pelog(), { frequency: 275 }, true);
```

The maqam tables are theoretical quarter-tone values, the ragas 5-limit
ratios by thaat, and the gamelan sets averages of published measurements —
representative starting points, since real intonation varies by region,
gharana, and ensemble. When you have an instrument's own numbers, feed them to
`centsTuning`.

## Tempered versus just

`compareTunings` lines two tunings up degree by degree; `justDeviations` is
the classic table of what a temperament trades against pure ratios:

```ts
import { justDeviations, compareTunings, pythagorean, justIntonation } from "musictheoryjs";

justDeviations()[4].difference;   //  13.69 — 12-TET's major third runs sharp
justDeviations()[7].difference;   //  -1.96 — its fifth is barely flat
compareTunings(pythagorean(), justIntonation())[4].difference; // 21.51, the syntonic comma
```

To *hear* a tuning applied to real material, `retuneMidi` bends every note of
a MIDI file into it — see the [MIDI guide](/guides/midi/).

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

## Tunings by name

Passing a `Tuning` object around is the direct route and always works. But an
app that lets a user *choose* a tuning — a settings menu, a preset list, a saved
project — needs to store that choice as a string and resolve it later. Every
tuning that ships is registered under a name, so that works with no setup:

```ts
import { frequencyOfNote, parseNote, getTuning, tuningNames } from "musictheoryjs";

frequencyOfNote(parseNote("C4"), "Just");        // 264 — a pure C
frequencyOfNote(parseNote("C4"), "Pythagorean"); // 260.74
frequencyOfNote(parseNote("C4"));                // 261.63 — 12-TET default

getTuning("24-EDO").size;   // 24
tuningNames().length;       // 34 built in
```

Names are matched without regard to case or surrounding space, so `"24-edo"`
and `"24-EDO"` are the same tuning. A name works anywhere a tuning object does —
`frequencyOfNote`, `frequencyOfDegree`, `noteCents`, `degreeCents` — and gives
an identical result:

```ts
import { frequencyOfNote, parseNote, justIntonation } from "musictheoryjs";

frequencyOfNote(parseNote("E4"), "Just") ===
  frequencyOfNote(parseNote("E4"), justIntonation()); // true
```

A typo throws with the closest matches rather than silently falling back to
12-TET, which would be a wrong answer that sounds almost right:

```ts
import { getTuning, tryGetTuning } from "musictheoryjs";

getTuning("24-ED");        // throws: unknown tuning "24-ED"; did you mean 24-EDO?
tryGetTuning("nope");      // null — the non-throwing form
```

### Registering your own

`registerTuning` adds a tuning under a name, after which it resolves like any
built-in. `tuningNames()` returns the names as written, which is what you want
for a picker.

```ts
import { registerTuning, getTuning, centsTuning, tuningNames } from "musictheoryjs";

const bohlenPierce = centsTuning([0, 146, 293, 439, 585, 732, 878, 1024, 1170], {
  name: "Bohlen-Pierce",
  period: 1902,  // a tritave, not an octave
});

registerTuning("bp", bohlenPierce);
getTuning("bp").period;            // 1902
tuningNames().includes("bp");      // true
```

As with the [chord and scale dictionaries](/guides/extending/), a duplicate name
is refused rather than silently replacing — a tuning quietly changing underneath
a program would alter what every note sounds like. Remove it first to replace it
deliberately, and `resetTunings()` restores the built-ins:

```ts
import { registerTuning, removeTuning, resetTunings, equalTemperament, getTuning } from "musictheoryjs";

registerTuning("12-TET", equalTemperament(19)); // throws — already registered

removeTuning("12-TET");
registerTuning("12-TET", equalTemperament(19)); // deliberate override
getTuning("12-TET").size;                        // 19

resetTunings();                                  // back to the shipped set
```

If you cache anything derived from the registry, watch `tuningRegistryVersion()`
— it changes on every register, remove, and reset.

## Try it live

Hear a maqam's neutral third — something 12-TET can't play:

```ts live
const rast = maqamTuning("rast");
log("degree cents:", scaleFromTuning(rast).map((d) => d.cents));
log("12-TET third vs just:", justDeviations()[4].difference.toFixed(2), "cents");
play(scaleFromTuning(rast, { frequency: 264 }, true));
```
