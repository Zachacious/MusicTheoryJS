---
title: Sequencing
description: "Place notes in time: melodies, arpeggios, comped progressions, walking bass, swing, motif transforms, and song form — then write MIDI or a score."
---

Everything else in the library answers "what notes". The sequence module
answers "when": it places notes on a timeline, and connects that timeline to
MIDI, notation, and the analysis layer.

Time is measured in quarter-note beats — beat 1.0 is one quarter note after
beat 0. Beats are how composition thinks, and they convert exactly: a MIDI
tick is defined per quarter note, so `beats × PPQ` is the tick, with no tempo
rounding anywhere.

A stream is a plain array of `{ pitch, start, duration }` events — the same
shape the analysis module reads — so every function here is a pure function
from stream to stream, and everything composes.

## Melodies

`melody` takes pitches and durations. One duration applies to every note; an
array cycles; `null` is a rest — it takes time and sounds nothing.

```ts
import { melody } from "musictheoryjs";

melody(["C4", "E4", "G4"], "8").map((e) => e.start); // [0, 0.5, 1]
melody(["C4", null, "G4"], "q").map((e) => e.start); // [0, 2] — the rest kept its beat
melody(["C4", "D4", "E4"], ["q.", "8"]).map((e) => e.start); // [0, 1.5, 2] — durations cycle
```

`patternMelody` is the drum-machine view: pitches land on the onsets of a
[rhythm pattern](/guides/patterns/).

```ts
import { patternMelody, euclideanRhythm } from "musictheoryjs";

const line = patternMelody(["C3", "Eb3", "G3"], euclideanRhythm(8, 3));
line.map((e) => e.start); // [0, 1.5, 3] — the tresillo, as eighths
```

## Combining streams

Streams concatenate in sequence, merge in parallel, shift, slice, and loop.
Lengths come from `streamDuration` unless you fix them.

```ts
import { melody, concatStreams, mergeStreams, loopStream, streamDuration } from "musictheoryjs";

const a = melody(["C4", "E4"], "q");
const b = melody(["G4"], "h");
streamDuration(concatStreams(a, b)); // 4 — b starts where a ends
mergeStreams(a, b).length;           // 3 — together from beat 0
loopStream(a, 2, { length: 4 }).map((e) => e.start); // [0, 1, 4, 5] — loop on the bar
```

`sliceStream` cuts a time window — bars 5–8 of a song, the beats under one
chord. Events crossing an edge are truncated there, and the result starts at
beat 0, ready to loop or concatenate (pass `keepPosition: true` to keep the
original beats).

```ts
import { melody, sliceStream, loopStream } from "musictheoryjs";

const line = melody(["C4", "D4", "E4", "F4"], "q");
sliceStream(line, 1, 3).map((e) => e.pitch.toString()); // ["D4", "E4"]
loopStream(sliceStream(line, 2), 2).map((e) => e.start); // [0, 1, 2, 3]
```

## Arpeggios and strums

Both take anything a chord function takes — a symbol, a `Chord`, or a plain
list of pitches (a voicing from the [voice-leading tools](/guides/chords/),
say).

```ts
import { arpeggiate, strum } from "musictheoryjs";

arpeggiate("Am").map((e) => e.pitch.toString());  // ["A4", "C5", "E5"]
arpeggiate("Am", { pattern: "updown", octaves: 2 }).length; // 10
arpeggiate("C", { pattern: [0, 2, 1, 2], duration: "16" }).length; // 4

// A downstroke reaches the low string first; all voices ring to the end.
strum("G", { spread: 0.04 }).map((e) => e.pitch.toString()); // ["G4", "B4", "D5"]
```

## Progressions, played

`compProgression` goes from Roman numerals to sounding events in one call:
each chord gets a bar (or `beatsPerChord`), hit on the onsets of a rhythm
pattern, voiced by the voice-leading engine so the changes connect smoothly.

```ts
import { compProgression, compChords } from "musictheoryjs";

const played = compProgression("Bb major", "ii-V-I");
played.length; // 12 — three chords, four voices each

// A comp rhythm: hits sustain to the next onset. N.C. slots stay silent.
compChords(["Dm7", "G7"], { rhythm: [1, 0, 0, 1, 0, 0, 0, 0] }).length; // 16
```

`bassline` walks underneath. The walking style is deterministic: root on the
downbeat, chord tones between, and a chromatic approach into the next root —
the final bar turns around toward the first.

```ts
import { bassline } from "musictheoryjs";

const walk = bassline(["Dm7", "G7", "Cmaj7"]);
walk.length; // 12 — quarter notes
walk[0].pitch.toString(); // "D2"

bassline(["C"], { style: "root-fifth" }).map((e) => e.pitch.toString()); // ["C2", "G1"]
```

## Groove

Swing is a piecewise-linear warp of each beat pair, so notes *inside* the
pair (sixteenths under swung eighths) bend proportionally instead of landing
off-grid. Accents follow the meter's felt grouping — including 3+2+2 in 7/8.
Humanize takes an `rng` so results can be reproducible.

```ts
import { melody, swing, accent, humanize, gate } from "musictheoryjs";

const bar = melody(["C4", "D4", "E4", "F4"], "8");
swing(bar)[1].start;                  // 0.666… — triplet swing (the default 2:1)
swing(bar, { ratio: 0.75 })[1].start; // 0.75 — a hard shuffle

accent(bar, "4/4")[0].velocity;       // 96 — the downbeat, pushed
humanize(bar, { rng: () => 0.5 }).length; // 4 — deterministic with a fixed rng
gate(bar, 0.5)[0].duration;           // 0.25 — staccato
```

`rampVelocity` is the crescendo mark: velocities interpolate from one value
to another across the span (by default first onset to last, so the final
note lands exactly on the target). Ramp first, then `accent`, and the
meter's bumps ride on top of the dynamic shape.

```ts
import { melody, rampVelocity } from "musictheoryjs";

const rise = melody(["C4", "D4", "E4", "F4", "G4"], "q");
rampVelocity(rise, 40, 120).map((e) => e.velocity); // [40, 60, 80, 100, 120]
rampVelocity(rise, 120, 40, { start: 2 })[0].velocity; // undefined — outside the span, untouched
```

## Drum tracks

`drumPattern` lays drum-machine grids onto General MIDI percussion, one
line per instrument — `x` a hit, `X` an accented hit, `.` a rest, sixteenth
steps by default. `GM_DRUMS` names the note numbers, and a rhythm-module
pattern (Euclidean, hex, weighted) works as a line too:

```ts
import { drumPattern, euclideanRhythm, sequenceToMidi } from "musictheoryjs";

const groove = drumPattern({
  kick: "x...x...x...x...",
  snare: "....x.......x...",
  hihat: "x.x.x.x.x.x.x.x.",
  cowbell: euclideanRhythm(16, 5),
});

// Channel 9 is where GM players listen for drums.
sequenceToMidi(groove, { channel: 9, bpm: 96 });
```

The result is an ordinary beat-timed stream, so it merges with the band and
takes `swing`, `humanize`, and the rest of the groove toolkit.

## Motif transforms

The operations development is built from, in the spelled world: the mirror
of a major third above C is A♭ below it, not G♯.

```ts
import { melody, retrograde, invertMelody, augment, diatonicSequence } from "musictheoryjs";

const motif = melody(["C4", "E4", "D4"], "8");

retrograde(motif).map((e) => e.pitch.toString());        // ["D4", "E4", "C4"]
invertMelody(motif, "C4").map((e) => e.pitch.toString());  // ["C4", "Ab3", "Bb3"]
invertMelody(motif, "C4", "C4 major").map((e) => e.pitch.toString()); // ["C4", "A3", "B3"]
augment(motif, 2).map((e) => e.start);                    // [0, 1, 2] — half speed

// The classical sequence: the figure restated down the scale.
const seq = diatonicSequence(motif, "C4 major", -1, { times: 3 });
seq.slice(3, 6).map((e) => e.pitch.toString()); // ["B3", "D4", "C4"]
```

## Song form

`songForm` expands a letter scheme over named parts into one flat timeline,
and reports where each section landed.

```ts
import { melody, songForm } from "musictheoryjs";

const A = melody(["C4", "E4", "G4", "E4"], "q");
const B = melody(["F4", "A4", "F4", "D4"], "q");
const tune = songForm("AABA", { A, B });

tune.sections.map((s) => s.start); // [0, 4, 8, 12]
tune.stream.length;                // 16
```

## Out to MIDI, notation, and back

Beat-timed streams leave the module exactly: to a `MidiFile` (then
[`writeMidi`](/guides/midi/) for bytes), to a notation `Score` (then
[`toABC` or `toMusicXML`](/guides/notation/)), or back in from a parsed MIDI
file, tempo-independent. The notation importers return the same form —
`fromABC` and `fromMusicXML` both land tunes here as beat-timed streams.

```ts
import { melody, sequenceToMidi, midiToSequence, sequenceToScore, toABC } from "musictheoryjs";

const line = melody(["C4", "D4", "E4", null, "G4"], "q");

sequenceToMidi(line, { bpm: 140 }).tracks[0].notes[1].start; // 480 — one beat, exactly
midiToSequence(sequenceToMidi(line)).length; // 4 — back to beats, no tempo involved

toABC(sequenceToScore(line, { key: "C major" })).includes("z"); // true — the rest notated
```

`sequenceToScore` groups simultaneous events into chords and turns gaps into
rests. It refuses what a score cannot say — overlapping voices, or a
duration with no notatable value — with an error telling you to quantize,
rather than guessing.

Tempo doesn't have to be one number. A tempo map — beats paired with BPM,
each holding until the next — rides into the MIDI file as real tempo
events, comes back out with `midiTempoMap`, and `sequenceSeconds`
integrates it, so a ritardando lands in real time:

```ts
import { melody, sequenceToMidi, midiTempoMap, sequenceSeconds } from "musictheoryjs";

const slowing = [{ beat: 0, bpm: 120 }, { beat: 2, bpm: 60 }];
const line = melody(["C4", "E4", "G4"], "q");

midiTempoMap(sequenceToMidi(line, { tempoMap: slowing }));
// [{ beat: 0, bpm: 120 }, { beat: 2, bpm: 60 }] — through the file and back

sequenceSeconds(line, slowing).map((e) => e.start); // [0, 0.5, 1] — the last beat stretches
```

The whole path, end to end: a progression comped and swung, a bass walking
under it, out as a real MIDI file.

```ts
import { compProgression, bassline, swing, mergeStreams, transposeStream, sequenceToMidi, writeMidi } from "musictheoryjs";

const comp = swing(compProgression("F major", "ii-V-I", { rhythm: [1, 0, 1, 0, 0, 1, 0, 0] }));
const bass = transposeStream(bassline(["Gm7", "C7", "Fmaj7"]), -12);
const bytes = writeMidi(sequenceToMidi(mergeStreams(comp, bass), { bpm: 120 }));

bytes.length > 100; // true — a playable file
```

Or hear it right here — `sequenceSeconds` times a stream in seconds for Web
Audio:

```ts live
const comp = swing(compProgression("C major", "ii-V-I"));
const bass = bassline(["Dm7", "G7", "Cmaj7"]);
const song = mergeStreams(comp, bass);
log("events", song.length, "— beats", streamDuration(song));
play(sequenceSeconds(song, 150));
```
