---
"musictheoryjs": minor
---

A sequence module with drums and tempo maps, MusicXML and rhythm-aware ABC
import, and the analysis deep cuts: Forte set classes, counterpoint
checking, and twelve-tone rows.

**`musictheoryjs/sequence`** — notes placed in time. Streams are timed in
quarter-note beats and convert exactly to MIDI ticks, notation scores, or
seconds:

- Melodies from pitches and durations (`melody`, with rests and cycling
  durations) or from rhythm patterns (`patternMelody`), combined in time
  with `concatStreams`, `mergeStreams`, `shiftStream`, `loopStream`,
  `transposeStream`.
- `arpeggiate` (named contours or explicit index patterns, octave
  extension) and `strum` (spread, direction, voices releasing together).
- `compProgression` — Roman numerals in a key to voice-led, rhythm-placed
  events in one call; `compChords` for chord lists (with `N.C.` silences);
  `bassline` with roots, root–fifth, and a deterministic walking style with
  chromatic approach tones.
- Groove: `swing` as a piecewise-linear warp (inner subdivisions bend
  proportionally), meter-aware `accent` (correct in irregular meters),
  reproducible `humanize`, `gate`, and `rampVelocity` — crescendos and
  diminuendos as linear velocity ramps over a beat span.
- `sliceStream` — a time window cut from a stream, truncated at the edges
  and re-zeroed so it loops and concatenates (or kept in place with
  `keepPosition`).
- Motif transforms: `retrograde`, `invertMelody` (spelled chromatic mirror,
  or tonal within a scale), `augment`, and the classical `diatonicSequence`
  (chromatic neighbours ride their anchor tone).
- `songForm` expands "AABA" (or named sections) over parts into one
  timeline with section boundaries.
- Conversions: `sequenceToMidi` / `midiToSequence` (beats ↔ ticks, exact),
  `sequenceToScore` (chords grouped, gaps to rests, triplets kept — refuses
  what a score cannot express), `sequenceSeconds`.
- Drum tracks: `GM_DRUMS` names the General MIDI percussion notes, and
  `drumPattern` lays drum-machine grids (`"x..X"` strings with accents, or
  any rhythm pattern) onto a stream ready for channel-9 MIDI.
- Tempo maps: `sequenceSeconds` and `sequenceToMidi` take beat/BPM points
  (each tempo holding until the next), and `midiTempoMap` reads a file's
  tempo changes back in beats — so a ritardando survives the whole trip.

**MusicXML import** — `fromMusicXML` in the notation module reads
`score-partwise` and `score-timewise` documents with a dependency-free XML
reader: spelled pitches, chords, ties merged across barlines, multiple
voices via backup/forward, multiple parts, and title/key/time/tempo. The
result is a beat-timed stream per part, ready for the sequence, analysis,
and MIDI layers.

**ABC import reads rhythm** — `fromABC` used to skip durations; now the
tune's body also comes back as the same kind of beat-timed `stream`:
duration factors against the unit note length (`L:`, or the standard's
default from the meter), broken rhythms (`>`, `<`), rests as gaps,
`(p:q:r` tuplet groups, chords stacked at one onset, ties merged into
single events (keeping their accidental across the barline), and the `Q:`
field as `tempo` in quarter-note BPM. `notes` still lists every written
pitch, so existing callers see what they saw before.

**MIDI tempo maps** — a parsed file now keeps every FF 51 tempo event
(`tempoMap`, in tick order), `writeMidi` writes them all back, and
`midiToNoteStream` integrates over them so seconds stay honest through
tempo changes.

**Set theory completed** — `pcsetInvert`, `pcsetComplement`,
`pcsetNormalForm`, `pcsetPrimeForm` (Rahn's convention), and
`pcsetIntervalVector` join the mask primitives; `forteName`,
`fortePrimeForm`, and `forteZMate` cover the full Forte catalog — all 224
set classes, validated structurally in tests.

**Counterpoint checking** — `checkCounterpoint` examines two lines against
the classical rules: parallel fifths and octaves (antiparallels included),
direct fifths and octaves, voice crossing, and voice overlap, each issue
timed and pinned to its notes.

**Twelve-tone rows** — `toneRow`, `rowTransform` (all 48 P/I/R/RI forms),
`rowMatrix`, and `identifyRowForm` for naming which form a passage states.

Also: passing a progression where a key belongs
(`parseProgression("ii7 V7 I", "C major")`) now names the real mistake —
the arguments are swapped — instead of only "invalid key".
