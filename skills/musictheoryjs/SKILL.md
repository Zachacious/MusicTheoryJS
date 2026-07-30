---
name: musictheoryjs
description: Write correct JavaScript/TypeScript using the musictheoryjs npm package (v3) — notes, intervals, scales, chords, keys, Roman numerals, progressions, voice leading, rhythm, sequencing, MIDI files, ABC/MusicXML notation, microtonal tunings, and audio analysis. Use whenever code imports musictheoryjs, when adding music-theory features to a project that has it installed, or when debugging code that uses it.
---

# MusicTheoryJS v3

musictheoryjs is a zero-dependency music theory library. This file covers
v3.x, which is a ground-up rewrite: it is **not compatible with v2, and not
compatible with whatever version your training data remembers**. Trust this
file over memory. Every `// =>` comment below is asserted in the library's CI
on every commit, so what this file claims is what the installed code does.

Full docs: https://musictheoryjs.com (also machine-readable at
https://musictheoryjs.com/llms.txt and /llms-full.txt).

## The model in five facts

1. **Notes are spelled.** A note is a letter + accidental + octave, not a
   number 0–11. `E#4` and `F4` sound the same but are different notes
   (`isEnharmonic` true, `equals` false). Results come out spelled the way a
   musician writes them (`Bdim7` contains Ab, not G#) — never "correct" that.
2. **Everything is immutable.** Every operation returns a new value; there
   are no mutating methods and no mutate/copy pairs.
3. **Classes are veneers over pure functions.** `Note`, `Scale`, `Chord`,
   `Key` are thin immutable wrappers; standalone functions (`transpose`,
   `diatonicChords`, `scaleChords`, …) are exported too and accept loose
   inputs everywhere: `"Cmaj7"` where a chord is wanted, `"C4 major"` for a
   scale, `"C major"` for a key, `"C#4"` for a note, `"P5"` or a bare
   semitone count for an interval.
4. **Frequency comes from a tuning.** Notes carry no tuning. `note.frequency`
   is a 12-TET/A4=440 convenience; anything else goes through
   `frequencyOfNote(note, tuning, anchor?)` or, beyond 12 notes per octave,
   tuning degrees via `frequencyOfDegree`.
5. **Sequences are beat-timed.** The sequence module times events in
   quarter-note beats (`NoteEvent { pitch, start, duration, velocity? }`).
   Beats convert exactly to MIDI ticks (`beat × ppq`); seconds are a derived
   view (`sequenceSeconds(stream, bpm)`).

## Imports

Everything is a named export from the root `"musictheoryjs"`. Thirteen
subpaths exist for smaller bundles, and both styles work everywhere:
`/note /interval /scale /chord /key /rhythm /sequence /analysis /midi
/notation /audio /tuning /collection`. There is **no** `/pitch` or `/math`
subpath — pitch-layer functions (`parseNote`, `spelled`, `formatNote`, …)
come from the root. ESM and CommonJS both ship; no setup call of any kind.

## Notes and intervals

Create with `note("C#4")` / `Note.from` / `new Note` (octave defaults to 4),
`Note.fromMidi(n, "sharp" | "flat")`, `Note.fromFrequency(hz)` (snaps to
nearest 12-TET note). Read `.letter .alteration .octave .pitchClass .midi
.frequency`. Intervals are `{ steps, semitones }` pairs — that is what keeps
transposition spelled correctly.

```ts
import { Note, note, interval, intervalName, transposeNotes } from "musictheoryjs";

note("C4").transpose("P5").toString(); // => "G4"
note("C4").transpose(3).toString(); // => "Eb4"
note("C4").transpose(interval(4, "d")).toString(); // => "Fb4"
Note.fromMidi(61).toString(); // => "C#4"
Note.fromMidi(61, "flat").toString(); // => "Db4"
note("Eb3").midi; // => 51
intervalName(note("C4").intervalTo("F#4")); // => "A4"
transposeNotes(["C4", "E4", "G4"], "M2").map(String); // => ["D4", "F#4", "A4"]
```

Two kinds of equality, and three kinds of semitone move:

```ts
import { note } from "musictheoryjs/note";

note("E#4").equals("F4"); // => false
note("E#4").isEnharmonic("F4"); // => true
note("Db4").enharmonic("sharp").toString(); // => "C#4"
note("C4").flatten().toString(); // => "Cb4"
note("C4").transpose(1).toString(); // => "Db4"
note("C4").transpose("A1").toString(); // => "C#4"
```

`sharpen()`/`flatten()` alter the accidental and **keep the letter**;
`transpose(1)` is a minor second and changes it; `transpose("A1")` moves a
chromatic semitone on the same letter. Other note tools: `sortNotes`,
`noteRange(from, to)`, `transposeFifths` (circle-of-fifths, register climbs).

## Scales

92 templates (camelCase names: `major`, `harmonicMinor`, `lydianDominant`,
`majorPentatonic`, `wholeTone`, …; spaced aliases like `"melodic minor"`
parse). `Scale.from(tonic, name)` or one string `"C4 major"` — a bare
template name alone is not a valid scale string.

```ts
import { Scale, mode, detectScales, scalesContaining, scaleChords } from "musictheoryjs/scale";

Scale.from("D4", "dorian").noteNames(); // => ["D4", "E4", "F4", "G4", "A4", "B4", "C5"]
Scale.from("C4 major").degree(3).toString(); // => "E4"
mode(Scale.from("C4", "major"), 6).noteNames()[0]; // => "A4"
detectScales(["C4", "D4", "E4", "G4", "A4"])[0].name; // => "majorPentatonic"
scalesContaining(["D4", "F4", "G4"])[0].name; // => "majorPentatonic"
scaleChords("C4 melodicMinor", { seventh: true }).map(String); // => ["CmMaj7", "Dm7", "Ebmaj7#5", "F7", "G7", "Am7b5", "Bm7b5"]
```

`detectScales` matches the exact pitch-class set; "what can I play over
these notes" is `scalesContaining` (subset match, smallest scales first).
`scaleChords` harmonizes **any** template in stacked thirds. Diatonic
motion: `scale.step(note, n)` (throws if the note isn't in the scale);
membership: `scale.contains` / `scale.degreeOf` (octave-agnostic).

## Chords

108 qualities. `Chord.from` takes real-world symbols (`"F#m7b5"`, `"Bb13"`,
`"Bø"`, `"C°7"`, `"CΔ7"`) or a spec object for a specific octave.

```ts
import { Chord, parseChordSymbol, detectChord, drop2 } from "musictheoryjs/chord";
import { chordScales } from "musictheoryjs";

Chord.from("F#m7b5").noteNames(); // => ["F#4", "A4", "C5", "E5"]
Chord.from({ root: "Ab3", quality: "maj7" }).noteNames(); // => ["Ab3", "C4", "Eb4", "G4"]
parseChordSymbol("Bø").quality; // => "min7b5"
detectChord(["G4", "B4", "D5", "F5"])?.toString(); // => "G7"
drop2(Chord.from("Cmaj7")).map(String); // => ["G3", "C4", "E4", "B4"]
chordScales("Cmaj7")[0].scale.name; // => "lydian"
```

`Chord.of(root, quality)` requires the **canonical** quality name (`"min7"`,
not `"m7"` — that throws); `Chord.from("Cm7")` normalizes aliases for you.
There are no slash chords (`Chord.from("C/E")` throws) — use `.invert()` /
`invertChord`, or the voicing functions (`closeVoicing`, `drop2`, `drop3`,
`spread`, `voicingsOf` with `LEFTHAND_VOICINGS`). `chordScales` ranks scales
to play over a chord with avoid-note scoring.

## Keys, Roman numerals, progressions

A `Key` is major or **natural minor** only — harmonic/melodic are per-call
variants, and modes live in `Scale`, not `Key`.

```ts
import { Key, diatonicChords, chordToRoman, romanToChord } from "musictheoryjs/key";

Key.major("C").progression("ii7 V7 Imaj7").map(String); // => ["Dm7", "G7", "Cmaj7"]
diatonicChords("C major", { seventh: true }).map(String); // => ["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bm7b5"]
chordToRoman("A7", "C major").symbol; // => "V7/ii"
romanToChord("V65", "C major").noteNames(); // => ["B4", "D5", "F5", "G5"]
romanToChord("VII", "A minor").toString(); // => "G"
Key.minor("A").chord(7, { variant: "harmonic" }).toString(); // => "G#dim"
```

Roman numerals are **scale-relative**: the diatonic subtonic of a minor key
is `VII` (G in A minor), while `bVII` there would be Gb; in a major key the
borrowed subtonic is `bVII`. Two layers exist: `Key.romanNumeral` is a loose
display labeller; `parseRomanNumeral` / `chordToRoman` / `romanToChord`
round-trip and handle figured bass, inversions, and secondaries (`"V7/ii"`).
Also on `Key`: `.signature`, `.respell(note)`, `.harmonicFunction(n)`
(`"T" | "SD" | "D"`), `.secondaryDominant(n)` (null when already diatonic),
`.relatedTwo(n)`, `.tritoneSubstitute(n)`, `.relative()`, `.parallel()`.

```ts
import { parseProgression, progressionRomans, suggestNextChords } from "musictheoryjs/key";

const steps = parseProgression("C major", "Dm7 | G7 | N.C. | Cmaj7");
steps.map((s) => s.roman?.symbol ?? s.input); // => ["ii7", "V7", "N.C.", "Imaj7"]
steps.map((s) => s.function); // => ["SD", "D", "", "T"]
progressionRomans("C major", ["C", "A7", "Dm7", "G7"]); // => ["I", "V7/ii", "ii7", "V7"]
suggestNextChords("C major", ["Dm7"])[0].chord.toString(); // => "G7"
```

Progression functions take the **key first**; tokens mix Roman numerals,
chord symbols, and `"N.C."` (a silent slot that keeps time). Named presets
in `COMMON_PROGRESSIONS` (`"ii-V-I"`, `"pachelbel"`, `"12-bar-blues"`, …).

## Voice leading and transforms

```ts
import { voiceProgression, findParallels, neoRiemannian, negativeChord } from "musictheoryjs/chord";

const v = voiceProgression(["Dm7", "G7", "Cmaj7"]);
v[0].map(String); // => ["D3", "F3", "C4", "A4"]
findParallels(v[1], v[2]); // => []
neoRiemannian("C", "PLP").toString(); // => "Abm"
negativeChord("G7", "C").toString(); // => "Fm6"
```

`voiceChord` starts a voicing, `nextVoicing` connects to the next chord with
minimal motion (parallel fifths/octaves rejected by default), and
`voiceProgression` does a whole list. Options: `{ voices, range,
allowParallels, maxLeap }`. Neo-Riemannian words (`"P"`, `"L"`, `"R"`,
composed left-to-right) work on major/minor triads only.

## Detection and analysis

Timed analysis takes `NoteEvent` streams (any time unit) or plain note
arrays. Key detection is Krumhansl–Schmuckler and returns a ranked list.

```ts
import { detectKey, forteName, pcsetMask, checkCounterpoint } from "musictheoryjs/analysis";
import { melody } from "musictheoryjs/sequence";

detectKey(["C4", "E4", "G4"])[0].key.toString(); // => "C major"
forteName(pcsetMask([0, 4, 7])); // => "3-11"
checkCounterpoint(melody(["C5", "D5"], "q"), melody(["F4", "G4"], "q"))[0]?.type; // => "parallel-fifths"
```

`analyzeHarmony(stream)` returns `{ key, timeline, cadences }` — a chord
timeline with Roman numerals in the detected key. Also here:
`detectChordAt` / `segmentChords`, `detectModulations`, the full pc-set
toolkit (`pcsetPrimeForm`, `pcsetNormalForm`, interval vectors, all 224
Forte names), and twelve-tone rows (`toneRow`, `rowTransform`, `rowMatrix`).

## Rhythm: durations, meter, patterns

`Duration.value` is the **denominator**: 4 = quarter, 8 = eighth,
1 = whole. Shorthand round-trips: `"4."` dotted quarter, `"8t"` eighth
triplet, `"16[5:4]"` quintuplet sixteenth; letters and names (`"q"`,
`"half"`) parse too.

```ts
import { parseDuration, formatDuration, durationTicks, beatGrouping, tickToPosition, quantizeTick, euclideanRhythm, rhythmToOnsets } from "musictheoryjs/rhythm";

parseDuration("8t"); // => { value: 8, dots: 0, tuplet: { actual: 3, normal: 2 } }
formatDuration(parseDuration("4.")); // => "4."
durationTicks("8t"); // => 160
beatGrouping("7/8"); // => [3, 2, 2]
tickToPosition(1500, "6/8"); // => { bar: 2, beat: 1, offset: 60 }
quantizeTick(933, "16"); // => 960
euclideanRhythm(8, 3); // => [1, 0, 0, 1, 0, 0, 1, 0]
rhythmToOnsets(euclideanRhythm(16, 5)); // => [0, 4, 7, 10, 13]
```

Time signatures parse from `"6/8"`, `"C"` (4/4), `"cut"` (2/2).
`beatGrouping` drives everything meter-aware (7/8 → [3,2,2]). Patterns are
plain `0|1` arrays (`euclideanRhythm`, `rotateRhythm`, `rhythmFromHex`,
`randomRhythm(len, density, rng)`), position math via `tickToPosition` /
`positionToTick` (1-based bars and felt beats).

## Sequencing

Builders return beat-timed streams; transforms are pure stream→stream and
compose freely.

```ts
import { Scale } from "musictheoryjs/scale";
import { melody, arpeggiate, swing, sequenceSeconds, drumPattern, GM_DRUMS, mergeStreams, compProgression, bassline } from "musictheoryjs/sequence";

const line = melody(Scale.from("C4", "major").notes, "8");
line.map((e) => e.start); // => [0, 0.5, 1, 1.5, 2, 2.5, 3]
swing(line).map((e) => +e.start.toFixed(3)); // => [0, 0.667, 1, 1.667, 2, 2.667, 3]
sequenceSeconds(line, 90).map((e) => +e.start.toFixed(3)); // => [0, 0.333, 0.667, 1, 1.333, 1.667, 2]
arpeggiate("Cmaj7", { pattern: "updown", duration: "16" }).map((e) => e.pitch.toString()); // => ["C4", "E4", "G4", "B4", "G4", "E4"]
const groove = drumPattern({ kick: "x...x...", snare: "..x...x.", hihat: "xxxxxxxx" }, { step: "8" });
groove.filter((e) => e.pitch.midi === GM_DRUMS.kick).map((e) => e.start); // => [0, 2]
mergeStreams(compProgression("C major", "ii-V-I"), bassline(["Dm7", "G7", "C"], { style: "roots" })).length; // => 15
```

The toolbox: `melody` (`null` = rest, durations cycle), `patternMelody`,
`arpeggiate`, `strum`, `compChords` / `compProgression` (rhythm hits sustain
to the next onset; `null` slots = N.C.), `bassline`
(`"walking" | "roots" | "root-fifth"`), `drumPattern` (`"x..X"` lines on
`GM_DRUMS` names, `X` = accent), combinators (`concatStreams`,
`mergeStreams`, `loopStream`, `sliceStream`, `shiftStream`,
`transposeStream`), groove (`swing`, `accent`, `humanize`, `gate`,
`rampVelocity`), motif transforms (`retrograde`, `invertMelody`, `augment`,
`diatonicSequence`), and `songForm("AABA", parts)`.

## MIDI

Bytes in, bytes out — `Uint8Array`, never base64 or file paths; you do the
file I/O. Beats round-trip exactly through ticks.

```ts
import { melody, sequenceToMidi, midiToSequence } from "musictheoryjs/sequence";
import { writeMidi, parseMidi } from "musictheoryjs/midi";

const bytes = writeMidi(sequenceToMidi(melody(["C4", "E4", "G4"], ["q", "8", "h"]), { bpm: 96 }));
bytes instanceof Uint8Array; // => true
midiToSequence(parseMidi(bytes)).map((e) => [e.pitch.toString(), e.start, e.duration]); // => [["C4", 0, 1], ["E4", 1, 0.5], ["G4", 1.5, 2]]
```

Two parallel pipelines — don't mix them: the **beats** pair
`sequenceToMidi` / `midiToSequence` takes `{ bpm, tempoMap }`, while the
**seconds** pair `noteStreamToMidi` / `midiToNoteStream` takes `tempo` in
microseconds per quarter (500000 = 120 BPM). Pass `channel: 9` for drums.
`retuneMidi(file, tuning)` applies any tuning with per-note pitch bends.

## Notation

`toABC` / `toMusicXML` accept a `Scale`, a `Chord`, a note array, or a full
`Score`; both formats read back in as beat-timed streams.

```ts
import { toABC, fromABC } from "musictheoryjs/notation";

toABC(["C4", "D4", "E4"]); // => "X:1\nM:4/4\nL:1/8\nK:C\nC2 D2 E2 |]"
const tune = fromABC("X:1\nT:Test\nM:6/8\nK:D\nD2 E2 F2 |]");
tune.notes.map(String); // => ["D4", "E4", "F#4"]
tune.stream.map((e) => e.start); // => [0, 1, 2]
```

`fromABC` applies the key signature (that F# comes from `K:D`) and reads
rhythm against the unit note length. `sequenceToScore` bridges streams to
notation and **throws rather than guessing** on overlapping voices, unequal
simultaneous lengths, un-notatable durations, or a tuplet crossing a
barline — quantize or split first.

## Tunings and microtonal

```ts
import { note, frequencyOfNote, frequencyOfDegree, centsTuning, getTuning, justIntonation } from "musictheoryjs";

note("A4").frequency; // => 440
frequencyOfNote(note("C4")); // => ~261.63
frequencyOfNote(note("E4"), justIntonation()); // => ~330
frequencyOfNote(note("A4"), "12-TET", { frequency: 432 }); // => 432
const rast = centsTuning([0, 204, 355, 498, 702, 906, 1057], { name: "Rast" });
rast.centsForDegree(2); // => 355
getTuning("rast").size; // => 7
frequencyOfDegree("24-EDO", 1, { frequency: 440 }); // => ~452.89
```

A `Tuning` is `{ name, size, period, centsForDegree }`. Builders:
`equalTemperament(n)` / `edo(n)`, `pythagorean()`, `quarterCommaMeantone()`,
`justIntonation()`, `centsTuning`, `ratioTuning` (`"3/2"` strings ok),
`scalaTuning(sclText)`, plus presets `maqamTuning` (7), `ragaTuning` (10),
`slendro()`, `pelog()`. A case-insensitive registry resolves names
(`"12-TET"`, `"Just"`, `"24-EDO"`, `"rast"`, …); `registerTuning` adds your
own (throws on a taken name). Beyond 12 notes per octave, address **tuning
degrees**, not spelled notes — `frequencyOfNote` anchors A4,
`frequencyOfDegree` anchors degree 0.

## Audio

Caller provides mono `Float32Array`/`Float64Array` samples plus an explicit
sample rate; the library never captures audio, and pitch work is strictly
monophonic (YIN).

```ts
import { detectPitch, detectNote } from "musictheoryjs/audio";

const sr = 44100;
const tone = Float64Array.from({ length: 4096 }, (_, i) => Math.sin((2 * Math.PI * 440 * i) / sr));
Math.round(detectPitch(tone, sr) ?? 0); // => 440
detectNote(tone, sr)?.toString(); // => "A4"
```

Also: `magnitudeSpectrum`, `chromagram` (12 bins, C = 0 — feed it to
`detectKey`), `cqt` / `cqtChroma`, `detectOnsets`, `trackPitch` (frames for
vibrato/glides), and `transcribeMelody(samples, sr)` → a **seconds-timed**
stream (quantize with `quantizeStream`, or convert via `secondsToBeats`).

## Extending the dictionaries

Registered types become native everywhere — parsing, printing, detection,
chord-scale matching.

```ts
import { addChordType, resetChordTypes, Chord } from "musictheoryjs";

addChordType("so4", "P1 P4 P5 M9", { suffix: "so4" });
Chord.from("Cso4").noteNames(); // => ["C4", "F4", "G4", "D5"]
resetChordTypes();
```

`addScaleType` / `removeScaleType` / `resetScaleTypes` mirror these for
scales; `registerTuning` for tunings.

## Traps — where generated code goes wrong

1. **The v2 API is gone.** No `buildTables()` (no setup at all), no
   `Semitone`/`Modifier` enums (use `note.pitchClass`, `note.alteration`),
   no `"C5(major)"` or `"(Ab3)maj7"` string forms, no `Instrument` (use
   `frequencyOfNote`/`note.midi`), no mutate/copy method pairs
   (`sharp()`/`sharped()` etc.), no `scale.dorian()`/`shift()` (use
   `Scale.from(scale.tonic, "dorian")` or `mode()`), no
   `chord.major()`/`majored()` (build the quality you want with `Chord.of`).
2. **Spelling is intentional.** Don't respell Ab to G# to "fix" output;
   compare sounds with `isEnharmonic`, spellings with `equals`, and respell
   deliberately with `.enharmonic()` or `respellInKey`.
3. **Errors throw** (`SyntaxError`/`RangeError` with helpful messages);
   non-throwing variants exist where parsing user input: `tryParseNote`,
   `tryParseInterval`, `tryParseChordSymbol`, `tryParseRomanNumeral`,
   `tryParseDuration`, `tryGetTuning`, and `detect*` functions return
   `null`/`[]` rather than throwing. `interval(5, "M")` throws — there is
   no major fifth.
4. **Real names, not plausible ones:** `detectChord` / `detectScales` /
   `detectKey` (not `identify*`), `chordScales` (not `scalesForChord`),
   `scalesContaining`, `voiceProgression` / `nextVoicing` (not
   `voiceLead`), `neoRiemannian` (not `plr`), `diatonicChords` (not
   `Key.chords()`), `parseRomanNumeral` (not `Roman.parse`).
5. **`chroma` ≠ `midi`.** `chroma` counts semitones above C0 (C4 = 48);
   `midi = chroma + 12` (C4 = 60).
6. **`invert()` clears `.quality`** — an inverted C major prints as note
   names, and `detectChord(["E4","G4","C5"])` roots on the bass (it is not
   inversion-aware naming).
7. **Minor-key defaults are natural minor.** `Key.minor("A").chord(5)` is
   Em, not E7 — ask for `{ variant: "harmonic" }` when you want the leading
   tone.
8. **`Note.fromFrequency` snaps to 12-TET.** For exact microtonal pitch use
   `fromFrequency(hz)` → `PitchPoint` (cents, no snapping).
9. **Don't hand-compute what the library does exactly:** beat↔tick
   conversion (`sequenceToMidi`), tempo maps, swing warps, quantization
   grids (kept as unrounded floats so triplet grids don't drift), and bar
   positions in irregular meters all have functions with tested edge cases.

## When something is missing

The full API reference is at https://musictheoryjs.com/api/ and every guide
is in one fetch at https://musictheoryjs.com/llms-full.txt. If a name you
expect doesn't exist, check the traps list above before inventing one — and
prefer reading the installed package's `.d.ts` files over guessing.
