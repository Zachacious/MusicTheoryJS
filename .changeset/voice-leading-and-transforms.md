---
"musictheoryjs": minor
---

Voice leading and transforms (roadmap Phase 4). Everything is additive.

- A voice-leading engine on spelled pitches: `voiceChord` builds an initial
  voicing (root in the bass, tones covered root > third > seventh > fifth);
  `nextVoicing` connects to the next chord with minimal total motion, no
  voice crossing, sensible doubling (non-root doubles are penalized), and —
  by default — no parallel fifths or octaves, judged on spelled intervals so
  a d5→P5 slide doesn't count; `voiceProgression` voices a whole progression
  in one call, `findParallels` and `voiceLeadingCost` expose the analysis
  pieces. Property-tested: random progressions never emit parallels, and
  when constraints are truly unsatisfiable the engine throws instead.
- Chord-scale matching with avoid-note awareness: `chordScales` ranks every
  scale containing a chord on its root, penalizing scale tones a half step
  above chord tones — so `Dm7` leads with dorian, `Cmaj7` with lydian, `G7`
  with lydian dominant, and `Bm7b5` with locrian ♮2, matching jazz practice.
- Transformational harmony: Neo-Riemannian `parallelTriad`, `relativeTriad`,
  and `leadingToneExchange` (each an involution, spelling and octave
  included) with `neoRiemannian` composing operation words ("PL", "PLP");
  `chromaticMediants` returns the four same-mode mediants; `negativeNote`
  and `negativeChord` reflect across a tonic's tonic–dominant axis, with the
  classic pairings (`G7` over C → `Fm6`).
