# Roadmap

Where the library is and where it's going. This isn't a promise of dates, just
the order things are likely to happen in.

## Done (v3.0)

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

## Next

- **Voice leading**: cost between chords, smooth-voicing search, part-writing
  checks (parallels, spacing).
- **Chord function / harmonic analysis**: tonic/subdominant/dominant labelling,
  secondary dominants (`V/V`), modulation detection.
- **Scale/chord relationships**: nearest scales for a chord, chord-scale
  suggestions, negative harmony.
- **More templates**: the remaining exotic scales and altered/extended chords
  from the long tail, with correct spelling.
- **Rhythm & meter**: time signatures, beat/subdivision helpers, quantization
  for the analysis and MIDI layers.

## Later

- **Notation output**: MusicXML and/or ABC export from notes, chords, and scales.
- **Better audio**: pitch tracking over time (a monophonic melody transcriber
  built on the existing YIN + onset pieces), constant-Q option for chroma.
- **Tuning depth**: named preset library (common maqamat, ragas, gamelan
  slendro/pelog), tempered vs. just comparisons, retuning a MIDI file.
- **Interactive docs**: runnable examples in the guides (edit the code, hear or
  see the result) using the library directly in the browser.

## Not planned

- Audio capture and **polyphonic** transcription. These need platform APIs or a
  trained model and belong in the app that feeds notes into this library, which
  keeps the core symbolic and dependency-free.

Have a request or a correction? Open an issue:
https://github.com/Zachacious/MusicTheoryJS/issues
