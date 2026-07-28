# MusicTheoryJS v3 — Audit, Architecture & Roadmap

> Status: **planning — approved direction, not yet started**
> Date: 2026-07-28
> Goal: ship the best music-theory library in the JavaScript ecosystem — correct where the incumbents are correct, richer where they're thin, faster where it counts, and unmatched in the areas they don't cover at all.

---

## 1. Executive summary

The current v3 source (`src/`) is a functional-style rewrite of v2 that was documented before it was verified. A full audit (every file read, claims verified by executing the library) found: a structurally broken enharmonic model, six confirmed high-severity bugs in core features, a test suite that does not run, ~900 lines of dead code, and packaging that contradicts its own docs.

**Decision: rebuild the core on a correct pitch representation rather than patch.** The current `Interval = number` model makes correct spelling *impossible in principle* — no amount of patching fixes that. Roughly 20% of the current code (the microtonal/cents math, several dictionaries, some analysis functions) is sound and gets salvaged.

**Competitive strategy:** match the leading libraries' correctness and dictionary breadth, beat them on type safety, error behavior, analysis depth, and performance — and own microtonality/tuning outright, which none of them meaningfully do.

---

## 2. Where v3 stands today (audit results)

### 2.1 Verified defects (confirmed by execution)

| # | Severity | Defect | Location |
|---|----------|--------|----------|
| 1 | Critical | `createModeFromMajor` / `createModalScale` **throw for every mode except Ionian** (transposes parent root the wrong direction, then octave-sensitive equality fails to find the root) | `src/scale/modes.ts:132` |
| 2 | Critical | `analyzeScaleBrightness` is **inverted** — C minor, Phrygian, Locrian all report `"very bright"`. Three successive scoring implementations exist; two are unreachable | `src/scale/analysis.ts:269` |
| 3 | Critical | **No interval-quality model.** `transpose(C4, MINOR_THIRD)` → `D#4` (should be `Eb4`). `Cm` spells C–D#–G, `C7` spells C–E–G–A#. Spelling comes from a fixed sharp/flat preference table, never from letter arithmetic | `src/interval.ts`, `src/note/operations.ts:229` |
| 4 | High | **Test suite does not run.** `__tests__/note/calculations.test.ts` fails TS compilation (written against a pre-`readonly` Note); `tsconfig.json` excludes tests so builds never notice. Real coverage: `src/interval.ts` only (28 lines of ~7,200) | `__tests__/` |
| 5 | High | Chord symbol parser **rejects** `Cm6`, `Cmin6`, `Caug7`, `Cdom7`, `CMaj7`, `C5`, `C7sus`, `Cadd2`; **`C+7` silently returns a plain major triad** (unmapped qualities default to `"major"` with no warning) | `src/chord/creation.ts:431`, `src/chord/constants.ts:346` |
| 6 | High | `detectScales` confidence **saturates at 1.0** — exact C major input returns `major`, `melodicMinor`, `ionian`, `lydian`, `mixolydian` all at 1.00; ranking is object iteration order. `detectKey` is right only because `major` is the first dictionary key | `src/scale/detection.ts:185` |
| 7 | High | Chords rooted outside octave 4 get a **spurious slash bass** in their symbol (`Am7/A`, `Bm7b5/B`) | `src/chord/creation.ts` |
| 8 | Med | `src/chord/symbols.ts` (555 lines) is **entirely dead** — zero importers; contains a second, divergent `parseChordSymbol`/`generateChordSymbol` | `src/chord/symbols.ts` |
| 9 | Med | `TUNING_SYSTEMS` defined **twice with incompatible shapes** — tunings registered via `registerTuningSystem` are invisible to `noteToFrequency` | `src/note/constants.ts:280` vs `src/tuning/tuning.ts:57` |
| 10 | Med | `retune()` never stores the A4 reference; re-derives against 440 after scaling. Documented example produces a different answer than the docs claim | `src/note/frequency.ts` |
| 11 | Med | `voiceChord(…, 'spread')` is a **no-op** (identity permutation); `getAllInversions` returns unfrozen objects with stale symbols | `src/chord/voicing.ts` |
| 12 | Med | Roman numeral parser silently **drops secondary functions** — `"V7/V"` parses as `V7`; parsed alterations collected then never applied (`// TODO`) | `src/chord/roman.ts` |
| 13 | Med | `suggestNextChords` with default options: all candidates tie at score 1 → returns first N scale degrees | `src/chord/progression.ts` |
| 14 | Med | `package.json` `exports` covers only `.`, `./note`, `./scale` — the documented `musictheoryjs/chord`, `/interval`, `/tuning` imports **do not resolve**. `main`/`module`/`types` point at files the build doesn't produce. License is simultaneously ISC (package.json), MIT (LIBRARY_INFO), and whatever `LICENSE.txt` says | `package.json` |

Full per-module inventory: **Appendix A**.

### 2.2 Root cause

Three systemic problems, not fourteen local ones:

1. **The data model can't represent the theory.** Intervals are bare semitone counts; note spelling is a 12-entry preference lookup (`Cb`, `B#`, `Fb`, `E#`, and all double accidentals are unreachable *outputs*). Everything downstream — chords, scales, tuning — inherits wrong spellings, and meantone/Pythagorean tuning (which *requires* G# ≠ Ab) is unimplementable.
2. **Nothing was verified.** Docs were bulk-written from intended behavior; `@example` blocks call APIs that don't exist (`createNote('C4')`). Duplicate implementations exist where one works and one doesn't (`getMode` ✅ vs `createModeFromMajor` ❌). The test suite silently rotted.
3. **No shared primitives.** `(a.pitchClassIndex − b.pitchClassIndex + 12) % 12` is re-derived at 14+ call sites; three ad-hoc note-string parsers exist; ~300 lines of superseded code were commented out instead of deleted.

---

## 3. The goal: best-in-class

### 3.1 What the leading libraries get right — we must match it

- **Exact enharmonic arithmetic** from a coordinate-based pitch encoding (spelling is a *byproduct of the representation*, near-zero code).
- **Breadth of dictionaries**: ~110 chord types, ~90 scales, robust symbol parsing.
- **Chroma/pcset engine** powering chord & scale detection.
- **Key module**: signatures, relative keys, harmonic-function tags, secondary dominants, substitute dominants.
- Small, pure, tree-shakeable functions; zero dependencies.

### 3.2 Where the incumbents fall short — where we win

| Incumbent weakness | Our answer |
|---|---|
| **Silent failure**: `Chord.get("Cmaj7x")` returns `{ empty: true }` — typos produce empty objects that flow downstream unnoticed | Creation functions **throw with a helpful message** ("Unknown chord quality `+7` — did you mean `aug7`?"); `tryParse*` variants return `null` for soft paths. No silent wrong answers, ever |
| **Stringly typed**: every input/output is `string`; TS can't catch `"C#4x"` or `"majr"` at compile time | Template-literal types for note names, typed quality/scale-name unions, rich frozen objects as first-class values. Strings accepted everywhere, but never required |
| **Re-parses on every call**: `Note.transpose("C4", "3m")` parses both strings each time (memoized, but still hashing) | Polymorphic API: pass objects through hot paths with zero parsing; memoized parse only at the string edge |
| **Microtonality: essentially none** — no cents, no EDO, no JI, no tuning systems, fixed A4 | First-class: cents on every pitch, EDO-generic arithmetic, JI ratios, spelled-pitch-aware temperaments, configurable A4, MIDI pitch-bend helpers. **This is the wedge — see 3.3** |
| **Thin analysis**: key detection is basic; voicing/voice-leading modules are minimal; no cadence/tension analysis | Krumhansl–Schmuckler key detection, real voice-leading engine, Neo-Riemannian transforms, negative harmony, cadence detection — see §5 |
| **Fragmented packaging** — leading alternatives split across 20+ scoped packages, a confusing install/versioning story | One package, subpath exports (`musictheoryjs/chord`), fully tree-shakeable |
| **Docs are terse**; examples not executed | Every public function documented with examples that run as tests (doctest pipeline) |
| chroma stored as **binary strings** (`"101011010101"`), set ops via string manipulation | chroma as **12-bit integers**, set ops as bitwise ops, dictionary lookup via `Map<number, …>` — measurably faster detection |

### 3.3 The wedge: microtonality & tuning

No mainstream JS theory library does this well, and the audit found it's the one layer of current v3 that is genuinely solid (cents normalization, JI ratios, EDO systems, quarter-tone representation). Rebuilt on a correct core, we get things the incumbent libraries cannot express at all:

- Meantone/Pythagorean/well temperaments that correctly distinguish G# from Ab (requires spelled pitch — now possible).
- N-EDO as a *generalization* of the core arithmetic, not a bolt-on (12-EDO is just the default).
- JI with exact ratio arithmetic; cents everywhere; configurable reference pitch that is actually stored.
- Practical audio/MIDI bridges: `noteToFrequency` under any tuning, 14-bit pitch-bend values for microtonal MIDI playback.

Positioning: **"a best-in-class core, plus everything the existing libraries can't do."**

---

## 4. Architecture

### 4.1 Core pitch representation (the load-bearing decision)

Canonical pitch is **spelled**, not chromatic:

```ts
/** A spelled pitch class or pitch. Immutable. */
interface Pitch {
  readonly step: 0 | 1 | 2 | 3 | 4 | 5 | 6; // C D E F G A B (letter index)
  readonly alt: number;                      // …-2=bb, -1=b, 0=♮, 1=#, 2=##…  (unbounded)
  readonly oct?: number;                     // undefined ⇒ pitch class (octave-free)
  readonly cents?: number;                   // microtonal deviation from the spelled 12-TET pitch
}
```

Derived (computed once at creation, cached on the frozen object): `chroma` (0–11), `midi`, `name`. `Cb`, `B#`, `Fbb`, `G###` are all representable — `alt` is unbounded.

### 4.2 Intervals carry quality

```ts
/** A spelled interval. steps = letter distance, semitones = chromatic distance. */
interface Interval {
  readonly steps: number;      // 0=unison/2nd? no — diatonic steps: 0,1,2… (may be negative)
  readonly semitones: number;  // chromatic size (may be negative)
}
```

`(steps, semitones)` distinguishes m3 (1½ steps? no — steps=2, semitones=3) from A2 (steps=1, semitones=3). Quality (`P/M/m/A/d…`) and number are *derived*, not stored. Parsing accepts `"m3"`, `"3m"`, `"P5"`, `"A4"`; formatting emits `"m3"` style.

**Transposition becomes exact arithmetic** — the whole enharmonic problem dissolves into ~10 lines:

```ts
function transpose(p: Pitch, i: Interval): Pitch {
  const step = (p.step + i.steps) % 7;            // letter arithmetic (+ octave carry)
  const oct  = p.oct === undefined ? undefined
             : p.oct + Math.floor((p.step + i.steps) / 7);
  const alt  = p.alt + i.semitones - naturalSemitoneDistance(p.step, i.steps);
  return pitch(step, alt, oct, p.cents);
}
```

`Eb + P5 = Bb`. `C + m3 = Eb`. `G# + M3 = B#`. `distance(a, b)` inverts it exactly; `transpose(a, distance(a, b)) === b` becomes a property test. Spelling code elsewhere in the library: deleted.

### 4.3 Pitch-class-first

Most theory is octave-free. Scales, chords, keys, and sets operate on pitch classes by default (`oct: undefined`); octaves enter only for voicing, ranges, and audio. This removes the entire class of octave-equality bugs found in the audit (defects #1, #7) and matches how musicians think.

### 4.4 Chroma engine (pcset)

```ts
type Chroma = number; // 12-bit int, bit 0 = C … bit 11 = B. C major = 0b101010110101
```

- Subset/superset/equality = bitwise ops; rotation for modes = bit rotation.
- Chord & scale dictionaries indexed by chroma in a `Map<number, Entry[]>` → detection is a masked lookup + real scoring (shared/missing/extra weighted, cardinality-normalized), not the current saturating formula.
- One engine powers `Chord.detect`, `Scale.detect`, key detection, and "what scales contain this chord."

### 4.5 Polymorphic, string-friendly API

Every public function accepts strings *or* objects; objects flow through with zero parsing:

```ts
transpose("C4", "m3")          // "Eb4"  (string in → string out)
transpose(note("C4"), "m3")    // Pitch object (object in → object out)
chord("Cm7b5").notes           // ["C", "Eb", "Gb", "Bb"]
scale("C dorian").chords(7)    // seventh chords of the mode
key("Eb major").secondaryDominants
```

Memoized parsers (`Map` cache — the note/interval string space is tiny) make the string path fast; the object path is allocation-only.

### 4.6 Error policy

- `note("Q#4")`, `chord("C+7")` → **throw** `MusicTheoryError` with a suggestion when edit-distance finds one.
- `tryNote()`, `tryChord()`, `detect*()` → return `null` / empty arrays for expected-failure paths.
- No `console.warn` in library code. No silent defaults to `"major"`.

### 4.7 Microtonality integrated at the core

- `cents` lives on `Pitch` itself; all comparisons/formatting/frequency respect it (the salvaged v3 normalization math slots in here).
- `Edo(n)` contexts generalize step arithmetic; 24-EDO quarter-tone notation (`+`, `‡`, arrows) formats from it.
- `Tuning` is a single interface (the two incompatible `TUNING_SYSTEMS` collapse into one), keyed on **spelled** pitch so temperaments are finally correct, with a stored reference pitch (`A4 = 432` actually persists).
- `pitchBend(note, tuning)` → 14-bit MIDI pitch-bend for playback of anything non-12-TET.

### 4.8 Module layout

```
src/
  core/        pitch, interval, transpose, distance, parse/format, chroma  (zero deps, ~500 lines)
  note/        public note API (string-friendly wrappers, frequency, midi)
  pcset/       chroma ops, set analysis
  dict/        chord-type + scale-type data (generated, verified)
  chord/       chord(), detect, symbols (tokenizer), voicings
  scale/       scale(), modes, detection
  key/         majorKey/minorKey, signatures, secondary & substitute dominants
  roman/       roman numerals incl. secondary functions (V7/V)
  progression/ parsing, analysis, suggestion
  harmony/     voice leading, Neo-Riemannian, negative harmony, cadences
  micro/       cents, EDO, JI, quarter-tones
  tuning/      temperaments, custom tunings, pitch-bend
```

Every directory = one subpath export in `package.json`. `core` has zero internal dependencies; everything depends only downward.

---

## 5. Feature plan

### 5.1 Parity (table stakes)

| Feature | Leading libraries | Target |
|---|---|---|
| Note parse/format/props | ✅ | ✅ + literal types, cents |
| Intervals w/ quality, distance, add/subtract | ✅ | ✅ |
| Chord dictionary | ~110 types | ≥ the best available list (seed from license-compatible open-source data, verified) |
| Chord symbol parsing | robust | tokenizer: root · quality · extensions · alterations · add/omit · slash. Full jazz corpus incl. `C7alt`, `Cm(maj7)`, `C13#11`, `C5`, `N.C.` |
| Chord detection | ✅ | ✅ ranked, with inversion/slash awareness |
| Scale dictionary + modes | ~90 | ≥ 90, mode arithmetic via chroma rotation (one implementation, not two) |
| Key module | ✅ rich | ✅ full parity (signatures, functions, secondary/substitute dominants) |
| Roman numerals | ✅ | ✅ + secondary functions, applied chords, figured-bass inversions |
| Progressions | ✅ | ✅ + analysis (see below) |
| Range/collection utils | ✅ | ✅ |
| MIDI/freq conversions | ✅ | ✅ + configurable A4, cents, pitch-bend |

### 5.2 Beyond parity (differentiators)

1. **Microtonality & tuning** (§3.3) — the headline.
2. **Key detection**: Krumhansl–Schmuckler profile correlation over weighted pitch input (with durations if provided) — replaces the broken `detectKey`; no leading library ships one.
3. **Voice leading**: minimal-motion voicing search between chords, parallel-fifth/octave detection on actual voice pairs, voice-leading cost metrics.
4. **Transformational harmony**: Neo-Riemannian P/L/R operations, negative harmony mapping, chromatic mediants.
5. **Progression analysis**: functional labeling (T/S/D), cadence detection (authentic/plagal/deceptive/half + evaded), modulation detection, borrowed-chord identification, next-chord suggestion with real scoring.
6. **Chord-scale relationships**: which scales fit a chord (chroma containment + avoid-note awareness) — a jazz-facing feature existing libraries only hint at.
7. **DX**: throwing errors with suggestions, executable docs, single package.

### 5.3 Explicitly out of scope (v3.0)

Notation rendering, audio playback, MIDI file I/O, rhythm/duration beyond time-signature basics (low value relative to the core mission; revisit in 3.1).

---

## 6. Performance strategy

Honesty first: the leading libraries are already fast for typical use; we win by design, then prove it.

- **Numeric core**: chroma as ints (bitwise set ops instead of the binary-string chromas incumbents use), `(step, alt)` arithmetic — no string round-trips internally.
- **Parse once**: memoized string→object caches; object path bypasses parsing entirely (string-only APIs can't offer this path).
- **Precomputed dictionaries**: chord/scale data compiled to const arrays + chroma-indexed Maps at build time. No module-load side-effect loops (fixes the `sideEffects: false` violation).
- **Benchmark suite** (tinybench, in-repo, CI-tracked): transpose ×1M, chord symbol parse, `Chord.detect`, `Scale.detect`, key detection — head-to-head against the leading alternatives, published in the README. If a number doesn't win, we say so and fix it or explain it.
- **Bundle size**: size-limit in CI per subpath; target: `core` < 3 kB min+gz, full library competitive with the smallest leading alternative.

---

## 7. Quality strategy

The audit's central lesson: **nothing is done until it's executed.**

- **Vitest** (jest+ts-jest is currently broken anyway; vitest is faster and ESM-native). Tests included in typecheck — `tsconfig` excluding tests is how defect #4 happened.
- **Property-based tests** (fast-check) for core invariants:
  - `transpose(p, distance(p, q)) ≡ q` for all spelled pitch pairs
  - `transpose(transpose(p, i), invert(i)) ≡ p`
  - `midi(transpose(p, i)) === midi(p) + i.semitones`
  - parse∘format ≡ identity for every representable pitch/interval/chord symbol
- **Differential testing against established reference libraries** (dev-dependencies only, never shipped): generated corpora of notes/intervals/chords/scales/keys run through ours and theirs; any divergence is either our bug or a documented, justified improvement.
- **Doctests**: every `@example` block extracted and executed in CI. The current repo is a museum of confident, wrong examples — that class of rot becomes structurally impossible.
- **Curated regression corpus** from the audit: every symbol the old parser rejected or mis-parsed, every mode that threw, the brightness table, the detection tie — all become named test cases.
- CI: typecheck (src + tests) → lint → test w/ coverage gate (core: 100%, overall: ≥90%) → build → size-limit → benchmarks (informational).

---

## 8. Packaging & tooling fixes

- `exports` map: `.` + every module subpath, each with `types`/`import`/`require`; `main`/`module`/`browser`/`types` aligned with what the build actually emits.
- **License: decide once** — LICENSE.txt and `package.json` both say **ISC**, so ISC it is; `LIBRARY_INFO.license` (which said "MIT") is corrected to match.
- `typedoc` + themes → `devDependencies` (currently shipped as runtime deps). Delete root `index.ts` (`console.log("Hello via Bun!")` scaffold).
- Keep dual ESM/CJS via rollup (already configured); ship `.d.ts` per subpath.
- Delete `v2/` from the published package concerns entirely (already outside `files`, keep it as in-repo reference until Phase 3, then archive to a git tag).

---

## 9. Roadmap

Each phase ends green: typecheck + tests + build passing in CI. No phase starts until the previous phase's acceptance criteria pass.

### Phase 0 — Burn down & infra
Delete `src/chord/symbols.ts`, all commented-out blocks (~300 lines), root `index.ts`. Fix `package.json` (exports, license, deps). Replace jest with vitest; make the existing interval tests pass (fix the `-0` bug); add CI workflow.
**Accept:** `npm test`, typecheck (incl. tests), and build all green in CI; zero dead files.

### Phase 1 — Core (`src/core/`)
`Pitch`, `Interval`, parse/format, `transpose`, `distance`, `chroma`, `midi`, `freq`. Property tests + differential tests against reference libraries.
**Accept:** spelling table exact (`Eb+P5=Bb`, `C+m3=Eb`, `G#+M3=B#`, `Cb` major scale spells correctly); 100% agreement with reference implementations on a 10k-case generated transpose/distance corpus; 100% core coverage.

### Phase 2 — Pcset + dictionaries
Chroma engine; chord-type & scale-type dictionaries (seeded from license-compatible open-source data, verified); ranked detection.
**Accept:** detection returns discriminating scores (C major input: `major` strictly first; A natural minor: `minor`/`aeolian` first, not A major); dictionary coverage ≥ the best available; detection-parity corpus against reference libraries passes.

### Phase 3 — Chord, Scale, Key, Roman, Progression
Symbol tokenizer (full corpus incl. every audit reject), full-featured `key()` (`majorKey`/`minorKey`), roman numerals with secondary functions, progressions with real scoring.
**Accept:** chord-symbol corpus (≥150 real-world symbols) parses or throws helpfully — zero silent-major fallbacks; `V7/V` round-trips; key-module parity test against reference data passes.

### Phase 4 — Microtonal & tuning
Port the salvaged cents/JI/EDO math onto the core; unify `TUNING_SYSTEMS`; spelled-pitch temperaments; stored reference pitch; pitch-bend helper.
**Accept:** meantone yields G# ≠ Ab with reference cent values; `registerTuning` affects frequency (defect #9 test); `retune` example from the old docs now produces the documented answer.

### Phase 5 — Advanced harmony
K–S key detection, voice leading, Neo-Riemannian/negative harmony, cadence & progression analysis, chord-scale matching.
**Accept:** key detection ≥95% on a curated 100-case corpus (incl. minor, modal, and modulating examples); voice-leading engine never emits parallel fifths in default mode (property test).

### Phase 6 — Perf, docs, release
Benchmark suite + README comparison table, typedoc rebuild, migration guide (v2 → v3), `3.0.0-beta` publish.
**Accept:** benchmarks published; every public function has an executed example; `npm pack` installs and imports cleanly from every documented subpath in a smoke-test project.

---

## 10. What we salvage from current `src/`

| Keep (port onto new core) | Why |
|---|---|
| `addCentsToNote` normalization math, `getMidiWithCents`, `transposeByCents`, `createNoteFromFrequency`, `createJustIntonationNote` ratio parsing | Audited as careful and correct — the microtonal layer is the good 20% |
| `CHORD_FORMULAS`, `SCALE_PATTERNS`, `COMMON_PROGRESSIONS`, JI ratio tables | Data is fine; regenerate as verified dictionary entries |
| `analyzeScaleStructure` diatonic test, `compareScales`, `getMode` rotation logic, `createDiatonicProgression` quality derivation | Verified correct; reimplement thinly on chroma |
| Module-per-concept layout, immutability discipline (`Object.freeze`), doc thoroughness *as a habit* | Right instincts — now with execution behind them |

Everything else is reference material, not a foundation.

---

## Appendix A — Full defect inventory by module

<details>
<summary>Expand for the complete audit detail</summary>

### interval.ts (185 lines, 28 code)
Complete/correct/tested but trivial — and the root cause of the spelling problem: `type Interval = number`. `simplifyInterval(-12)` returns `-0` (the one failing test). No quality, no letter distance.

### note/ (4,101 lines, 1,837 code)
- `createNote` takes an options object only — the `createNote('C4')` string form used throughout the repo's own examples does not exist.
- `SHARP_NAMES`/`FLAT_NAMES` contain only 12 canonical spellings → `Cb`, `B#`, `E#`, `Fb`, doubles unreachable as outputs (accepted as inputs — asymmetric).
- `noteToFrequency` implemented twice (`calculations.ts`, `frequency.ts`); both live, different null-handling.
- `transposeByCents` not exported from `note/index.ts` (line commented out) despite ~6 `@see` references.
- `retune()` (defect #10); `formatNote` returns cached notation before validating input.
- `notesAreEqual` is octave-sensitive via cached MIDI — the trigger for defects #1 and #7.
- `note/constants.ts:388`: `LETTER_ACCIDENTAL_TO_PITCH_CLASS` built by a module-load side-effect loop, then never used by anything.
- 116-line commented-out former `transposeByCents` at `operations.ts:796–911`.

### chord/ (5,909 lines, 3,351 code — largest, weakest)
- Parser: single ~60-branch regex alternation; `CHORD_SYMBOL_MAP` and regex out of sync both directions (map has `m6`/`min6`/`dom7`/`aug7` the regex never matches; regex has `\+7` the map lacks → silent major). Root case-insensitive, quality case-sensitive (`cmaj7` ok, `CMaj7` throws).
- `identifyChord`: exact-match only, first-match-wins by dictionary order; no omitted-fifth handling, no scoring → `analyzeChord` returns `null` for anything imperfect.
- `generateChordSymbol`: hand-switch covers 11 of 39 qualities; falls through to `symbol += quality`.
- `roman.ts`: secondary functions dropped (defect #12); `analyzeChordWithDegree` builds a quality suffix for 35 lines then executes `qualitySuffix = ""; // Reset` and rebuilds — first version dead in-flow. `getAllDiatonicChords`/`createDiatonicChord` exported from file but not from the barrel → unreachable; the latter duplicated ~100 lines inside `createDiatonicProgression`.
- `voicing.ts`: "spread" no-op (defect #11); `COMMON_VOICINGS` only ever read at index `[0]` (identity).
- `progression.ts`: `suggestNextChords` all-tie (defect #13); `analyzeHarmonicRhythm` is a stub whose documented return fields are commented out of the implementation; `transformProgression` "substitute" implements exactly one rule.
- `symbols.ts`: 555 lines dead (defect #8).
- Barrel: `chord/constants.ts` export line commented out → users cannot enumerate available qualities.

### scale/ (3,870 lines, 1,759 code)
- `modes.ts`: defect #1; `getAllMajorModes` works only because it routes through `getMode` instead — two implementations of one concept.
- `analysis.ts`: brightness inverted with two unreachable rewrites (defect #2); `getScaleFunction` returns `null` for any scale not exactly 7 notes/7 pattern entries (so `octaves>1` or `includeOctave` kills it); `analyzePossibleCadences` returns the same 5 cadences for every 7-note scale (constant function); tension weights don't do what their comments claim; `findRelatedScales` requires callers to inject `createScale` (circular-import dodge).
- `detection.ts`: defect #6; `detectKey` result slots consumed by `ionian`/`aeolian` duplicates; `chromatic` pattern matches everything; no cardinality weighting; microtonal EDO detection recognizes hard-coded patterns for 19/24/31 only.
- `creation.ts`: `createScaleFromSteps("WWHWWWH")` yields an 8-entry pattern including 12, `name: undefined` (docs claim 7-entry + `'major'`), and throws on the space-separated form its own docs use; private `parseNoteString` regex has a duplicated `b` in its class and case-folding bugs (`CB4`).
- `operations.ts`: `invertScale` re-sorts/respells through `createScaleFromNotes`, returning ascending sharp-spelled notes instead of the documented mirror; `findClosestScaleNote` tie-break commented out; `getDegree` vs `getScaleDegree` naming collision flagged in the barrel's own comments.

### tuning/ (699 lines, 240 code)
- Defect #9 (dual `TUNING_SYSTEMS`).
- All adjustment functions operate on pitch class mod 12 → cannot distinguish G#/Ab, defeating meantone/Pythagorean by construction; QC-meantone table hard-codes "standard" spellings and says so.
- JI map rounded to whole cents (386 vs 386.31 used elsewhere in the same repo).
- `registerTuningSystem` validation failures `console.error` and silently return.
- `centsBetweenFrequencies` not re-exported → unreachable; 93 lines of commented-out duplicates at 505–597.
- No `./tuning` subpath in `exports` → `applyTuningSystem` unreachable from a published install at all.

### Tests
`__tests__/interval.test.ts`: 14 real-if-trivial cases, 1 genuine failure (`-0`). `__tests__/note/calculations.test.ts`: 62 cases, fails compilation (mutates `readonly` props), and mocks the entire constants/creation/operations modules with hand-rolled reimplementations — even if it compiled it would test a fictional universe. `chord/`, `scale/`, `tuning/` test dirs: empty. `jest.config.cjs`: ~30 of 44 lines are commented-out deliberation.

### Cross-cutting
- `(x.pitchClassIndex − y.pitchClassIndex + 12) % 12` re-derived at 14+ sites; no shared helper.
- Three ad-hoc note-string parsers (`scale/creation.ts:320`, `chord/progression.ts:114`, `chord/creation.ts:479`), all different.
- ~43% of source is comments; many describe unbuilt behavior. Comment-to-code ratio in `interval.ts`: 5.4 : 1.

</details>
