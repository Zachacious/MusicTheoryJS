---
"musictheoryjs": minor
---

Open the API (roadmap Phase 1). Everything is additive.

- Interval names parse: `parseInterval("P5")`, `tryParseInterval`, and
  interval-name round-trips with `intervalName`.
- Numbers as a first-class path: `transpose` accepts bare semitone counts,
  `intervalFromSemitones(7)` → P5, `Scale.fromSemitones`/`Chord.fromSemitones`
  build from patterns like `[0, 4, 7]`, and `Scale#step`/`scaleStep` move
  diatonically ("up two scale steps") within any scale.
- Chords, scales, and keys are accepted as symbol strings or plain objects
  everywhere (`ChordLike`/`ScaleLike`/`KeyLike`): voicings, modes, Roman
  numerals, and the new free functions all take `"Cmaj7"`, `"C4 major"`,
  `"f# minor"`, or `{root, quality}`-style specs directly.
- Free-function mirrors of the class APIs: `scale`, `scaleNotes`,
  `scaleDegree`, `scaleRange`, `chord`, `chordNotes`, `invertChord`, `key`,
  `keyChord`, `diatonicChords`, `keyProgression`, and friends.
- `transpose` on Scale, Chord, and Key, plus `transposeNotes` for arrays.
- `toJSON`/`fromJSON` round-trips for Note, Scale, Chord, and Key.
- `Note#frequency` getter; the analysis and MIDI layers accept plain
  `{pitch: "C4", start, duration}` events — no class construction needed.
- Ranges: `noteRange` (chromatic) and `scaleRange` (filtered through a scale).
