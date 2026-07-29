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

- [x] Grow from 32 chord qualities and 46 scales to 108 and 92, generated
      from one source of truth and tested against a corpus of real-world
      chord symbols.
- [x] Pitch-class sets as 12-bit masks, so detection and subset queries
      ("which scales contain these notes") are single integer operations.
- [x] Scale detection matches subsets, not only exact note counts.
- [x] Key-aware enharmonic respelling (the current simplifier ignores
      context).

## Phase 3 — Harmony everywhere

Answer harmony questions in any key or scale, not only major and minor.

- [x] Diatonic chords for each degree of any scale template.
- [x] Deeper keys: tonic/subdominant/dominant labels, secondary dominants with
      their related ii chords, tritone substitutes, and natural/harmonic/
      melodic variants for minor keys.
- [x] A standalone roman-numeral module with round-trip parsing.
- [x] Progressions: roman-numeral and symbol parsing (including `N.C.` slots),
      a library of named progressions (12-bar blues, ii–V–I, …), per-step
      function labels, and next-chord suggestion.
- [x] Modulation detection in the analysis layer.

## Phase 4 — Voice leading and transforms

Connect chords the way arrangers do.

- [x] Voice leading: initial voicings, minimal-motion connection between
      chords with parallel-fifth/octave rejection and sensible doubling, and
      voicing a whole progression in one call.
- [x] Chord-scale matching ranked with avoid-note awareness.
- [x] Neo-Riemannian P/L/R operations, chromatic mediants, and negative
      harmony.

## Phase 5 — Rhythm and meter

Give time the same footing as pitch.

- [x] Time signatures, note-value durations, dots, and tuplets.
- [x] Beat/subdivision helpers and quantization for the analysis and MIDI
      layers.
- [x] Surface time-signature meta events when reading MIDI files (tempo
      already is).

## Phase 6 — Notation and audio depth

Get music in and out in more forms.

- [x] MusicXML and/or ABC export from notes, chords, and scales.
- [x] Pitch tracking over time: a monophonic melody transcriber built on the
      existing YIN + onset pieces, and a constant-Q option for chroma.
- [x] Tuning presets (common maqamat, ragas, gamelan slendro/pelog),
      tempered-versus-just comparison, and retuning a MIDI file.

## Phase 7 — Docs that play

- [x] Runnable examples in the guides — edit the code, hear or see the result —
      using the library directly in the browser.
- [x] A migration guide from 2.x, verified by execution.

## Phase 8 — Close the gaps

Nothing a musician can do in another theory library should be missing here,
and the paths everyone hits should be the fastest ones.

- [x] Interval arithmetic completed: inversion, simplification of compounds,
      subtraction, stacked fifths, and a list of the simple interval names.
- [x] Notes: transposition around the circle of fifths (keeping the circle's
      spelling, so six fifths up is F# and six down is Gb), plus sorting by
      sounding pitch with and without duplicates.
- [x] A `collection` module for the array work music code keeps redoing:
      numeric ranges, rotation, permutations, shuffling, compaction.
- [x] Pitch-class sets gained rotations (the modes of a set), snapping a MIDI
      note to the nearest set member, and walking a set as a scale by step or
      by degree.
- [x] Relating modes: the interval between two modes of one parent, and
      re-rooting a mode onto the tonic that shares its notes.
- [x] Subset and superset queries over the dictionaries, for scales and chord
      qualities alike — what a scale widens into, what it narrows to.
- [x] Rhythm patterns: Euclidean distribution, inter-onset construction, hex
      shorthand both ways, rotation, and weighted or plain randomness.
- [x] Named voicing dictionaries — rootless left-hand jazz shapes and triad
      inversions — realised on any root.
- [x] ABC import to match the export: single pitches, and whole tunes with
      their header fields, honouring ABC's measure-accidental rule.
- [x] **Open dictionaries.** Chord qualities and scale templates can be
      registered, removed, and reset at runtime, and everything derived from
      them — symbol parsing, detection, chord-scale matching, Roman numerals —
      picks the change up immediately rather than caching a stale table.
- [x] Tunings addressable by name: a registry with the same shape as the chord
      and scale dictionaries (`registerTuning`, `getTuning`, `tuningNames`,
      remove/reset, version counter), seeded with 34 built-ins, so an app can
      store a user's tuning choice as a string. Every tuning-taking function
      accepts a name wherever it accepts an object.
- [x] Speed: memoized note and interval parsing, mode relations computed on
      pitch-class offsets instead of constructed scales, and chord-scale
      ranking that scores from masks and builds only the scales it returns.

## Not planned

- Audio capture and **polyphonic** transcription. These need platform APIs or a
  trained model and belong in the app that feeds notes into this library, which
  keeps the core symbolic and dependency-free.

Have a request or a correction? Open an issue:
https://github.com/Zachacious/MusicTheoryJS/issues
