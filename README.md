# MusicTheoryJS

A music theory library for JavaScript and TypeScript: notes, intervals, chords, scales, progressions, and tuning systems — with first-class microtonal support.

> **Status: v3 is being rebuilt on a new, verified core and is not yet released** (`package.json` is marked private until the rebuild ships). The architecture, audit findings, and phased roadmap live in [REDESIGN.md](REDESIGN.md). The legacy v3 API currently served by the main entry point has known, documented defects and is being replaced module by module — don't build new work on it.

## The new core (complete, verified)

These modules are done, with **100% test coverage on every metric** and their behavior verified against an established reference implementation:

- **`src/core`** — spelled pitches and quality-carrying intervals. `Cb`, `B#`, and `F##` are distinct, representable values; `m3` and `A2` are different intervals; transposition and distance are exact letter arithmetic, so `transpose("Eb4", "P5")` is `Bb4` and the C♯ major scale spells with `E#` and `B#` — correct spelling is a property of the representation, not a preference table. Includes MIDI and frequency conversion with a configurable A4 reference and cents deviations, plus memoized string parsing (objects flow through with zero parsing).
- **`src/pcset`** — pitch-class sets as 12-bit integers: subset checks, equality, and transposition are single bitwise operations.
- **`src/dict`** — 106 chord types and 92 scale types (generated, deep-frozen, integrity-checked), lookup by name or alias, and **ranked detection** with discriminating scores: exact matches outrank inversions outrank partials, slash basses are identified from voicing, and input spelling is preserved.

How that's enforced: exhaustive property tests (40,000+ generated cases — e.g. `transpose(a, distance(a, b)) === b` over every spelled-pitch pair in the grid), differential corpora against a reference implementation (21,000-case transposition agreement), and error paths that throw typed `MusicTheoryError`s instead of returning silently wrong defaults.

## Legacy API (deprecated in place)

The main entry point still re-exports the legacy v3 modules (`createNote`, `createScale`, `createChord`, …) so existing consumers keep compiling while the rebuild proceeds:

```ts
import { createNote, createScale, createChord, transpose, PERFECT_FIFTH } from "musictheoryjs";

const c4 = createNote({ letter: "C", octave: 4 });
const cMajorScale = createScale(c4, "major");
const g7 = createChord(transpose(c4, PERFECT_FIFTH), "7");
```

These legacy modules carry the defects catalogued in [REDESIGN.md](REDESIGN.md) §2 and Appendix A. They are replaced (and deleted) phase by phase.

## Development

```bash
bun install
bun run test           # vitest suite
bun run test:coverage  # + v8 coverage (new modules held at 100%)
bun run typecheck      # src, tests, and scripts under strict TS
bun run build          # rollup bundles + rolled-up .d.ts
bun run generate:dict  # regenerate the chord/scale dictionaries
```

CI runs typecheck → test → build on every push and pull request.

## License

ISC — see [LICENSE.txt](LICENSE.txt).
