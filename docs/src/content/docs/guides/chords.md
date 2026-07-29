---
title: Chords
---

A `Chord` is a root plus a set of spelled intervals. Chords can be built from a
symbol, from a root and a quality, or from arbitrary intervals — and their tones
always spell correctly.

## Creating chords

```ts
import { Chord, chord } from "musictheoryjs";

Chord.from("Cmaj7");         // parse a chord symbol (root octave defaults to 4)
Chord.of("C4", "min7");      // root note + canonical quality
chord("F#m7b5");             // `chord(...)` is shorthand for `Chord.from`

Chord.from("Cmaj7").noteNames(); // ["C4", "E4", "G4", "B4"]
Chord.from("Bdim7").noteNames();  // ["B4", "D5", "F5", "Ab5"]  (Ab, not G#)
Chord.of("D4", "min7").noteNames(); // ["D4", "F4", "A4", "C5"]
```

## Chord symbols

Parsing accepts common aliases and accidental roots:

```ts
Chord.from("C");       // C major
Chord.from("Cm");      // C minor  ("min", "-" also work)
Chord.from("CM7");     // C major 7 ("maj7", "Δ" also work)
Chord.from("C7");      // C dominant 7
Chord.from("Cm7b5");   // half-diminished ("ø" also works)
Chord.from("F#dim7");
Chord.from("Bb13");
```

MusicTheoryJS ships **108** chord qualities, defined once in a single
dictionary that also drives symbol parsing, printing, and detection — and
tested against a corpus of real-world chord symbols. The families:

- **Triads and power chords** — `maj`, `min`, `dim`, `aug`, `sus2`, `sus4`,
  `sus24`, `power`, `majb5`, `mins5`, `quartal`
- **Added tones** — `add9`, `addb9`, `minAdd4`, `minAdd9`, `augAdd9`,
  `min7add11`, `maj7add13`, `dom7add6`
- **Sixths** — `maj6`, `min6`, `maj69`, `min69`, `maj6s11`, `maj69s11`
- **Sevenths** — `dom7`, `maj7`, `min7`, `minMaj7`, `dim7`, `dimMaj7`,
  `min7b5`, `aug7`, `dom7b5`, `maj7b5`, `maj7s5`, `maj7b6`, `min7s5`
- **Extended** — ninths, elevenths, and thirteenths in every flavour
  (`dom9`…`min13`), plus suspended dominants (`dom7sus4`, `dom9sus4`,
  `dom13sus4`)
- **Altered dominants** — every practical combination of `b5`/`#5`, `b9`/`#9`,
  `#11`, and `b13` (`dom7b9`, `dom7s9b13`, `dom13b9s11`, `dom7alt`, …)

Suffix aliases cover what charts actually print: `Δ7`, `ø`, `°7`, `-7`, `^9`,
`h7`, `alt7`, `+`, `2`, unicode accidentals (`C7♭9`), and so on.

```ts
import { CHORD_TEMPLATES, CHORD_DEFINITIONS, parseChordSymbol } from "musictheoryjs";

Object.keys(CHORD_TEMPLATES);      // every canonical quality
CHORD_DEFINITIONS.length;          // 108 — name, intervals, suffix, aliases
parseChordSymbol("F#m7").quality;  // "min7"
parseChordSymbol("Bø").quality;    // "min7b5"
```

## Inspecting quality

```ts
const c = Chord.from("Cm");

c.isMajor();      // false
c.isMinor();      // true
c.isDiminished(); // false
c.isAugmented();  // false
c.quality;        // "min"
c.root;           // Note C4
c.notes;          // Note[]
c.toString();     // "Cm"
```

## Inversions

`invert()` moves the lowest tone up an octave (immutably):

```ts
Chord.from("C").invert().noteNames(); // ["E4", "G4", "C5"]
Chord.from("C").invert().invert().noteNames(); // ["G4", "C5", "E5"]
```

## Voicings

Rearrange chord tones across octaves without changing which notes are present:

```ts
import { Chord, closeVoicing, drop2, drop3, spread } from "musictheoryjs";

const c = Chord.from("Cmaj7"); // C4 E4 G4 B4

closeVoicing(c).map(String); // ["C4","E4","G4","B4"]
drop2(c).map(String);        // ["G3","C4","E4","B4"]  (2nd-from-top down an octave)
drop3(c).map(String);        // ["E3","C4","G4","B4"]
spread(c).map(String);       // widened across octaves
```

## Voice leading

Connect chords the way arrangers do. `voiceChord` builds an initial voicing
(root in the bass, tones covered by priority root > third > seventh > fifth);
`nextVoicing` moves to the next chord with minimal total motion — keeping
voice order, staying in range, and refusing parallel fifths and octaves
unless you ask for them. `voiceProgression` does a whole progression in one
call:

```ts
import { voiceChord, nextVoicing, voiceProgression, findParallels, voiceLeadingCost } from "musictheoryjs";

voiceChord("Cmaj7").map(String);      // ["C3","E3","B3","G4"]

const voicings = voiceProgression(["C", "F", "G7", "C"]);
voicings.map((v) => v.map(String).join(" "));
// ["C3 E3 G3 E4", "F3 F3 A3 C4", "G2 F3 G3 B3", "C3 E3 G3 C4"]

findParallels(voicings[2], voicings[3]);    // [] — never emitted by default
voiceLeadingCost(voicings[0], voicings[1]); // total motion in semitones
```

Parallels are judged on **spelled** intervals (a d5→P5 slide is not a
parallel fifth), and the search is exhaustive per connection: if the
constraints are truly unsatisfiable it throws rather than emit bad
counterpoint — widen `range` or `maxLeap` (default 12, one octave), or pass
`allowParallels: true`.

## Transformations

Neo-Riemannian P/L/R operations on triads — each an involution (applying it
twice returns the original chord, spelling included) — plus chromatic
mediants and negative harmony:

```ts
import { neoRiemannian, parallelTriad, relativeTriad, leadingToneExchange,
         chromaticMediants, negativeChord, negativeNote } from "musictheoryjs";

parallelTriad("C").toString();       // "Cm"
relativeTriad("C").toString();       // "Am"
leadingToneExchange("C").toString(); // "Em"
neoRiemannian("C", "PL").toString(); // "Ab"   (hexatonic mediant)
neoRiemannian("C", "PLP").toString();// "Abm"  (hexatonic pole)

chromaticMediants("C").map(String);  // ["E", "Eb", "A", "Ab"]

// Reflection around the tonic–dominant axis: V7 becomes the classic iv6.
negativeChord("G7", "C").toString(); // "Fm6"
negativeNote("E4", "C").toString();  // "Eb4"
```

## Detecting a chord from notes

The inverse of building from a symbol — identify the chord a set of notes forms.
Every note is tried as a potential root, preferring the lowest as the bass:

```ts
import { detectChord } from "musictheoryjs";

detectChord(["C4", "E4", "G4"])?.toString();        // "C"
detectChord(["C4", "Eb4", "G4"])?.toString();       // "Cm"
detectChord(["G4", "B4", "D5", "F5"])?.toString();  // "G7"
detectChord(["E4", "G#4", "C5"])?.root.letter;      // "C" (aug, roots on bass)
```

Feed a detected chord into a [`Key`](/guides/keys/) to get its Roman numeral, or
segment a whole performance into a chord timeline — see
[Analysis](/guides/analysis/).
