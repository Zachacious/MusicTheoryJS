---
"musictheoryjs": minor
---

Close the gaps (roadmap Phase 8). Everything is additive.

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
