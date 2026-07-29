---
"musictheoryjs": minor
---

Dictionaries and detection (roadmap Phase 2).

- The chord dictionary grows from 32 to 108 qualities and the scale dictionary
  from 46 to 92 scales, each generated from one source of truth
  (`CHORD_DEFINITIONS` / `SCALE_DEFINITIONS`) that also drives symbol parsing,
  printing, and detection. Every accepted chord suffix is tested against a
  corpus of real-world chord symbols, and every scale against a reference
  dictionary.
- Chord symbols now cover what charts actually print: altered dominants in
  every practical combination (`G7#5b9`, `C13b9#11`, `F7alt`), suspended
  extensions (`9sus4`, `13sus4`, `7sus4b9`), minor-major colours (`mMaj9`,
  `mMaj7b6`), sixth/add variants (`6#11`, `madd4`, `+add#9`), no-five
  voicings, quartal chords, and chart shorthands (`^7`, `-7`, `h7`, `alt7`,
  `2`) plus unicode accidentals in suffixes (`C7♭9`).
- Scale names gained aliases, including spaced spellings — `"melodic minor"`,
  `"dorian b2"`, and `"super locrian"` parse anywhere a scale name is
  accepted.
- Pitch-class sets as 12-bit masks: `pcsetOf`, `pcsetMask`, `pcsetIsSubset`,
  `pcsetTranspose`, and friends. Chord and scale detection run on these masks
  internally, so each candidate root is a couple of integer operations.
- Scale detection matches subsets, not only exact note counts:
  `scalesContaining(notes)` (or `detectScales(notes, { match: "subset" })`)
  answers "which scales contain these notes?", smallest scale first, including
  tonics the input never sounded.
- Key-aware enharmonic respelling: `key.respell(note)` / `respellInKey` spell
  a pitch the way the key would write it — scale spelling for diatonic notes,
  the harmonic chromatic convention for the rest.
- Breaking-in-spirit but chart-correct: `C11` now builds the third-less
  voicing (C G Bb D F), matching how the symbol is actually played; the old
  stacked-thirds set is no longer produced or detected. Scale detection
  reports one canonical name per scale instead of duplicate alias hits
  (`major`, not `major` *and* `ionian`).
