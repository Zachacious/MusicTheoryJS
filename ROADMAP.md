# Roadmap

Where the library is and where it's going. The work is organized into phases,
each shippable on its own; no dates, just order.

## Shipped (3.0)

- Spelled pitch model: notes keep letter, accidental, and octave; correct
  enharmonics, interval spelling, and key signatures.
- Notes, intervals (spelled + generic), transposition.
- Scales: 46 templates, modes, detection from a set of notes.
- Chords: 32 qualities, symbol parsing, detection, voicings (drop2/drop3/spread).
- Keys: signatures, diatonic chords, Roman numerals both directions,
  progression parsing, relative/parallel.
- Tuning: pluggable system with equal temperaments, Pythagorean, meantone, Just
  Intonation, custom cents/ratio tables, and Scala (`.scl`) import.
- Analysis: Krumhansl–Schmuckler key detection, chord-over-time, cadence
  detection, pitch-class set theory.
- MIDI: Standard MIDI File read/write, tick/second conversion.
- Audio (dependency-free DSP over sample buffers): FFT, YIN pitch detection,
  chroma, spectral-flux onset detection.
- Packaging: ESM + CJS, full types, nine tree-shakable entry points, zero
  runtime dependencies, provenance on publish.
- Docs site (Astro + Starlight + Tailwind) with guides and a TypeDoc API
  reference; end-to-end tested against the built package.

## Phase 1 — Open the API

Nothing in the library should require constructing a class instance, and no
value should be a dead end.

- [x] Parse interval names (`"P5"`, `"-m3"`) the way note names parse today.
- [x] Numbers as a first-class path: transpose by a bare semitone count,
      intervals from a semitone count with a sensible default spelling, scale
      and chord templates from semitone patterns like `[0, 4, 7]`, and
      diatonic movement — "up two scale steps" — within any scale. Spelling
      stays automatic (with a sharp/flat preference) when numeric values come
      back out as names.
- [x] Accept a symbol string or a plain object anywhere a chord, scale, or key
      is expected, the way note functions already take `"C#4"` or
      `{step, alteration}`.
- [x] Free-function equivalents of the class methods.
- [x] `transpose` for Scale, Chord, and Key, plus a bulk transpose for arrays
      of notes.
- [x] `toJSON`/`fromJSON` round-trips for Note, Scale, Chord, and Key.
- [x] A `frequency` getter on Note; analysis functions accept plain note
      objects, not only Note instances.
- [x] Ranges: generate runs of notes between two pitches, chromatic or
      filtered through a scale.
- [x] Test infrastructure: doctests that execute every `@example` block in the
      source, differential tests against a reference implementation
      (dev-dependency only, never shipped), and a benchmark suite.

## Phase 2 — Dictionaries and detection

Recognize what musicians actually write.

- [ ] Grow from 32 chord qualities and 46 scales to roughly 106 and 92,
      generated from one source of truth and tested against a corpus of
      real-world chord symbols.
- [ ] Pitch-class sets as 12-bit masks, so detection and subset queries
      ("which scales contain these notes") are single integer operations.
- [ ] Scale detection matches subsets, not only exact note counts.
- [ ] Key-aware enharmonic respelling (the current simplifier ignores
      context).

## Phase 3 — Harmony everywhere

Answer harmony questions in any key or scale, not only major and minor.

- [ ] Diatonic chords for each degree of any scale template.
- [ ] Deeper keys: tonic/subdominant/dominant labels, secondary dominants with
      their related ii chords, tritone substitutes, and natural/harmonic/
      melodic variants for minor keys.
- [ ] A standalone roman-numeral module with round-trip parsing.
- [ ] Progressions: roman-numeral and symbol parsing (including `N.C.` slots),
      a library of named progressions (12-bar blues, ii–V–I, …), per-step
      function labels, and next-chord suggestion.
- [ ] Modulation detection in the analysis layer.

## Phase 4 — Voice leading and transforms

Connect chords the way arrangers do.

- [ ] Voice leading: initial voicings, minimal-motion connection between
      chords with parallel-fifth/octave rejection and sensible doubling, and
      voicing a whole progression in one call.
- [ ] Chord-scale matching ranked with avoid-note awareness.
- [ ] Neo-Riemannian P/L/R operations, chromatic mediants, and negative
      harmony.

## Phase 5 — Rhythm and meter

Give time the same footing as pitch.

- [ ] Time signatures, note-value durations, dots, and tuplets.
- [ ] Beat/subdivision helpers and quantization for the analysis and MIDI
      layers.
- [ ] Surface time-signature meta events when reading MIDI files (tempo
      already is).

## Phase 6 — Notation and audio depth

Get music in and out in more forms.

- [ ] MusicXML and/or ABC export from notes, chords, and scales.
- [ ] Pitch tracking over time: a monophonic melody transcriber built on the
      existing YIN + onset pieces, and a constant-Q option for chroma.
- [ ] Tuning presets (common maqamat, ragas, gamelan slendro/pelog),
      tempered-versus-just comparison, and retuning a MIDI file.

## Phase 7 — Docs that play

- [ ] Runnable examples in the guides — edit the code, hear or see the result —
      using the library directly in the browser.
- [ ] A migration guide from 2.x, verified by execution.

## Not planned

- Audio capture and **polyphonic** transcription. These need platform APIs or a
  trained model and belong in the app that feeds notes into this library, which
  keeps the core symbolic and dependency-free.

Have a request or a correction? Open an issue:
https://github.com/Zachacious/MusicTheoryJS/issues
