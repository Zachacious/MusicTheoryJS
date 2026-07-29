---
title: Audio (DSP)
---

MusicTheoryJS includes a small, **dependency-free DSP toolkit** for turning audio
into notes: a radix-2 FFT, monophonic pitch detection and melody transcription,
FFT and constant-Q chroma extraction, and onset detection.

::: info The library never captures audio
It operates on **sample buffers you pass in** — typically a `Float32Array` you
obtained from the Web Audio API (`AnalyserNode`/`AudioBuffer`), a decoded file,
or a recording. Audio capture and **polyphonic** transcription (which needs a
trained model) are the client app's job; feed the results in as
[`NoteEvent`s](/guides/analysis/).
:::

## Pitch detection (monophonic, YIN)

`detectPitch` estimates the fundamental frequency of a single-voice frame;
`detectNote` spells it as the nearest `Note`.

```ts
import { detectPitch, detectNote } from "musictheoryjs";

// samples: Float32Array from the Web Audio API; sampleRate e.g. 44100
detectPitch(samples, 44100);              // frequency in Hz, or null if unpitched
detectNote(samples, 44100)?.toString();   // "A4"

// Tune the search range and strictness
detectPitch(samples, 44100, {
  minFrequency: 80,
  maxFrequency: 1200,
  threshold: 0.15,
});
```

## Melody transcription

`transcribeMelody` turns a monophonic recording into a
[`NoteStream`](/guides/analysis/): YIN pitch-tracks frame by frame, an RMS gate
drops silence, spectral-flux onsets separate repeated notes, and blips shorter
than `minNoteDuration` are discarded. `trackPitch` exposes the raw
frame-by-frame track (vibrato, glides, tuning drift) when you want the curve
rather than notes.

```ts
import { transcribeMelody, trackPitch, analyzeHarmony } from "musictheoryjs";

const notes = transcribeMelody(samples, 44100);
notes.map((e) => e.pitch.toString());   // ["A4", "C5", …] with starts/durations
analyzeHarmony(notes);                   // straight into the analysis layer

trackPitch(samples, 44100);              // [{ time, frequency, rms }, …]
transcribeMelody(samples, 44100, {
  minNoteDuration: 0.1,                  // ignore anything shorter
  silenceThreshold: 0.02,                // RMS gate
  prefer: "flat",                        // spell detected notes with flats
});
```

Strictly monophonic — one voice at a time. Polyphony needs a trained model and
belongs in the client app.

## Chroma (pitch-class profile)

A chromagram folds the spectrum onto the 12 pitch classes — a tuning-robust
summary of "how much of each pitch class" is present. It feeds naturally into
key detection.

```ts
import { chromagram, detectKey } from "musictheoryjs";

const chroma = chromagram(samples, 44100); // Float64Array(12), normalised
chroma.indexOf(Math.max(...chroma));        // dominant pitch class (0 = C)

// Use it as weights for key detection
detectKey([...chroma]);
```

### Constant-Q chroma

The FFT spaces bins linearly in Hz, which blurs neighbouring semitones in the
bass. The constant-Q variant keeps one bin per semitone at every octave, so
low notes resolve cleanly:

```ts
import { cqt, cqtChroma } from "musictheoryjs";

cqtChroma(samples, 44100);              // Float64Array(12), sharper in the bass
cqt(samples, 44100);                    // the raw 84 log-spaced bins (C1 up)
cqt(samples, 44100, { binsPerOctave: 24, octaves: 5 }); // quarter-tone bins
```

## Onset detection

`detectOnsets` finds note/percussive onsets via spectral flux and returns their
times in seconds:

```ts
import { detectOnsets, spectralFlux } from "musictheoryjs";

detectOnsets(samples, 44100);                       // [0.51, 1.02, 1.48, …]
detectOnsets(samples, 44100, { frameSize: 2048, hop: 512, sensitivity: 2 });

spectralFlux(samples, { frameSize: 1024, hop: 512 }); // the raw novelty curve
```

## The FFT directly

```ts
import { fft, magnitudeSpectrum, nextPow2, hann } from "musictheoryjs";

magnitudeSpectrum(samples); // Float64Array — bin i ↔ i·sampleRate/fftSize
nextPow2(1000);             // 1024

// Or the in-place complex transform
const re = Float64Array.from(samples);
const im = new Float64Array(re.length);
fft(re, im);
```

## From audio to the rest of the library

`transcribeMelody` is the assembled pipeline — its output plugs straight into
[`analyzeHarmony`](/guides/analysis/), [`quantizeStream`](/guides/rhythm/),
[`noteStreamToMidi`](/guides/midi/), or the
[notation exporters](/guides/notation/). For polyphonic material, run a
dedicated model in your app and pass its notes in — the theory side stays the
same.
