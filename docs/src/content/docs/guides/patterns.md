---
title: Rhythm Patterns
description: "Generate rhythm patterns: Euclidean grooves, rotations, hex patterns, and seeded random rhythms mapped onto onsets."
---

A rhythm pattern is an onset grid: a flat array of `1`s (a note starts here) and
`0`s (it does not), one slot per step of an even grid.

```ts
import { euclideanRhythm } from "musictheoryjs";

euclideanRhythm(8, 3); // [1, 0, 0, 1, 0, 0, 1, 0]
```

That representation is deliberately dumb. It carries no tempo, no meter, and no
durations, which is exactly what lets the same array drive a drum machine, a
MIDI track, an arpeggiator, or a meter from the [rhythm module](/guides/rhythm/).
Patterns are plain arrays — `map`, `filter`, and `concat` all work.

## Euclidean rhythms

Spread `k` onsets as evenly as possible across `n` steps and you get a
Euclidean rhythm. It is one function with two integers, and it produces a
startling number of the rhythms people actually play:

```ts
import { euclideanRhythm } from "musictheoryjs";

euclideanRhythm(8, 3);  // [1,0,0,1,0,0,1,0]  tresillo — Latin, West African
euclideanRhythm(8, 5);  // [1,0,1,0,1,1,0,1]  cinquillo
euclideanRhythm(4, 3);  // [1,0,1,1]          cumbia / calypso
euclideanRhythm(12, 7); // [1,0,1,0,1,0,1,1,0,1,0,1]  West African bell pattern
```

The evenness is the whole idea: the gaps between onsets never differ by more
than one step. That is what makes these patterns feel balanced rather than
arbitrary, and it holds for every `n` and `k`.

Edges behave the way you would want rather than throwing:

```ts
import { euclideanRhythm } from "musictheoryjs";

euclideanRhythm(4, 4);  // [1,1,1,1] — saturated
euclideanRhythm(4, 9);  // [1,1,1,1] — more pulses than steps, still saturated
euclideanRhythm(4, 0);  // [0,0,0,0] — silence
```

## Rotation changes the groove

Rotating a pattern keeps its onsets and moves where the cycle begins. Many
named rhythms are rotations of one another — the son and rumba claves being the
famous pair — so rotation is how you explore a family rather than a single
pattern.

```ts
import { euclideanRhythm, rotateRhythm } from "musictheoryjs";

const tresillo = euclideanRhythm(8, 3);   // [1,0,0,1,0,0,1,0]
rotateRhythm(tresillo, 2);                // [0,1,0,0,1,0,1,0]
rotateRhythm(tresillo, -1);               // [0,1,0,0,1,0,0,1]
```

Positive counts rotate left, negative right, and any count wraps — so
`rotateRhythm(pattern, 8)` on an eight-step grid gives the pattern back.

## Onsets, gaps, and hex

The grid is one of three views of the same rhythm, and you can move between
them freely.

**Onset indices** are what a sequencer usually wants — which steps fire:

```ts
import { euclideanRhythm, rhythmToOnsets } from "musictheoryjs";

rhythmToOnsets(euclideanRhythm(16, 5)); // [0, 4, 7, 10, 13] — Bossa Nova clave
```

**Inter-onset gaps** are how a drummer counts a pattern aloud — how many steps
each note lasts before the next begins:

```ts
import { rhythmFromOnsets } from "musictheoryjs";

rhythmFromOnsets(1, 2, 1); // [1,0,1,0,0,1,0]
```

**Hex shorthand** is what drum-machine patch formats store. Each hex digit is
four steps, most significant bit first:

```ts
import { rhythmFromHex, rhythmToHex, euclideanRhythm } from "musictheoryjs";

rhythmFromHex("8f");                    // [1,0,0,0,1,1,1,1]
rhythmToHex(euclideanRhythm(16, 5));    // "8924"
rhythmToHex(rhythmFromHex("a4"));       // "a4" — round-trips
```

Grids shorter than a multiple of four are padded with rests when encoding, since
each digit has to cover four steps.

## Generative patterns

Two generators cover most procedural work. Both take an optional random source —
any function returning a number in `[0, 1)` — so a seeded generator makes the
result reproducible, which matters when a user wants to save a "random" pattern
and get the same one back.

`randomRhythm` fills a grid at a given density:

```ts
import { randomRhythm } from "musictheoryjs";

randomRhythm(16, 0.25);            // sparse, different every call
randomRhythm(16, 1);               // every step — density 1 is a certainty
randomRhythm(8, 0.5, () => 0.4);   // deterministic with a fixed source
```

`weightedRhythm` takes a probability per step, so you can fix the parts you care
about and let the rest vary. Weights of exactly `1` and `0` are certainties:

```ts
import { weightedRhythm } from "musictheoryjs";

// Downbeat and backbeat always, the offbeats sometimes.
weightedRhythm([1, 0.15, 0.3, 0.15, 1, 0.15, 0.3, 0.15]);
```

That shape — certainties on the pulse, probabilities in between — is the usual
way to get variation that still sounds intentional.

## Putting a pattern in time

A pattern says *where*, not *when*. To sound it, decide what one step is worth
and multiply. With the [rhythm module](/guides/rhythm/) that is a duration; with
[MIDI](/guides/midi/) it is a tick count.

```ts
import { euclideanRhythm, rhythmToOnsets, durationTicks } from "musictheoryjs";

// One step = a sixteenth note.
const step = durationTicks("16");                  // 120 ticks at the default 480 PPQ
const hits = rhythmToOnsets(euclideanRhythm(16, 5)).map((i) => i * step);
// [0, 480, 840, 1200, 1560]
```

Pair the same onsets with pitches and you have an arpeggiator: walk a scale or
chord with `Scale#degree` while the pattern decides the timing.

## Use cases

**A drum machine.** One pattern per voice, all on the same grid. Euclidean
patterns with different `k` over the same `n` lock together automatically,
because they share the cycle.

```ts
import { euclideanRhythm, rotateRhythm } from "musictheoryjs";

const kick = euclideanRhythm(16, 4);                   // four on the floor
const snare = rotateRhythm(euclideanRhythm(16, 2), 4); // backbeat
const hat = euclideanRhythm(16, 11);                   // busy top end
```

**Polyrhythm.** Grids of different lengths played together drift in and out of
phase over a predictable cycle — they realign after the least common multiple of
their lengths.

```ts
import { euclideanRhythm } from "musictheoryjs";

const three = euclideanRhythm(3, 2); // realigns with `four` every 12 steps
const four = euclideanRhythm(4, 3);
```

**Humanizing a fixed part.** Keep the structural hits certain and let the
ornaments vary per bar with `weightedRhythm`, so no two bars are identical but
the groove never moves.

**Generating études.** Pair a random or Euclidean pattern with a scale to
produce reading exercises that are rhythmically varied but harmonically fixed.

## Try it

```ts live
const tresillo = euclideanRhythm(8, 3);
log("tresillo  ", tresillo.join(""));
log("onsets    ", rhythmToOnsets(tresillo));
log("rotated 2 ", rotateRhythm(tresillo, 2).join(""));
log("clave hex ", rhythmToHex(euclideanRhythm(16, 5)));
log("cinquillo ", euclideanRhythm(8, 5).join(""));
```
