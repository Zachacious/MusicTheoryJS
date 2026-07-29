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

For analysis work there is also a full **standalone Roman-numeral module**
with round-trip parsing: secondary functions, figured-bass inversions, and
every quality suffix from the chord dictionary. Parsing is key-independent;
keys enter only when resolving:

```ts
import { parseRomanNumeral, romanToChord, chordToRoman } from "musictheoryjs";

parseRomanNumeral("iiø7").quality;         // "min7b5"
parseRomanNumeral("viio7").symbol;         // "vii°7"  (normalized)
parseRomanNumeral("V65").inversion;        // 1

romanToChord("V7/V", "C major").toString();    // "D7"
romanToChord("V65", "C major").noteNames();    // ["B4","D5","F5","G5"]
romanToChord("vii°7/V", "C major").toString(); // "F#dim7"

chordToRoman("A7", "C major").symbol;   // "V7/ii"  (applied dominants detected)
chordToRoman("E7", "A minor").symbol;   // "V7"     (harmonic minor is diatonic)
chordToRoman("Ab", "C major").symbol;   // "bVI"
```

Numerals are scale-relative: `VII` in A minor is G (the diatonic subtonic),
and `bVII` in C major is Bb.

## Harmonic functions and secondary dominants

Every degree carries a tonic/subdominant/dominant label, and every
tonicizable degree knows its secondary dominant, the "related ii" that pairs
with it, and its tritone substitute:

```ts
import { harmonicFunctions, secondaryDominants, Key } from "musictheoryjs";

harmonicFunctions("C major");  // ["T","SD","T","SD","D","T","D"]

const c = Key.major("C");
c.secondaryDominant(5)?.toString();  // "D7"   (V7/V)
c.relatedTwo(5)?.toString();         // "Am7"  (ii of the tonicized G)
c.relatedTwo(2)?.toString();         // "Em7b5" (minor target → ø7)
c.tritoneSubstitute(1)?.toString();  // "Db7"  (subV7)
c.secondaryDominant(1);              // null — V7 of the tonic is just V7

secondaryDominants("C major").map((ch) => ch?.toString() ?? null);
// [null, "A7", "B7", "C7", "D7", "E7", null]
```

## Minor keys in three flavours

Minor keys default to natural minor; the harmonic and melodic variants are a
`variant` option away, for scales, chords, and function labels:

```ts
const a = Key.minor("A");

a.variantScale("harmonic").noteNames();       // ["A4","B4","C5","D5","E5","F5","G#5"]
a.chord(5).toString();                        // "Em"
a.chord(5, { variant: "harmonic" }).toString(); // "E"
a.chord(7, { variant: "harmonic" }).toString(); // "G#dim"
a.harmonicFunction(7, { variant: "harmonic" }); // "D" — the leading-tone chord
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

The full progression toolkit goes further: chord symbols and Roman numerals
mix freely (with `N.C.` slots), every step gets a T/SD/D function label, a
library of named progressions ships built in, and the library can suggest
what comes next:

```ts
import {
  parseProgression,
  progressionChords,
  progressionRomans,
  suggestNextChords,
  COMMON_PROGRESSIONS,
} from "musictheoryjs";

const steps = parseProgression("C major", "Dm7 | G7 | N.C. | Cmaj7");
steps.map((s) => s.roman?.symbol ?? "-");  // ["ii7", "V7", "-", "Imaj7"]
steps.map((s) => s.function);              // ["SD", "D", "", "T"]

progressionChords("Bb major", "ii-V-I");   // ["Cm7", "F7", "Bbmaj7"]
progressionChords("A minor", COMMON_PROGRESSIONS.andalusian ?? []);
// ["Am", "G", "F", "E"]
progressionRomans("C major", ["C", "A7", "Dm7", "G7"]);
// ["I", "V7/ii", "ii7", "V7"]  — applied dominants detected

suggestNextChords("C major", ["Dm7"])[0]?.chord.toString(); // "G7"
```

Suggestions score root motion (descending fifths strongest), functional
movement (D→T, SD→D, …), and the resolution of a pending applied dominant,
so the ranking always discriminates.

## Related keys

```ts
Key.major("C").relative().toString(); // "A minor"  (same signature)
Key.minor("A").relative().toString(); // "C major"
Key.major("C").parallel().toString(); // "C minor"  (same tonic)
```

## Respelling notes in a key

Enharmonic respelling on `Note` only knows "prefer sharps" or "prefer flats".
A key knows more: its scale fixes the spelling of every diatonic note, and
the harmonic chromatic convention fixes the rest (in major: ♭2, ♭3, ♯4, ♭6,
♭7; in minor the same intervals read as the raised 3rd, 6th, and 7th). The
sounding pitch never changes:

```ts
import { Key, respellInKey } from "musictheoryjs";

Key.from("G major").respell("Gb4").toString(); // "F#4" — diatonic spelling wins
respellInKey("G#4", "C major").toString();     // "Ab4" — chromatic ♭6
respellInKey("G#4", "A minor").toString();     // "G#4" — the leading tone stays
respellInKey("D#4", "C minor").toString();     // "Eb4"
```

This is what you want when normalising MIDI input (which arrives as sharps or
flats arbitrarily) into notation for a known key.

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

## Try it live

A ii–V–I in B♭, voiced and played on a timeline:

```ts live
const key = Key.major("Bb");
const chords = key.progression("ii7 V7 Imaj7");
log(chords.map(String));
play(
  chords.flatMap((c, i) =>
    c.notes.map((n) => ({ pitch: n, start: i * 0.8, duration: 0.75 }))
  )
);
```
