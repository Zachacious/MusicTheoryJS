---
"musictheoryjs": patch
---

Docs that play (roadmap Phase 7). No library code changes — the docs site and
the guarantees around it grew:

- Every guide now has editable, runnable examples that execute the real
  library in the browser (bundled straight from the repo source), with
  `log(…)` output panels and a `play(…)` helper that sounds notes, chords,
  scales, note streams, and tuned degrees through the Web Audio API — hear a
  maqam's neutral third from the tuning guide, or transcribe a melody you
  synthesized in the audio guide.
- A migration guide from 2.x maps every v2 concept (buildTables, Semitone,
  Modifier, Note mutators, `"C5(major)"` strings, Instrument) to its v3
  equivalent — and its snippets run in the test suite, so each `// =>` value
  on the page is asserted on every commit. The playground fences in the
  guides are executed the same way.
