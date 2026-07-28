---
title: Audio (DSP)
---

MusicTheoryJS includes a small, **dependency-free DSP toolkit** for turning audio
into notes: a radix-2 FFT, monophonic pitch detection, chroma extraction, and
onset detection.

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

## A monophonic transcription sketch

Combining the pieces — detect onsets, then pitch-track each segment, then hand
the notes to the analysis engine:

```ts
import { detectOnsets, detectNote, analyzeHarmony } from "musictheoryjs";

const sr = 44100;
const onsets = detectOnsets(samples, sr);
const events = onsets.map((t, i) => {
  const start = Math.floor(t * sr);
  const end = Math.floor((onsets[i + 1] ?? samples.length / sr) * sr);
  const pitch = detectNote(samples.subarray(start, end), sr);
  return pitch ? { pitch, start: t, duration: (end - start) / sr } : null;
}).filter(Boolean);

analyzeHarmony(events);
```

For polyphonic material, run a dedicated model in your app and pass its notes to
[`analyzeHarmony`](/guides/analysis/) — the theory side stays the same.
