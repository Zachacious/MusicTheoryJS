---
"musictheoryjs": minor
---

Harmony everywhere (roadmap Phase 3). Everything is additive.

- Diatonic chords for any scale: `scaleChord`/`scaleChords` stack alternating
  degrees on every step of any template — melodic minor, harmonic major,
  bebop, or custom intervals — with qualities detected from the dictionary.
- Deeper keys: `harmonicFunction`/`harmonicFunctions` label every degree
  T/SD/D; `secondaryDominant`, `relatedTwo` (m7 over major targets, m7b5
  over minor ones), and `tritoneSubstitute` cover tonicization; minor keys
  answer in all three flavours via a `variant` option on scales, chords, and
  function labels (`variantScale("harmonic")`, `chord(7, { variant:
  "harmonic" })`).
- A standalone Roman-numeral module with round-trip parsing:
  `parseRomanNumeral`/`formatRomanNumeral` handle case, `°`/`ø`/`+` markers,
  any chord-dictionary suffix (`V13`, `iiø7`, `Imaj9#11`), figured-bass
  inversions (`V65`, `I64`, `V2`), and secondary functions (`V7/V`,
  `vii°7/V`, `V/V/V`); `romanToChord` resolves in a key (inversions voiced)
  and `chordToRoman` analyzes back, detecting applied dominants (`A7` in C
  major → `V7/ii`) and reading harmonic/melodic-minor chords as diatonic.
- Progressions: `parseProgression` mixes Roman numerals, chord symbols, and
  `N.C.` slots in one input, labelling every step with its chord, numeral,
  and T/SD/D function; `COMMON_PROGRESSIONS` ships named patterns (12-bar
  blues, ii–V–I, andalusian, …); `progressionChords`/`progressionRomans`
  convert whole progressions either direction; `suggestNextChords` ranks
  likely continuations by root motion, functional movement, and resolution
  of pending applied dominants.
- Modulation detection: `detectModulations` splits a note stream into key
  segments with windowed Krumhansl–Schmuckler scanning, density-adaptive
  window defaults, and transition-window rejection, so a two-key performance
  comes back as two segments with a clean boundary.
