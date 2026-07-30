# musictheoryjs

## 3.2.1

### Patch Changes

- b9c2746: The package now ships an Agent Skill (`skills/musictheoryjs/SKILL.md`) — a
  distilled v3 reference an AI coding assistant loads so it writes real
  MusicTheoryJS code instead of guessing from stale training data. Copy it into
  a Claude Code project with
  `cp -r node_modules/musictheoryjs/skills/musictheoryjs .claude/skills/`; any
  tool that reads `SKILL.md` files works the same way. Every code snippet in the
  skill executes in CI alongside the README and guides.

  The docs site also publishes the guides in the llms.txt format —
  https://musictheoryjs.com/llms.txt (index), /llms-full.txt (every guide in
  one file), and /llms-small.txt (abridged) — generated from the guides at
  build time, plus a new "AI assistants" guide covering both. The site itself
  moved to current Astro and Starlight as part of this.

## 3.2.0

### Minor Changes

- 9b4ce96: A sequence module with drums and tempo maps, MusicXML and rhythm-aware ABC
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

### Patch Changes

- 9b4ce96: Fix the exported `VERSION` constant, which reported `"3.0.0"` on 3.0.1, 3.0.2,
  and 3.1.0. It is a literal so the bundles stay self-contained, and nothing kept
  it in step with `package.json`.

  Two changes so it cannot drift again: the `version` script now runs
  `scripts/sync-version.ts` immediately after Changesets bumps `package.json`, and
  a test asserts the two match — so a release that skips the sync fails CI instead
  of shipping a wrong version string.

## 3.1.0

### Minor Changes

- be36559: Close the gaps (roadmap Phase 8). Everything is additive.

  - **Open dictionaries.** `addChordType`/`addScaleType` register qualities and
    templates at runtime; `removeChordType`/`removeScaleType` and
    `resetChordTypes`/`resetScaleTypes` undo it. Registrations flow through every
    derived table immediately — symbol parsing, detection, chord-scale matching,
    Roman numerals — so an added quality builds, parses from its symbol, prints,
    and is detected exactly like a built-in. Duplicate names are refused rather
    than silently overwriting. `chordTemplate`/`scaleTemplate` look a template up
    by name and throw if it is unknown; `chordDictionaryVersion`/
    `scaleDictionaryVersion` expose the revision so callers can cache against it.
  - **Tuning registry**: `registerTuning`, `getTuning`, `tryGetTuning`,
    `hasTuning`, `tuningNames`, `removeTuning`, `resetTunings`, and
    `tuningRegistryVersion`, seeded with 34 built-in tunings (12-TET, historical,
    11 EDOs, 7 maqamat, 10 ragas, slendro, pelog). Lookup ignores case. Every
    tuning-taking function — `frequencyOfNote`, `frequencyOfDegree`, `noteCents`,
    `degreeCents` — now accepts a registered name wherever it accepts a `Tuning`,
    via the new `TuningLike` type and `asTuning`. `isTuning` validates a value at
    a boundary.
  - **Rhythm patterns**: `euclideanRhythm` (the Euclidean distribution behind the
    tresillo, cinquillo, and Bossa Nova clave), `rhythmFromOnsets`,
    `rhythmToOnsets`, `rhythmFromHex`/`rhythmToHex`, `rotateRhythm`,
    `randomRhythm`, `weightedRhythm`, and `rhythmPattern`.
  - **ABC import** to match the export: `abcToNote`, `noteToABC`, `tokenizeABC`
    for single pitches, and `fromABC` for a whole tune — header fields plus the
    note stream, honouring ABC's measure-accidental rule and modal `K:` fields.
  - **Interval arithmetic**: `invertInterval`, `simplifyInterval`,
    `subtractIntervals`, `intervalFifths`, and `INTERVAL_NAMES`.
  - **Notes**: `transposeFifths` (keeping the circle's spelling — six fifths up
    is F#, six down is Gb), `sortNotes`, and `sortNotesUnique`.
  - **Pitch-class sets**: `pcsetModes` (the rotations of a set), `pcsetNearest`
    (snap a MIDI note to the set), and `pcsetStep`/`pcsetDegree` (walk a set as a
    scale).
  - **Relating modes**: `modeDistance` between two modes of one parent, reported
    in the nearer direction as musicians name it, and `relativeTonic` to re-root
    a mode onto the tonic that shares its notes.
  - **Subset/superset queries**: `scaleSupersets`/`scaleSubsets` and
    `chordSupersets`/`chordSubsets` over the dictionaries.
  - **Voicing dictionaries**: `LEFTHAND_VOICINGS` (rootless jazz shapes) and
    `TRIAD_VOICINGS`, with `lookupVoicings` and `voicingsOf` to realise them on
    any root; any object of the same shape works.
  - **A `collection` module** (also at `musictheoryjs/collection`): `range`,
    `rotate`, `permutations`, `shuffle`, `compact`.
  - `tokenizeScaleName` splits `"C melodic minor"` into tonic and template
    without validating either.

  Performance: note and interval parsing are memoized (returning frozen, shared
  value objects), mode relations compare pitch-class offsets instead of building
  a scale per rotation, and chord-scale ranking scores from pitch-class masks,
  constructing only the scales it actually returns.

  `ScaleName`, `CanonicalScaleName`, and `ChordQuality` now accept any string
  alongside the built-in names, since the dictionaries are extensible. Built-in
  names are still suggested by autocomplete. Template lookups
  (`SCALE_TEMPLATES[name]`, `CHORD_TEMPLATES[quality]`) are correspondingly typed
  as possibly missing; use `scaleTemplate`/`chordTemplate` for a checked lookup.

- be37233: Dictionaries and detection (roadmap Phase 2).

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
    (`major`, not `major` _and_ `ionian`).

- 9465d1b: Harmony everywhere (roadmap Phase 3). Everything is additive.

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

- ebcf114: Notation and audio depth (roadmap Phase 6). Everything is additive, including
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

- d7d9bbe: Open the API (roadmap Phase 1). Everything is additive.

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

- ebcf114: Rhythm and meter (roadmap Phase 5). Everything is additive, including a new
  `musictheoryjs/rhythm` entry point.

  - Durations as plain objects — a base value named by its denominator (4 =
    quarter), dots, and an optional tuplet ratio — with shorthand that parses
    and formats both ways: `"q."` is a dotted quarter, `"8t"` an eighth-note
    triplet, `"16[5:4]"` a sixteenth quintuplet. `tuplet(n)` picks the
    conventional ratio (3 → 3:2, 5 → 5:4, 7 → 7:4), `durationName` speaks
    (`"dotted quarter"`, `"eighth triplet"`), and `wholeNotes`,
    `durationBeats`, `durationTicks`, and `durationSeconds` convert to any
    unit, exact on divisible grids.
  - Time signatures and meter: `"6/8"` strings, `[6, 8]` pairs, and plain
    objects everywhere; `meterClass` labels simple/compound/irregular;
    `beatGrouping` gives the felt beats (6/8 → 3+3, 7/8 → 3+2+2, 8/8 → 3+3+2)
    with `beatsPerBar` and `beatUnit` (the dotted quarter of 6/8) derived from
    it; `barWholeNotes`/`barTicks`/`barSeconds` measure a bar in any unit.
  - Bar/beat positions: `tickToPosition`/`positionToTick` convert absolute
    ticks to 1-based bar/beat/offset and back, with beats following the
    grouping — the second beat of 7/8 starts after three eighths, not two.
    `secondsToBeats`/`beatsToSeconds` cover the seconds domain.
  - Quantization for both time domains: `quantizeTick` and `quantizeSeconds`
    snap single values, `quantizeStream` a seconds-based analysis stream, and
    `quantizeMidi` a whole parsed file — any duration as the grid (sixteenths,
    triplets), starts snapped, durations only on request and never to zero,
    grid lines drift-free on non-divisible PPQs.
  - MIDI time signatures: `parseMidi` surfaces the first FF 58 meta event as
    `file.timeSignature` (as tempo already was), `writeMidi` emits one when
    set — metronome click matched to the meter's beat — and `noteStreamToMidi`
    takes a `timeSignature` option.

- 9465d1b: Voice leading and transforms (roadmap Phase 4). Everything is additive.

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

### Patch Changes

- b960030: Docs that play (roadmap Phase 7). No library code changes — the docs site and
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

## 3.0.2

### Patch Changes

- b3d135a: Point documentation links at musictheoryjs.com

## 3.0.1

### Patch Changes

- 1b0b9c2: Rewrite README for a JavaScript-developer audience and point the package homepage at musictheoryjs.com

## 3.0.0

### Major Changes

- e6acce2: v3 — a ground-up rewrite.

  - Immutable, correctly-spelled `Note`, `Interval`, `Scale`, and `Chord` value
    objects (enharmonics preserved: `E#` ≠ `F`, C major spells `C D E F G A B`).
  - Tuning-agnostic core with a pluggable `Tuning` system: `n`-EDO, Pythagorean,
    quarter-comma meantone, Just Intonation, custom cents/ratio tables, and Scala
    `.scl` import — first-class support for microtonal and non-Western music.
  - Harmony & analysis: `Key` (signatures, diatonic chords, Roman numerals,
    progressions, relative/parallel), chord detection, chord voicings
    (drop2/drop3/spread), scale modes, and scale detection.
  - Tree-shakable, zero runtime dependencies, dual ESM/CJS output, full types.
  - Bun + `bun test` + Biome toolchain.

  This is a full rewrite; the v2 API is not preserved.
