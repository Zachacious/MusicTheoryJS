<p align="center">
  <img src="media/mjsv3.jpg" width="720" alt="MusicTheoryJS" />
</p>

<h1 align="center">MusicTheoryJS</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/musictheoryjs"><img src="https://img.shields.io/npm/v/musictheoryjs.svg?color=6d28d9" alt="npm" /></a>
  <a href="https://github.com/Zachacious/MusicTheoryJS/actions/workflows/ci.yml"><img src="https://github.com/Zachacious/MusicTheoryJS/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/tests-1572%20passing-brightgreen" alt="1572 tests passing" />
  <img src="https://img.shields.io/badge/coverage-99%25-brightgreen" alt="99% coverage" />
  <img src="https://img.shields.io/badge/gzipped-2%E2%80%9341%20KB-6d28d9" alt="2 to 41 KB gzipped" />
  <a href="https://www.npmjs.com/package/musictheoryjs"><img src="https://img.shields.io/npm/types/musictheoryjs.svg?color=6d28d9" alt="types included" /></a>
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="zero dependencies" />
  <a href="LICENSE.txt"><img src="https://img.shields.io/npm/l/musictheoryjs.svg?color=lightgrey" alt="ISC license" /></a>
</p>

<p align="center"><b>The fastest and most complete music theory library for JavaScript and TypeScript.</b></p>

MusicTheoryJS gives your code a working knowledge of music. It knows the notes
in an `Fm9`, the key a melody is in, which scales fit over a `G7alt`, where the
onsets of a tresillo fall, and what frequency a quarter tone above middle C
sounds at. Use it to analyze performances and MIDI, generate progressions and
voicings, sequence backing tracks into real MIDI files, label a score with
Roman numerals, build ear trainers and theory apps, or drive a synth with
tunings most software cannot represent.

## Highlights

- **Most complete.** Core theory through microtonal tunings, MIDI file I/O,
  notation in and out, audio DSP, voice leading, rhythm generation, and
  sequencing. [What's in the library](#whats-in-the-library).
- **Zero runtime dependencies.** Nothing gets pulled into your tree but the
  code you call.
- **Tree-shakable to the import.** Thirteen subpaths (`musictheoryjs/note`,
  `/chord`, `/tuning`, …) and `sideEffects: false` let a bundler drop
  everything you don't touch. `Note` alone ships at ~2 KB min+gzip; the
  entire library — 108 chord qualities, 92 scales, 34 tunings — is about
  41 KB. [Bundle size](#bundle-size).
- **Written in TypeScript.** Types ship in the package: `.d.ts` for every
  export and every subpath, no `@types` install, no `any` at the edges.
- **ESM and CommonJS.** `import` and `require` both resolve to real builds,
  each with its own type declarations.
- **Immutable values.** Every operation returns a new value, so notes and
  chords are safe to share, compare, and memoize.
- **Easy to use.** One import, no setup, no builders. Pass names (`"Cmaj7"`,
  `"C4 major"`, `"7/8"`), plain objects, or numbers — anything that could
  reasonably mean a chord is accepted as one, and you get a spelled,
  printable answer back.
- **Correct results.** `transpose("Eb4", "P5")` is `Bb4`, the C♯ major scale
  has an E♯ in it, and G♯ and A♭ stay different pitches when a tuning needs
  them to be. [Here's why](#why-the-answers-come-out-right).
- **Errors that help.** Bad input throws with a message that names the
  problem, and `try*` variants (`tryParseNote`, `tryParseChordSymbol`, …)
  return `null` when you'd rather test than catch — nothing silently falls
  back to a default.
- **Open dictionaries.** 108 chord qualities, 92 scales, and 34 tunings
  built in — and you can register your own at runtime, after which every
  part of the library treats them as native.
- **Documentation you can trust.** Every snippet in this README, every
  `@example` in the source, and every runnable block in the guides executes
  in CI. A wrong `// =>` comment fails the build.
- **Ready for AI assistants.** An [Agent Skill](#ai-assistants) ships in the
  package so coding agents write real v3 code instead of guessing, and the
  docs are published as [llms.txt](https://musictheoryjs.com/llms.txt). The
  skill's snippets run in CI with everything else.

---

## Quick start

```bash
bun add musictheoryjs   # or: npm i · pnpm add · yarn add
```

```ts
import { Note, Scale, Chord, Key, interval } from "musictheoryjs";

Scale.from("C4", "major").noteNames();        // ["C4","D4","E4","F4","G4","A4","B4"]
Chord.from("Cmaj7").noteNames();              // ["C4","E4","G4","B4"]
Key.major("C").progression("ii7 V7 Imaj7");   // [Dm7, G7, Cmaj7]
new Note("C4").transpose(interval(5, "P")).toString(); // "G4"
```

**Docs:** https://musictheoryjs.com — the guides have editable, runnable
examples that play through your speakers.

> v3 is a rewrite and is not API-compatible with v2. On v2, pin it or read the
> [migration guide](https://musictheoryjs.com/guides/migration/) before
> upgrading — the v3 snippets on that page run as tests on every commit.

## AI assistants

v3 is newer than most models' training data, so an assistant asked cold will
reach for the old v2 API. The package ships an
[Agent Skill](skills/musictheoryjs/SKILL.md) that fixes this: a distilled
reference the agent loads whenever it writes MusicTheoryJS code. In a Claude
Code project, install it with:

```bash
cp -r node_modules/musictheoryjs/skills/musictheoryjs .claude/skills/
```

Or fetch it without installing the package:

```bash
npx degit Zachacious/MusicTheoryJS/skills/musictheoryjs .claude/skills/musictheoryjs
```

Any tool that reads `SKILL.md` files can use the same folder. The docs are
also published for AI tools as [llms.txt](https://musictheoryjs.com/llms.txt)
and [llms-full.txt](https://musictheoryjs.com/llms-full.txt), and every code
snippet in the skill executes in CI alongside the README and guides — what it
teaches is what the library does. Details in the
[AI assistants guide](https://musictheoryjs.com/guides/ai/).

---

## What's in the library

Thirteen areas cover theory, rhythm, sequencing, analysis, tuning, and I/O.
Everything is exported from the root, and each area is also its own import
path, so bundlers
can split on the boundaries. Each entry links to its guide, and the
[docs](https://musictheoryjs.com) have a full API reference.

**Core theory**

- [`musictheoryjs/note`](https://musictheoryjs.com/guides/notes/) — notes, ranges, sorting, circle-of-fifths transposition
- [`musictheoryjs/interval`](https://musictheoryjs.com/guides/intervals/) — intervals, transposition, inversion, simplification
- [`musictheoryjs/scale`](https://musictheoryjs.com/guides/scales/) — scales, modes and their relations, detection, subset/superset queries, chord-scale matching (92 templates, extensible)
- [`musictheoryjs/chord`](https://musictheoryjs.com/guides/chords/) — chords, symbol parsing, detection, voicings and voicing dictionaries, voice leading, Neo-Riemannian transforms (108 qualities, extensible)
- [`musictheoryjs/key`](https://musictheoryjs.com/guides/keys/) — keys, signatures, Roman numerals, secondary dominants, progressions, next-chord suggestion

**Rhythm and sequencing**

- [`musictheoryjs/rhythm`](https://musictheoryjs.com/guides/rhythm/) — durations, tuplets, time signatures, bar/beat positions, quantization, Euclidean and generative patterns
- [`musictheoryjs/sequence`](https://musictheoryjs.com/guides/sequencing/) — notes placed in time: melodies, arpeggios and strums, comped progressions, walking bass, drum grids on GM percussion, swing/accent/humanize/crescendo, motif transforms (retrograde, inversion, augmentation, diatonic sequence), song form, tempo maps, and exact conversion to MIDI or notation

**Analysis**

- [`musictheoryjs/analysis`](https://musictheoryjs.com/guides/analysis/) — key detection, chord timelines with Roman numerals and cadences, modulations, pitch-class set theory with Forte set-class names, counterpoint checking, twelve-tone rows

**Tuning**

- [`musictheoryjs/tuning`](https://musictheoryjs.com/guides/tuning/) — tuning systems: any EDO, Just Intonation, historical temperaments, maqam/raga/gamelan presets, custom cents or ratios, Scala files

**Files and sound**

- [`musictheoryjs/midi`](https://musictheoryjs.com/guides/midi/) — Standard MIDI File read/write, retuning with per-note pitch bends
- [`musictheoryjs/notation`](https://musictheoryjs.com/guides/notation/) — ABC and MusicXML, both directions: export scores, read them back as timed streams
- [`musictheoryjs/audio`](https://musictheoryjs.com/guides/audio/) — FFT, pitch, chroma (FFT + constant-Q), onsets, melody transcription

**Helpers**

- `musictheoryjs/collection` — array helpers music code keeps needing: ranges, rotation, permutations

---

## Common use cases

**Build a chord/scale reference or ear trainer.** Parse what a user types, hand
back the notes, and check their answer.

```ts
import { Chord, detectChord, chordScales } from "musictheoryjs";

Chord.from("F#m7b5").noteNames(); // => ["F#4","A4","C5","E5"]
// Detection is the inverse — it roots on the lowest note it can read a chord from.
detectChord(["F#4", "A4", "C5", "E5"])?.toString(); // => "F#m7b5"
// And what to play over it:
chordScales("F#m7b5")[0].scale.name; // => "halfDiminished"
```

**Analyze a MIDI file or a performance.** Read the notes, find the key, get a
chord timeline with Roman numerals and cadences.

```ts no-run
import { parseMidi, midiToNoteStream, analyzeHarmony } from "musictheoryjs";

const { key, timeline, cadences } = analyzeHarmony(midiToNoteStream(parseMidi(bytes)));
// key: C major · timeline: [{ roman: "ii" }, { roman: "V" }, { roman: "I" }] · cadences: authentic
```

**Generate a progression and voice it.** Roman numerals in, smoothly voice-led
chords out.

```ts
import { Key, voiceProgression } from "musictheoryjs";

const chords = Key.major("C").progression("ii7 V7 Imaj7");
voiceProgression(chords).map((v) => v.map(String))[0]; // => ["D3","F3","C4","A4"]
// Each chord after the first moves as little as possible from the one before.
```

**Sequence a riff into a MIDI file.** Streams are timed in quarter-note beats
and compose freely; beats convert exactly to ticks, so the result writes
straight to a `.mid`.

```ts
import { melody, patternMelody, euclideanRhythm, mergeStreams, sequenceToMidi, writeMidi } from "musictheoryjs";

const lead = melody(["C4", "E4", "G4", "E4"], "8");        // an eighth-note riff
const bass = patternMelody(["C2"], euclideanRhythm(8, 3)); // a tresillo bass
writeMidi(sequenceToMidi(mergeStreams(lead, bass), { bpm: 96 })); // a playable .mid, as bytes
```

**Drive a sequencer or drum machine.** Euclidean patterns give you grooves from
two integers; onsets map straight onto ticks.

```ts
import { euclideanRhythm, rhythmToOnsets, durationTicks } from "musictheoryjs";

const step = durationTicks("16");
rhythmToOnsets(euclideanRhythm(16, 5)).map((i) => i * step); // => [0,480,840,1200,1560]
```

**Transpose or re-key a score.** Everything transposes, and the spelling stays
correct — no D♯ major scales.

```ts
import { Key, Scale, transposeNotes } from "musictheoryjs";

transposeNotes(["C4", "E4", "G4"], "M3").map(String); // => ["E4","G#4","B4"]
Scale.from("Eb4", "major").transpose("P4").noteNames()[0]; // => "Ab4"
Key.major("C").transpose("m3").toString(); // => "Eb major"
```

**Work outside 12-TET.** Maqamat, ragas, gamelan, any EDO, or a Scala file —
by name or by object.

```ts
import { frequencyOfNote, parseNote, getTuning } from "musictheoryjs";

frequencyOfNote(parseNote("C4"), "Just"); // => 264
// A neutral third — impossible in 12-TET:
getTuning("rast").centsForDegree(2); // => 350
```

**Notate the result.** ABC or MusicXML out, ABC back in.

```ts
import { toABC, fromABC, Scale } from "musictheoryjs";

toABC(Scale.from("D4", "dorian"), { title: "D dorian" });
fromABC("K:D\nD2 E2 F2 |]").notes.map(String); // => ["D4","E4","F#4"]
```

---

## Bundle size

Measured by bundling a real import with `bun build --minify` and gzipping the
output. Your numbers depend on your bundler, but the shape holds: you pay for
what you import.

| You import | Minified | Gzipped |
| --- | --- | --- |
| Rhythm patterns | 0.4 KB | **0.3 KB** |
| `Note` | 4.7 KB | **2.0 KB** |
| MIDI read | 7.6 KB | **3.3 KB** |
| `Note`, `Scale`, `Chord` | 21.3 KB | **6.7 KB** |
| `Key` + progressions | 34.4 KB | **11.0 KB** |
| Everything | 120.0 KB | **41.4 KB** |

The package is marked `sideEffects: false`, so unused areas never make it into
the bundle in the first place.

---

## A closer look

Each area in more depth, with code you can paste and run.

### Notes and intervals

A note here is a letter, an accidental, and an octave — not a number from 0
to 11. That distinction is the one thing most small libraries drop, and it's
the thing theory is built on. `C#` and `Db` are the same key on a piano and
different notes everywhere else: they belong to different scales, form
different intervals, and get named differently. Keep them apart and the output
matches what you'd write by hand.

```ts
import { Note, interval } from "musictheoryjs";

new Note("E#4").equals("F4");        // false — different notes
new Note("E#4").isEnharmonic("F4");  // true  — same pitch
new Note("C4").transpose(interval(4, "d")).toString(); // "Fb4"  (a diminished fourth, spelled right)
```

### Scales and chords

Construct them from names or symbols, or hand the library a set of notes and
let it tell you what they are. 92 scale templates, 108 chord qualities tested
against a corpus of real-world chord symbols, voicings, and detection both
directions — including subset matching ("which scales contain these notes?").

```ts
import { Scale, Chord, detectChord, detectScales, drop2 } from "musictheoryjs";

Scale.from("D4", "dorian").noteNames();
detectScales(["C4", "D4", "E4", "G4", "A4"]);       // major pentatonic, …
detectChord(["G4", "B4", "D5", "F5"])?.toString();  // "G7"
drop2(Chord.from("Cmaj7")).map(String);             // ["G3","C4","E4","B4"]
```

### Keys, Roman numerals, and progressions

```ts
import { Key, Chord } from "musictheoryjs";

Key.major("C").progression("ii7 V7 Imaj7").map(String); // ["Dm7","G7","Cmaj7"]
Key.major("C").romanNumeral(Chord.from("G7"));          // "V7"
Key.minor("A").relative().toString();                    // "C major"
```

### Analysis

Point it at a set of notes or a stream of timed notes and it works backward:
detects the key (Krumhansl–Schmuckler), segments a chord timeline, labels each
chord with a Roman numeral, and marks cadences.

```ts
import { detectKey, analyzeHarmony } from "musictheoryjs";

detectKey(["C4", "E4", "G4"])[0].key.toString();  // "C major"
const { key, timeline, cadences } = analyzeHarmony([
  { pitch: "C4", start: 0, duration: 1 },
  { pitch: "E4", start: 0, duration: 1 },
  { pitch: "G4", start: 0, duration: 1 },
]);
```

The theory classroom's other chapters are here too: prime forms and Forte
names for all 224 set classes, counterpoint checking between two lines, and
twelve-tone row operations.

```ts
import { forteName, pcsetMask, checkCounterpoint, melody } from "musictheoryjs";

forteName(pcsetMask([0, 4, 7])); // => "3-11"
const issues = checkCounterpoint(melody(["C5", "D5"], "q"), melody(["F4", "G4"], "q"));
issues[0]?.type; // => "parallel-fifths"
```

### Rhythm, meter, and patterns

Durations with dots and tuplets, time signatures from 4/4 to 7/8 with their
felt beat groupings, bar/beat positions, and grid quantization for MIDI ticks
or seconds.

```ts
import { durationName, tickToPosition, quantizeTick, beatGrouping } from "musictheoryjs";

durationName("q.");          // "dotted quarter"
beatGrouping("7/8");         // [3, 2, 2]  — eighths per felt beat
tickToPosition(1500, "6/8"); // { bar: 2, beat: 1, offset: 60 }
quantizeTick(933, "16");     // 960
```

Onset grids come with the generators that produce the world's rhythms.
Euclidean distribution — spreading `k` onsets as evenly as possible over `n`
steps — yields the tresillo, the cinquillo, and the Bossa Nova clave from
nothing but two numbers.

```ts
import { euclideanRhythm, rhythmToOnsets, rotateRhythm, rhythmFromHex } from "musictheoryjs";

euclideanRhythm(8, 3);                    // [1,0,0,1,0,0,1,0] — tresillo
rhythmToOnsets(euclideanRhythm(16, 5));   // [0,4,7,10,13] — Bossa Nova clave
rotateRhythm(euclideanRhythm(8, 3), 2);   // a rotation is a different groove
rhythmFromHex("8f");                      // [1,0,0,0,1,1,1,1] — drum-machine hex
```

### Sequencing

The theory layers answer "what notes"; the sequence module answers "when".
Streams are timed in quarter-note beats, so a comped progression, a walking
bass, and a swung melody drop straight into a MIDI file — or a score — with
no tick math.

```ts
import { compProgression, bassline, swing, arpeggiate, sequenceToMidi, writeMidi, mergeStreams } from "musictheoryjs";

// A played ii-V-I: voice-led hits with a Charleston-style rhythm.
const comp = compProgression("C major", "ii-V-I", { rhythm: [1, 0, 0, 1, 0, 0, 0, 0] });
const bass = bassline(["Dm7", "G7", "Cmaj7"]); // walking quarters, chromatic approaches
const bytes = writeMidi(sequenceToMidi(mergeStreams(swing(comp), bass), { bpm: 140 }));

arpeggiate("Am", { pattern: "updown", octaves: 2 }).length; // => 10
```

Motif transforms cover the counterpoint classroom — retrograde, spelled
inversion (chromatic or tonal), augmentation, and the diatonic sequence —
and `songForm("AABA", parts)` lays sections onto one timeline.

### MIDI and audio

Read and write Standard MIDI Files with a byte codec, transcribe a monophonic
melody straight from audio samples, and pull pitch, chroma (FFT or constant-Q),
and onsets out of a buffer with a dependency-free DSP layer — no extra
packages.

```ts no-run
import { parseMidi, midiToNoteStream, transcribeMelody } from "musictheoryjs";

analyzeHarmony(midiToNoteStream(parseMidi(midiBytes)));
transcribeMelody(float32Samples, 44100);  // [{ pitch: A4, start, duration }, …]
```

Capturing audio and transcribing polyphony need a platform API or a model, so
those stay in your app — the library takes the notes and hands back the theory.

### Notation

Export notes, chords, scales, or full scores as ABC or MusicXML — key and time
signatures, dots and tuplets, ties across barlines — ready for any notation
program. Both formats read back in as beat-timed streams: ABC with its
rhythm, chords, and ties, MusicXML with parts and voices resolved.

```ts
import { toABC, fromABC, Scale } from "musictheoryjs";

toABC(Scale.from("C4", "major"));   // "X:1\nM:4/4\n..." — a complete ABC tune

const tune = fromABC("X:1\nT:Scale\nM:4/4\nK:D\nD2 E2 F2 G2 |]");
tune.notes.map(String);             // ["D4","E4","F#4","G4"] — F♯ from the key signature
tune.stream.map((e) => e.start);    // [0, 1, 2, 3] — the rhythm too, in quarter-note beats
```

### Beyond 12-TET

Frequency comes from a tuning you pass in. Twelve-tone equal temperament is
the default because it's what most people want, but it isn't wired into the
core. Equal temperaments of any size, Pythagorean, meantone, Just Intonation,
a maqam defined in cents, or a Scala file are all ordinary tunings.

```ts
import { equalTemperament, maqamTuning, justDeviations, scaleFromTuning } from "musictheoryjs";

scaleFromTuning(equalTemperament(24)); // quarter tones — 24 equal divisions
justDeviations()[4].difference;        // 13.69 — what 12-TET costs the third

// Maqam Rast, with the neutral third and seventh 12-TET cannot express.
const rast = maqamTuning("rast");
[0, 1, 2].map((d) => Math.round(rast.centsForDegree(d))); // [0, 200, 350]
```

These are real tunings, not 12-TET scales wearing foreign names. The presets
cover **7 maqamat** (`rast`, `bayati`, `hijaz`, `saba`, `kurd`, `nahawand`,
`ajam`) with their three-quarter-tone degrees, **10 ragas** tuned to
just-intonation shrutis, and Javanese **slendro** and **pelog**:

```ts
import { maqamTuning, ragaTuning, slendro, MAQAM_NAMES, RAGA_NAMES } from "musictheoryjs";

MAQAM_NAMES.length;                                     // 7
RAGA_NAMES.length;                                      // 10
Math.round(ragaTuning("bhairav").centsForDegree(2));    // 386 — a pure major third
Math.round(slendro().centsForDegree(1));                // 231 — not any 12-TET step
```

Anything else you can define: `centsTuning`, `ratioTuning`, `edo(n)`, or a
Scala `.scl` file via `scalaTuning`.

`retuneMidi` applies any of these tunings to a real MIDI file with per-note
pitch bends.

### Dictionaries you can extend

The 108 chord qualities and 92 scales are a starting point, not a ceiling.
Register your own at runtime and the whole library adopts it — building,
symbol parsing, printing, detection, chord-scale matching, Roman numerals.
Nothing has to be forked to teach it a chord.

```ts
import {
  addChordType, addScaleType, Chord, Scale, detectScales,
  resetChordTypes, resetScaleTypes,
} from "musictheoryjs";

addChordType("so4", "P1 P4 P5 M9", { suffix: "so4", aliases: ["sowhat"] });
Chord.from("Csowhat").noteNames();  // ["C4","F4","G4","D5"] — the So What voicing
Chord.from("Cso4").toString();      // "Cso4"

addScaleType("hexatonicDream", "P1 M2 M3 A4 M6 M7", { aliases: ["dream"] });
Scale.from("C4", "dream").noteNames();          // ["C4","D4","E4","F#4","A4","B4"]
detectScales(["C4","D4","E4","F#4","A4","B4"])[0]?.name;  // "hexatonicDream"

resetChordTypes();  // put the built-in dictionaries back
resetScaleTypes();
```

---

## Why the answers come out right

Most music code stores a note as a number from 0 to 11 and guesses at a name
when it has to print one. That guess is where wrong answers come from: a minor
third above C that comes back as D♯, a "D♯ major" scale nobody would write,
tunings that cannot tell G♯ from A♭ even though meantone makes them audibly
different. MusicTheoryJS stores the note itself — letter, accidental, octave —
and does interval arithmetic on that, so every chord tone, scale degree, and
analysis is the note a musician would actually write. There is no guessing step
for a bug to hide in.

```ts
import { Note, Scale, interval, intervalBetween, intervalName } from "musictheoryjs";

new Note("E#4").equals("F4");        // false — different notes
new Note("E#4").isEnharmonic("F4");  // true  — same pitch
new Note("C4").transpose(interval(4, "d")).toString(); // "Fb4" — a diminished fourth, spelled right
Scale.from("Cb4", "major").noteNames();  // ["Cb4","Db4","Eb4","Fb4","Gb4","Ab4","Bb4"]

// Intervals invert transposition exactly, and a test holds it there.
intervalName(intervalBetween(new Note("C4"), new Note("F#4"))); // "A4"
```

**This is about storage, not about what you may pass in.** Numbers are a
first-class input everywhere: transpose by a bare semitone count, build a scale
or chord from a semitone pattern, move by scale steps, or come in from MIDI.
Spelling is chosen for you on the way out.

```ts
import { Note, Scale, Chord, intervalFromSemitones, intervalName, scaleStep } from "musictheoryjs";

Note.from("C4").transpose(7).toString();             // "G4" — semitones work directly
Note.fromMidi(61).toString();                        // "C#4"
Chord.fromSemitones("C4", [0, 4, 7]).noteNames();    // ["C4","E4","G4"]
Scale.fromSemitones("C4", [0, 2, 4, 5, 7, 9, 11]).noteNames();
intervalName(intervalFromSemitones(7));              // "P5"
scaleStep("C4 major", "C4", 2).toString();           // "E4" — up two scale steps
Note.from("C#4").midi;                               // 61 — and back out again
```

## Classes or functions

`Note`, `Scale`, `Chord`, and `Key` are ergonomic wrappers over plain functions,
and the functions are exported too. Use whichever fits — the functional layer is
there when you want a functional style or the absolute smallest bundle.

```ts
import { transpose, interval } from "musictheoryjs/interval";
import { spelled } from "musictheoryjs";

transpose(spelled(0, 0, 4), interval(5, "P")); // a SpelledPitch for G4
```

---

## Development

```bash
bun install
bun test          # test suite
bun run typecheck
bun run lint
bun run build     # ESM + CJS + .d.ts
bun run e2e       # exercises the built package (ESM and CJS)
```

The docs site in [`docs/`](docs) is a separate Astro project: `bun run docs:dev`
to work on it, `bun run docs:build` to build it.

Releases go through Changesets — see [RELEASING.md](RELEASING.md), and
[ROADMAP.md](ROADMAP.md) for what's planned.

## License

[ISC](LICENSE.txt) © 2020-2026 Zach Moore
