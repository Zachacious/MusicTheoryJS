---
title: Custom Chords & Scales
description: "Register custom chord qualities and scale types at runtime; parsing, detection, and naming all adopt them."
---

The 108 chord qualities and 92 scale templates that ship with the library are a
starting point, not a ceiling. Register your own at runtime and the rest of the
library treats it as native — building, symbol parsing, printing, detection,
chord-scale matching, and Roman numerals all pick it up immediately.

```ts
import { addChordType, Chord } from "musictheoryjs";

addChordType("so4", "P1 P4 P5 M9", { suffix: "so4", aliases: ["sowhat"] });

Chord.from("Cso4").noteNames();  // ["C4", "F4", "G4", "D5"]
Chord.from("Csowhat").toString(); // "Cso4"
Chord.from("Fso4").noteNames();  // ["F4", "Bb4", "C5", "G5"]
```

Nothing needs forking to teach the library a chord.

## Adding a chord quality

`addChordType(name, intervals, options)` takes a canonical name, the intervals
above the root, and optionally a display suffix and aliases.

```ts
import { addChordType, Chord } from "musictheoryjs";

addChordType("maj7s11add13", "P1 M3 P5 M7 A11 M13", {
  suffix: "maj7#11add13",
});

Chord.of("C4", "maj7s11add13").noteNames();
// ["C4", "E4", "G4", "B4", "F#5", "A5"]
```

The three pieces play distinct roles:

- **`name`** is canonical. It is what `Chord#quality` reports and what you pass
  to `Chord.of`.
- **`suffix`** is what `toString` prints. Leave it out and the canonical name is
  used. This is why `so4` above prints as `Cso4` rather than something derived.
- **`aliases`** are extra spellings the symbol parser accepts. Musicians write
  the same chord several ways; list every form you want to read.

Spelling the intervals is what keeps generated notes named correctly. `A11`
above C is `F#`, not `Gb`, because the interval carries its diatonic step. If
you only know the chord as semitone offsets, pass numbers and a conventional
spelling is chosen for you:

```ts
import { addScaleType, Scale } from "musictheoryjs";

addScaleType("blues6", [0, 3, 5, 6, 7, 10]);
Scale.from("C4", "blues6").noteNames();
// ["C4", "Eb4", "F4", "F#4", "G4", "Bb4"]
```

## Adding a scale template

`addScaleType` mirrors it, minus the suffix — scales have no symbol to print.

```ts
import { addScaleType, Scale, detectScales } from "musictheoryjs";

addScaleType("hexatonicDream", "P1 M2 M3 A4 M6 M7", { aliases: ["dream"] });

Scale.from("C4", "dream").noteNames();
// ["C4", "D4", "E4", "F#4", "A4", "B4"]

detectScales(["C4", "D4", "E4", "F#4", "A4", "B4"])[0].name;
// "hexatonicDream" — detection knows it too
```

Everything derived from the dictionary follows, including the parts you did not
ask for:

```ts
import { modes, scaleSupersets, Scale } from "musictheoryjs";

modes(Scale.from("C4", "dream")).length; // 6 — one mode per degree
scaleSupersets("hexatonicDream");        // ["lydian", "lydianAugmented", …]
```

## Removing and resetting

`removeChordType` and `removeScaleType` take a canonical name (or, for scales,
any alias) and report whether anything was removed. `resetChordTypes` and
`resetScaleTypes` drop every runtime addition and restore the built-ins.

```ts
import { addChordType, removeChordType, resetChordTypes, isChordQuality } from "musictheoryjs";

addChordType("temp", "P1 M3 P5");
removeChordType("temp");   // true
removeChordType("temp");   // false — already gone

resetChordTypes();         // back to the 108 built-ins
isChordQuality("maj7");    // true
```

Reset is the one to reach for in tests. Registrations are global to the module,
so a suite that adds types should undo them:

```ts
import { afterEach } from "bun:test";
import { resetChordTypes, resetScaleTypes } from "musictheoryjs";

afterEach(() => {
  resetChordTypes();
  resetScaleTypes();
});
```

## Conflicts are refused, not merged

Registering a name that is already taken throws. A dictionary that silently
overwrote entries would change the meaning of chord symbols elsewhere in the
program — a far worse failure than a loud one at startup.

```ts
import { addChordType, addScaleType } from "musictheoryjs";

addChordType("maj7", "P1 M3 P5 M7");  // throws: duplicate name "maj7"
addScaleType("mine", "P1 P5", { aliases: ["ionian"] }); // throws — alias taken
```

A rejected registration leaves the dictionary untouched, so catching the error
and continuing is safe. To deliberately replace a built-in, remove it first.

## What updates, and when

Registrations take effect immediately across every derived table:

| Registering a chord quality affects | Registering a scale affects |
| --- | --- |
| `Chord.of` / `Chord.from` | `Scale.from` |
| Chord symbol parsing, including aliases | `detectScales` and `scalesContaining` |
| `Chord#toString` | `chordScales` matching |
| `detectChord` and `detectQuality` | `modes`, `modeDistance`, `relativeTonic` |
| `chordSupersets` / `chordSubsets` | `scaleSupersets` / `scaleSubsets` |
| Roman numeral output | Diatonic chords for the template |

If you cache anything derived from the dictionaries yourself, watch
`chordDictionaryVersion()` and `scaleDictionaryVersion()` — both change on every
add, remove, and reset, which is exactly how the library invalidates its own
caches.

```ts
import { chordDictionaryVersion, addChordType, resetChordTypes } from "musictheoryjs";

const before = chordDictionaryVersion();
addChordType("watched", "P1 M3 P5");
chordDictionaryVersion() === before; // false — rebuild your cache
resetChordTypes();
```

## Types

`ChordQuality` and `ScaleName` accept any string, because the dictionaries are
open — built-in names are still suggested by autocomplete. Since a name may not
exist, prefer the checked lookups over indexing the tables directly:

```ts
import { chordTemplate, scaleTemplate, isChordQuality } from "musictheoryjs";

chordTemplate("maj7");     // the intervals; throws if unknown
scaleTemplate("major");    // same for scales
isChordQuality("so4");     // narrow a string before using it
```

## Use cases

**A house style.** A jazz education tool that spells `alt` chords its own way,
or an arranging app with in-house shorthand, can register those spellings once
at startup and then use the library normally.

**Non-Western scales.** Register maqam or raga skeletons by interval and they
become first-class for detection and chord-scale matching. When the scale needs
intervals 12-TET cannot express, reach for the
[tuning system](/guides/tuning/) instead — that is a different axis.

**User-defined content.** Let users define a chord or scale in your app's UI,
register it, and every existing feature — detection, suggestions, notation —
works on it without special-casing.

**Trimming.** Remove qualities you never want detected. An app that should never
report `dim7Maj7` can drop it and let detection choose the next best reading.

## Try it

```ts live
addChordType("so4", "P1 P4 P5 M9", { suffix: "so4", aliases: ["sowhat"] });
log("Cso4      ", Chord.from("Cso4").noteNames());
log("alias     ", Chord.from("Csowhat").toString());

addScaleType("dreamscale", "P1 M2 M3 A4 M6 M7");
log("dreamscale", Scale.from("C4", "dreamscale").noteNames());
log("detected  ", detectScales(["C4", "D4", "E4", "F#4", "A4", "B4"])[0].name);

resetChordTypes();
resetScaleTypes();
log("after reset, so4 known?", isChordQuality("so4"));
```
