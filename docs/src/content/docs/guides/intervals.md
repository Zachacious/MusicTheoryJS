---
title: Intervals & Transposition
---

An interval is the distance between two pitches. MusicTheoryJS models it with
**two independent facts**: how many *diatonic steps* it spans (which letters it
moves through) and how many *semitones* it spans (how it sounds). Keeping both is
what makes transposition spell correctly.

## Building intervals

```ts
import { interval } from "musictheoryjs";

interval(5, "P"); // perfect fifth
interval(3, "M"); // major third
interval(3, "m"); // minor third
interval(4, "A"); // augmented fourth
interval(5, "d"); // diminished fifth
interval(9, "M"); // compound: major ninth
interval(5, "A", 2); // doubly augmented fifth
```

Qualities are `"P"` (perfect), `"M"` (major), `"m"` (minor), `"A"` (augmented),
`"d"` (diminished). The optional third argument stacks augmentations or
diminutions.

### Named constants

The common intervals are exported directly (tree-shakable):

```ts
import {
  PERFECT_UNISON, MINOR_SECOND, MAJOR_SECOND, MINOR_THIRD, MAJOR_THIRD,
  PERFECT_FOURTH, AUGMENTED_FOURTH, DIMINISHED_FIFTH, PERFECT_FIFTH,
  MINOR_SIXTH, MAJOR_SIXTH, MINOR_SEVENTH, MAJOR_SEVENTH, PERFECT_OCTAVE,
} from "musictheoryjs";
```

## Naming and inspecting

```ts
import { interval, intervalName, intervalNumber, intervalQuality } from "musictheoryjs";

intervalName(interval(5, "P"));  // "P5"
intervalName(interval(3, "m"));  // "m3"
intervalName(interval(4, "A"));  // "A4"
intervalName(interval(5, "A", 2)); // "AA5"

intervalNumber(interval(9, "M")); // 9
intervalQuality(interval(4, "A")); // { quality: "A", count: 1 }
```

The augmented fourth and diminished fifth sound the same but are different
intervals — and the library keeps them apart:

```ts
interval(4, "A"); // { steps: 3, semitones: 6 }
interval(5, "d"); // { steps: 4, semitones: 6 }
```

## The interval between two notes

```ts
import { Note } from "musictheoryjs";

new Note("C4").intervalTo("G4"); // { steps: 4, semitones: 7 } → P5
new Note("C4").intervalTo("E4"); // major third

// Spelling matters: C→Fb is a diminished fourth, not a major third
import { intervalBetween, intervalName } from "musictheoryjs";
intervalName(intervalBetween(new Note("C4"), new Note("Fb4"))); // "d4"
```

## Transposition preserves spelling

Transposing a note by a *spelled* interval produces the correctly spelled
result. The new letter comes from the diatonic step count; the accidental is
whatever makes the sound come out right.

```ts
import { Note, interval } from "musictheoryjs";

new Note("C4").transpose(interval(5, "P")).toString(); // "G4"
new Note("C4").transpose(interval(3, "M")).toString(); // "E4"
new Note("C4").transpose(interval(4, "d")).toString(); // "Fb4" (not E4!)
new Note("B4").transpose(interval(2, "m")).toString(); // "C5"  (octave carries)
```

## Combining intervals

```ts
import { interval, addIntervals, negateInterval, intervalName } from "musictheoryjs";

intervalName(addIntervals(interval(3, "M"), interval(3, "m"))); // "P5"  (M3 + m3)

// Transpose downward by negating an interval
const down5 = negateInterval(interval(5, "P"));
new Note("C4").transpose(down5).toString(); // "F3"
```

## Subtracting, simplifying, inverting

Subtraction is the exact inverse of the addition above — the interval that,
added back, returns the original.

```ts
import { subtractIntervals, parseInterval, intervalName } from "musictheoryjs";

intervalName(subtractIntervals(parseInterval("P5"), parseInterval("M3"))); // "m3"
intervalName(subtractIntervals(parseInterval("P8"), parseInterval("P5"))); // "P4"
```

**Simplifying** reduces a compound interval to its simple equivalent, within one
octave. The octave itself stays an octave — it is the boundary, not a compound
unison — and direction is preserved:

```ts
import { simplifyInterval, parseInterval, intervalName } from "musictheoryjs";

intervalName(simplifyInterval(parseInterval("M9")));   // "M2"
intervalName(simplifyInterval(parseInterval("M10")));  // "M3"
intervalName(simplifyInterval(parseInterval("P15")));  // "P8", not "P1"
```

**Inverting** gives the interval that completes it to a perfect octave. Major
and minor swap, augmented and diminished swap, perfect stays perfect:

```ts
import { invertInterval, parseInterval, intervalName } from "musictheoryjs";

intervalName(invertInterval(parseInterval("M3"))); // "m6"
intervalName(invertInterval(parseInterval("P5"))); // "P4"
intervalName(invertInterval(parseInterval("A4"))); // "d5"
intervalName(invertInterval(parseInterval("P1"))); // "P8"
```

Inverting twice returns what you started with, and an interval plus its
inversion always spans exactly an octave — properties the test suite holds in
place.

## Around the circle of fifths

`intervalFifths` stacks perfect fifths literally, so the result is compound once
it passes an octave. Pair it with `simplifyInterval` when you want the reduced
form:

```ts
import { intervalFifths, simplifyInterval, intervalName } from "musictheoryjs";

intervalName(intervalFifths(1));                    // "P5"
intervalName(intervalFifths(2));                    // "M9" — two fifths, literally
intervalName(simplifyInterval(intervalFifths(2)));  // "M2"
intervalName(intervalFifths(-1));                   // "-P5"
```

For the note-level version — which keeps the circle's spelling, so six fifths up
from C is F♯ and six down is G♭ — see
[`transposeFifths`](/guides/notes/).

`INTERVAL_NAMES` lists every simple interval within an octave, ascending, which
is handy for building pickers and ear-training drills:

```ts
import { INTERVAL_NAMES } from "musictheoryjs";

INTERVAL_NAMES.length; // 13 — unison through octave
INTERVAL_NAMES[7];     // "P5"
```

## Try it live

```ts live
const fifth = parseInterval("P5");
log(new Note("C4").transpose(fifth).toString());
log(intervalName(intervalFromSemitones(10)));
play(["C4", new Note("C4").transpose(fifth)]);
```
