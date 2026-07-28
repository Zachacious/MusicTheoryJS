---
title: Keys & Harmony
---

A `Key` is a tonic plus a mode (major or natural minor). Because it's built on
the correctly-spelled scale, everything that follows — the key signature, the
diatonic chords, and Roman-numeral analysis — spells correctly too.

## Creating a key and reading its signature

```ts
import { Key } from "musictheoryjs";

Key.major("G").signature;
// { count: 1, accidentals: [{ letter: "F", alteration: 1 }] }  — one sharp (F#)

Key.major("F").signature.count;  // -1  (one flat)
Key.major("C#").signature.count; //  7  (seven sharps)
Key.minor("A").signature.count;  //  0
```

`count` is positive for sharps, negative for flats.

## Diatonic chords

Build the chord on any scale degree (1-based). Pass `seventh: true` for
four-note seventh chords:

```ts
const c = Key.major("C");

[1, 2, 3, 4, 5, 6, 7].map((d) => c.chord(d).toString());
// ["C", "Dm", "Em", "F", "G", "Am", "Bdim"]

[1, 2, 3, 4, 5, 6, 7].map((d) => c.chord(d, { seventh: true }).toString());
// ["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bm7b5"]

c.chord(2).noteNames(); // ["D4", "F4", "A4"]
```

## Roman numerals — both directions

Turn a chord into its Roman numeral in a key, or a Roman numeral back into a
chord. The numeral's case reflects the actual chord quality; chromatic roots get
accidental prefixes.

```ts
const c = Key.major("C");

// chord → numeral
c.romanNumeral(Chord.from("Dm"));  // "ii"
c.romanNumeral(Chord.from("G7"));  // "V7"
c.romanNumeral(Chord.from("Bdim")); // "vii°"
c.romanNumeral(Chord.from("Bb"));  // "bVII"  (borrowed / chromatic)
c.romanNumeral(Chord.from("Eb"));  // "bIII"

// numeral → chord
c.chordFromRoman("ii").toString();   // "Dm"
c.chordFromRoman("V7").toString();   // "G7"
c.chordFromRoman("bVII").toString(); // "Bb"
```

## Progressions

Parse a whole Roman-numeral progression into chords:

```ts
Key.major("C").progression("I V vi IV").map(String);
// ["C", "G", "Am", "F"]

Key.major("C").progression("ii7-V7-Imaj7").map(String);
// ["Dm7", "G7", "Cmaj7"]
```

Separators can be spaces, dashes, commas, or bars.

## Related keys

```ts
Key.major("C").relative().toString(); // "A minor"  (same signature)
Key.minor("A").relative().toString(); // "C major"
Key.major("C").parallel().toString(); // "C minor"  (same tonic)
```

## Minor keys

Minor keys use the natural-minor scale for their signature and diatonic chords:

```ts
const a = Key.minor("A");

[1, 2, 3, 4, 5, 6, 7].map((d) => a.chord(d).toString());
// ["Am", "Bdim", "C", "Dm", "Em", "F", "G"]

a.romanNumeral(Chord.from("C")); // "III"
```

For full harmonic analysis of a performance — detecting the key, labelling a
chord timeline, and finding cadences — see [Analysis](/guides/analysis/).
