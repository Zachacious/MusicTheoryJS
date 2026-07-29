---
"musictheoryjs": minor
---

Notation and audio depth (roadmap Phase 6). Everything is additive, including
a new `musictheoryjs/notation` entry point.

- Notation export: `toABC` and `toMusicXML` render notes, chords, scales, or
  full scores — events with durations, stacked chords, rests, key and time
  signatures, tempo. ABC follows the format's real accidental rules (marks
  carry to the end of the measure, key-signature notes go unmarked), writes
  `(p:q:r` tuplet groups, and ties events split across barlines; MusicXML
  produces a `score-partwise` 4.0 document with `<chord/>` stacking,
  `<time-modification>` tuplets, tie/tied pairs, and rest-padded final
  measures. A tuplet crossing a barline throws rather than guessing.
- Melody transcription: `transcribeMelody` turns a monophonic recording into
  a `NoteStream` — YIN frame by frame, an RMS silence gate, spectral-flux
  onsets to separate repeated notes, despeckling, a minimum note length, and
  level-scaled velocities; `trackPitch` exposes the raw frame-by-frame track
  for vibrato and glide work.
- Constant-Q analysis: `cqt` computes log-spaced magnitude bins (one per
  semitone by default, `binsPerOctave`/`octaves`/`minFrequency` options) and
  `cqtChroma` folds them into a 12-bin chroma that keeps neighbouring bass
  semitones apart where the FFT blurs them.
- Tuning presets: `maqamTuning` (rast, bayati, hijaz, saba, kurd, nahawand,
  ajam as theoretical quarter-tone tables), `ragaTuning` (the ten Hindustani
  thaats as 5-limit just ratios), and representative gamelan `slendro`/
  `pelog` — each an ordinary `Tuning`, documented as starting points since
  real intonation varies.
- Tempered-versus-just: `compareTunings` lines up two tunings degree by
  degree; `justDeviations` gives the classic table of what a temperament
  trades against pure ratios (12-TET's third +13.7 cents, fifth −2).
- MIDI retuning: `retuneMidi` plays a file in any tuning by moving each note
  to the nearest key with the microtonal remainder as a per-note pitch bend
  (within ±50 cents), spreading notes across channels so simultaneous bends
  don't collide; the byte codec now writes per-note `bend` fields as
  pitch-bend events and folds bends back into notes on read.
