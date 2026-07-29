/**
 * The scale dictionary: one source of truth for every built-in template.
 *
 * Each row defines a scale once — canonical name, spelled intervals, and the
 * aliases it also answers to (including spaced forms like `"melodic minor"`).
 * {@link SCALE_TEMPLATES} exposes every name and alias as a key, and
 * detection derives its pitch-class masks from the same rows.
 *
 * Using spelled intervals (rather than raw semitone offsets) is what makes the
 * generated notes spell correctly: a C major scale comes out C D E F G A B, and
 * a C lydian comes out with F# (not Gb), because each degree carries its
 * diatonic step, not just its pitch class.
 *
 * These cover the common Western scales/modes; genuinely microtonal scales
 * (maqam, gamelan, xenharmonic) are built from a `Tuning` instead — see the
 * tuning module and `scaleFromTuning`.
 */

import type { Interval } from "../interval/interval";
import { intervalFromSemitones } from "../interval/parse";
import { parseInterval } from "../interval/parse";

/** A named scale template: the intervals of each degree above the tonic. */
export type ScaleTemplate = readonly Interval[];

/**
 * The dictionary rows: `[canonical name, spelled intervals, ...aliases]`.
 * Canonical names are camelCase with `b`/`s` marking flattened/sharpened
 * degrees (`dorianb2`, `lydians2`); aliases carry the spaced spellings.
 */
const DEFS = [
  // == Major modes ==
  ["major", "P1 M2 M3 P4 P5 M6 M7", "ionian"],
  ["dorian", "P1 M2 m3 P4 P5 M6 m7"],
  ["phrygian", "P1 m2 m3 P4 P5 m6 m7"],
  ["lydian", "P1 M2 M3 A4 P5 M6 M7"],
  ["mixolydian", "P1 M2 M3 P4 P5 M6 m7"],
  ["minor", "P1 M2 m3 P4 P5 m6 m7", "aeolian", "natural minor"],
  ["locrian", "P1 m2 m3 P4 d5 m6 m7"],

  // == Minor variants and their modes ==
  ["harmonicMinor", "P1 M2 m3 P4 P5 m6 M7", "harmonic minor"],
  ["melodicMinor", "P1 M2 m3 P4 P5 M6 M7", "melodic minor"],
  ["harmonicMajor", "P1 M2 M3 P4 P5 m6 M7", "harmonic major"],
  ["dorianb2", "P1 m2 m3 P4 P5 M6 m7", "dorian b2", "phrygian #6"],
  ["lydianAugmented", "P1 M2 M3 A4 A5 M6 M7", "lydian augmented", "lydian #5"],
  [
    "lydianDominant",
    "P1 M2 M3 A4 P5 M6 m7",
    "lydian dominant",
    "acoustic",
    "overtone",
    "lydian b7",
  ],
  [
    "mixolydianb6",
    "P1 M2 M3 P4 P5 m6 m7",
    "mixolydian b6",
    "hindu",
    "aeolian dominant",
  ],
  [
    "halfDiminished",
    "P1 M2 m3 P4 d5 m6 m7",
    "locrian #2",
    "half-diminished",
    "aeolian b5",
  ],
  [
    "altered",
    "P1 m2 A2 M3 A4 m6 m7",
    "super locrian",
    "superLocrian",
    "diminished whole tone",
  ],
  [
    "locrian6",
    "P1 m2 m3 P4 d5 M6 m7",
    "locrian 6",
    "locrian natural 6",
    "locrian #6",
  ],
  [
    "majorAugmented",
    "P1 M2 M3 P4 A5 M6 M7",
    "major augmented",
    "ionian augmented",
    "ionian #5",
    "major #5",
  ],
  [
    "romanian",
    "P1 M2 m3 A4 P5 M6 m7",
    "dorian #4",
    "ukrainian dorian",
    "romanian minor",
    "altered dorian",
  ],
  ["lydians2", "P1 A2 M3 A4 P5 M6 M7", "lydian #2", "lydian #9"],
  ["lydianDiminished", "P1 M2 m3 A4 P5 M6 M7", "lydian diminished"],
  ["ultralocrian", "P1 m2 m3 d4 d5 m6 d7", "ultra locrian", "superlocrian bb7"],
  [
    "phrygianDominant",
    "P1 m2 M3 P4 P5 m6 m7",
    "phrygian dominant",
    "spanish",
    "phrygian major",
  ],

  // == Pentatonic ==
  ["majorPentatonic", "P1 M2 M3 P5 M6", "major pentatonic", "pentatonic"],
  ["minorPentatonic", "P1 m3 P4 P5 m7", "minor pentatonic"],
  ["ionianPentatonic", "P1 M3 P4 P5 M7", "ionian pentatonic"],
  ["mixolydianPentatonic", "P1 M3 P4 P5 m7", "mixolydian pentatonic", "indian"],
  [
    "neapolitanMajorPentatonic",
    "P1 M3 P4 d5 m7",
    "neapolitan major pentatonic",
  ],
  ["chinese", "P1 M3 A4 P5 M7", "lydian pentatonic"],
  [
    "lydianAugmentedPentatonic",
    "P1 M3 A4 A5 M7",
    "lydian #5 pentatonic",
    "lydian #5p pentatonic",
  ],
  ["lydianDominantPentatonic", "P1 M3 A4 P5 m7", "lydian dominant pentatonic"],
  [
    "locrianPentatonic",
    "P1 m3 P4 d5 m7",
    "locrian pentatonic",
    "minor seven flat five pentatonic",
  ],
  ["minorSixPentatonic", "P1 m3 P4 P5 M6", "minor six pentatonic"],
  ["minorMaj7Pentatonic", "P1 m3 P4 P5 M7", "minor #7M pentatonic"],
  ["flatSixPentatonic", "P1 M2 M3 P5 m6", "flat six pentatonic"],
  ["superLocrianPentatonic", "P1 m3 d4 d5 m7", "super locrian pentatonic"],
  ["wholeTonePentatonic", "P1 M3 d5 m6 m7", "whole tone pentatonic"],
  ["scriabin", "P1 m2 M3 P5 M6"],
  ["egyptian", "P1 M2 P4 P5 m7", "suspended pentatonic"],
  ["yo", "P1 M2 P4 P5 M6", "ritusen"],
  ["hirajoshi", "P1 M2 m3 P5 m6"],
  ["insen", "P1 m2 P4 P5 m7", "in-sen"],
  ["iwato", "P1 m2 P4 d5 m7"],
  ["kumoi", "P1 M2 m3 P5 M6", "flat three pentatonic"],
  ["kumoijoshi", "P1 m2 P4 P5 m6"],
  ["vietnamese", "P1 m3 P4 P5 m6", "vietnamese 1"],
  ["malkosRaga", "P1 m3 P4 m6 m7", "malkos raga"],
  ["pelog", "P1 m2 m3 P5 m6"],

  // == Blues ==
  ["minorBlues", "P1 m3 P4 d5 P5 m7", "blues", "minor blues"],
  ["majorBlues", "P1 M2 m3 M3 P5 M6", "major blues"],
  ["compositeBlues", "P1 M2 m3 M3 P4 d5 P5 M6 m7", "composite blues"],

  // == Hexatonic ==
  ["wholeTone", "P1 M2 M3 A4 A5 A6", "whole tone", "messiaen's mode #1"],
  ["augmented", "P1 m3 M3 P5 m6 M7"],
  ["prometheus", "P1 M2 M3 A4 M6 m7", "mystic"],
  ["prometheusNeapolitan", "P1 m2 M3 A4 M6 m7", "prometheus neapolitan"],
  ["minorHexatonic", "P1 M2 m3 P4 P5 M7", "minor hexatonic"],
  ["piongio", "P1 M2 P4 P5 M6 m7"],
  ["sixToneSymmetric", "P1 m2 M3 P4 A5 M6", "six tone symmetric"],
  ["mystery", "P1 m2 M3 d5 m6 m7", "mystery #1"],
  ["messiaen5", "P1 m2 P4 A4 P5 M7", "messiaen's mode #5"],

  // == Heptatonic exotics ==
  ["enigmatic", "P1 m2 M3 A4 A5 A6 M7"],
  [
    "doubleHarmonic",
    "P1 m2 M3 P4 P5 m6 M7",
    "double harmonic major",
    "byzantine",
    "gypsy",
  ],
  ["doubleHarmonicLydian", "P1 m2 M3 A4 P5 m6 M7", "double harmonic lydian"],
  ["hungarianMinor", "P1 M2 m3 A4 P5 m6 M7", "hungarian minor", "gypsyMinor"],
  ["hungarianMajor", "P1 A2 M3 A4 P5 M6 m7", "hungarian major"],
  ["neapolitanMinor", "P1 m2 m3 P4 P5 m6 M7", "neapolitan minor", "balinese"],
  ["neapolitanMajor", "P1 m2 m3 P4 P5 M6 M7", "neapolitan major"],
  ["persian", "P1 m2 M3 P4 d5 m6 M7"],
  ["arabian", "P1 M2 M3 P4 d5 m6 m7", "locrian major"],
  ["oriental", "P1 m2 M3 P4 d5 M6 m7"],
  ["flamenco", "P1 m2 m3 M3 A4 P5 m7"],
  ["todiRaga", "P1 m2 m3 A4 P5 m6 M7", "todi raga"],
  ["lydianMinor", "P1 M2 M3 A4 P5 m6 m7", "lydian minor"],
  ["leadingWholeTone", "P1 M2 M3 A4 A5 m7 M7", "leading whole tone"],
  ["augmentedHeptatonic", "P1 A2 M3 P4 P5 A5 M7", "augmented heptatonic"],

  // == Octatonic and larger ==
  ["diminished", "P1 M2 m3 P4 d5 m6 M6 M7", "whole-half diminished"],
  [
    "dominantDiminished",
    "P1 m2 m3 M3 A4 P5 M6 m7",
    "half-whole diminished",
    "messiaen's mode #2",
  ],
  ["bebopDominant", "P1 M2 M3 P4 P5 M6 m7 M7", "bebop", "bebop dominant"],
  ["bebopMajor", "P1 M2 M3 P4 P5 A5 M6 M7", "bebop major"],
  ["bebopMinor", "P1 M2 m3 M3 P4 P5 M6 m7", "bebop minor", "bebop dorian"],
  [
    "bebopHarmonicMinor",
    "P1 M2 m3 P4 P5 m6 m7 M7",
    "minor bebop",
    "bebop harmonic minor",
  ],
  ["bebopLocrian", "P1 m2 m3 P4 d5 P5 m6 m7", "bebop locrian"],
  ["minorSixDiminished", "P1 M2 m3 P4 P5 m6 M6 M7", "minor six diminished"],
  ["ichikosucho", "P1 M2 M3 P4 d5 P5 M6 M7"],
  ["spanishHeptatonic", "P1 m2 m3 M3 P4 P5 m6 m7", "spanish heptatonic"],
  ["kafiRaga", "P1 m3 M3 P4 P5 M6 m7 M7", "kafi raga"],
  ["purviRaga", "P1 m2 M3 P4 A4 P5 m6 M7", "purvi raga"],
  ["messiaen3", "P1 M2 m3 M3 A4 P5 m6 m7 M7", "messiaen's mode #3"],
  ["messiaen4", "P1 m2 M2 P4 A4 P5 m6 M7", "messiaen's mode #4"],
  ["messiaen6", "P1 M2 M3 P4 A4 A5 A6 M7", "messiaen's mode #6"],
  ["messiaen7", "P1 m2 M2 m3 P4 A4 P5 m6 M6 M7", "messiaen's mode #7"],
  ["chromatic", "P1 m2 M2 m3 M3 P4 d5 P5 m6 M6 m7 M7"],
] as const;

type Def = (typeof DEFS)[number];

/** Canonical names of the built-in scale templates. */
export type BuiltinCanonicalScaleName = Def[0];

/**
 * A canonical scale-template name. Built-ins are suggested by autocomplete;
 * any string is accepted, since {@link addScaleType} registers more at runtime.
 */
export type CanonicalScaleName = BuiltinCanonicalScaleName | (string & {});

/** Names of all built-in scale templates, aliases included. */
export type BuiltinScaleName =
  | CanonicalScaleName
  | (Def extends readonly [unknown, unknown, ...infer A]
      ? A[number] & string
      : never);

/**
 * A scale-template name. Every built-in name is suggested by autocomplete, but
 * any string is accepted, because {@link addScaleType} can register more at
 * runtime — the dictionary is open, so the type is too.
 */
export type ScaleName = BuiltinScaleName | (string & {});

/** One scale-dictionary entry. */
export interface ScaleDefinition {
  /** Canonical template name, e.g. `"melodicMinor"`. */
  readonly name: CanonicalScaleName;
  /** Intervals of each degree above the tonic. */
  readonly intervals: ScaleTemplate;
  /** Other accepted names, e.g. `"melodic minor"`. */
  readonly aliases: readonly string[];
}

/**
 * Every built-in scale, in dictionary order. Detection walks these (one entry
 * per scale, however many aliases it has).
 */
const BUILTIN_DEFINITIONS: readonly ScaleDefinition[] = DEFS.map(
  ([name, intervals, ...aliases]) => ({
    name,
    intervals: intervals.split(" ").map(parseInterval),
    aliases,
  })
);

/**
 * Every scale in the dictionary, in registration order — built-ins first, then
 * anything {@link addScaleType} has added. Detection walks these (one entry per
 * scale, however many aliases it has).
 *
 * The array is live: it is mutated in place by the registration functions, so
 * a module that captured it still sees later additions.
 */
export const SCALE_DEFINITIONS: readonly ScaleDefinition[] = [
  ...BUILTIN_DEFINITIONS,
];

/** Scale templates by name — canonical names and aliases alike are keys. */
export const SCALE_TEMPLATES: Readonly<
  Partial<Record<ScaleName, ScaleTemplate>>
> = {};

/**
 * Bumped on every dictionary change. Modules that precompute from the
 * dictionary (detection masks, chord-scale tables) compare against this to
 * know when their caches have gone stale.
 */
let dictionaryVersion = 0;

/**
 * The current scale-dictionary revision; changes whenever a template is added
 * or removed. Cache anything derived from the dictionary against this and
 * rebuild when it moves.
 *
 * @example
 * ```ts
 * import { scaleDictionaryVersion, addScaleType, removeScaleType } from "musictheoryjs";
 * const before = scaleDictionaryVersion();
 * addScaleType("versionDemo", "P1 M2 M3");
 * scaleDictionaryVersion() === before; // => false
 * removeScaleType("versionDemo");
 * ```
 */
export function scaleDictionaryVersion(): number {
  return dictionaryVersion;
}

/** Index one definition's names into the lookup table. */
function indexDefinition(def: ScaleDefinition): void {
  const table = SCALE_TEMPLATES as Record<string, ScaleTemplate>;
  for (const name of [def.name, ...def.aliases]) {
    if (Object.hasOwn(table, name)) {
      throw new Error(`scale dictionary conflict: duplicate name "${name}"`);
    }
    table[name] = def.intervals;
  }
}

for (const def of BUILTIN_DEFINITIONS) indexDefinition(def);

/**
 * The template for a scale name or alias — the intervals of each degree above
 * the tonic.
 * @throws {RangeError} when the name is not in the dictionary.
 *
 * @example
 * ```ts
 * import { scaleTemplate, intervalName } from "musictheoryjs";
 * scaleTemplate("majorPentatonic").map(intervalName); // => ["P1", "M2", "M3", "P5", "M6"]
 * scaleTemplate("nope"); // => throws "unknown scale template"
 * ```
 */
export function scaleTemplate(name: ScaleName): ScaleTemplate {
  const template = SCALE_TEMPLATES[name];
  if (!template) throw new RangeError(`unknown scale template: "${name}"`);
  return template;
}

/** True if `name` is a known scale template (alias or canonical, built-in or added). */
export function isScaleName(name: string): name is ScaleName {
  return Object.hasOwn(SCALE_TEMPLATES, name);
}

/**
 * Register a scale template at runtime, so the rest of the library — building,
 * detection, chord-scale matching — treats it exactly like a built-in.
 *
 * Intervals may be spelled names (`"P1 M2 m3"`), an array of them, or an array
 * of semitone offsets from the tonic; spelling the intervals gives the scale
 * correctly spelled notes.
 *
 * @throws when the name or any alias is already taken — dictionaries silently
 *   overwriting each other is worse than a loud failure. Remove first to
 *   replace.
 *
 * @example
 * ```ts
 * import { addScaleType, removeScaleType, Scale, isScaleName } from "musictheoryjs";
 * addScaleType("hexatonicDream", "P1 M2 M3 A4 M6 M7", { aliases: ["dream"] });
 * isScaleName("hexatonicDream"); // => true
 * Scale.from("C4", "dream").noteNames(); // => ["C4","D4","E4","F#4","A4","B4"]
 * removeScaleType("hexatonicDream");
 * isScaleName("dream"); // => false
 * ```
 */
export function addScaleType(
  name: string,
  intervals: string | ReadonlyArray<string | number>,
  options: { readonly aliases?: readonly string[] } = {}
): void {
  const aliases = options.aliases ?? [];
  const def: ScaleDefinition = {
    name: name as CanonicalScaleName,
    intervals: parseTemplate(intervals),
    aliases,
  };
  // Index first: a conflict throws before the definition list is touched, so a
  // rejected registration leaves nothing behind.
  indexDefinition(def);
  (SCALE_DEFINITIONS as ScaleDefinition[]).push(def);
  dictionaryVersion++;
}

/**
 * Remove a scale template and all of its aliases. Accepts a canonical name or
 * any alias. Returns whether anything was removed.
 *
 * @example
 * ```ts
 * import { addScaleType, removeScaleType, isScaleName } from "musictheoryjs";
 * addScaleType("tempScale", "P1 M3 P5");
 * removeScaleType("tempScale"); // => true
 * removeScaleType("tempScale"); // => false
 * isScaleName("major"); // => true
 * ```
 */
export function removeScaleType(name: string): boolean {
  const defs = SCALE_DEFINITIONS as ScaleDefinition[];
  const index = defs.findIndex(
    (def) => def.name === name || def.aliases.includes(name)
  );
  if (index === -1) return false;
  const [removed] = defs.splice(index, 1) as [ScaleDefinition];
  const table = SCALE_TEMPLATES as Record<string, ScaleTemplate>;
  for (const key of [removed.name, ...removed.aliases]) delete table[key];
  dictionaryVersion++;
  return true;
}

/**
 * Drop every runtime addition and restore the built-in dictionary. Useful
 * between tests, or when a host application reloads its own definitions.
 *
 * @example
 * ```ts
 * import { addScaleType, resetScaleTypes, isScaleName } from "musictheoryjs";
 * addScaleType("scratch", "P1 P5");
 * resetScaleTypes();
 * isScaleName("scratch"); // => false
 * isScaleName("major"); // => true
 * ```
 */
export function resetScaleTypes(): void {
  const defs = SCALE_DEFINITIONS as ScaleDefinition[];
  const table = SCALE_TEMPLATES as Record<string, ScaleTemplate>;
  for (const key of Object.keys(table)) delete table[key];
  defs.length = 0;
  for (const def of BUILTIN_DEFINITIONS) {
    defs.push(def);
    indexDefinition(def);
  }
  dictionaryVersion++;
}

/** Accept spelled interval names, an array of them, or semitone offsets. */
function parseTemplate(
  intervals: string | ReadonlyArray<string | number>
): ScaleTemplate {
  const list =
    typeof intervals === "string" ? intervals.trim().split(/\s+/) : intervals;
  if (list.length === 0) {
    throw new RangeError("a scale template needs at least one interval");
  }
  return list.map((iv) =>
    typeof iv === "number" ? intervalFromSemitones(iv) : parseInterval(iv)
  );
}

/**
 * Split a scale name into its tonic and template halves without validating
 * either: `"C major"` → `["C", "major"]`. Templates are multi-word
 * (`"melodic minor"`), and the tonic is optional, so this resolves the
 * ambiguity by checking which prefix actually parses as a note.
 *
 * The template half is returned even when unknown, which is what makes this
 * useful for error messages and for user input that is still being typed.
 *
 * @example
 * ```ts
 * import { tokenizeScaleName } from "musictheoryjs";
 * tokenizeScaleName("C major"); // => ["C", "major"]
 * tokenizeScaleName("C4 melodic minor"); // => ["C4", "melodic minor"]
 * tokenizeScaleName("dorian"); // => ["", "dorian"]
 * tokenizeScaleName("Bb lydian"); // => ["Bb", "lydian"]
 * ```
 */
export function tokenizeScaleName(input: string): [string, string] {
  const trimmed = input.trim();
  if (trimmed === "") return ["", ""];
  const parts = trimmed.split(/\s+/);
  const head = parts[0] as string;
  const rest = parts.slice(1).join(" ");
  // A leading token is a tonic only if it reads as a note *and* leaves
  // something behind — otherwise "dorian" would be mistaken for the note D.
  if (rest !== "" && NOTE_HEAD.test(head)) return [head, rest];
  return ["", trimmed];
}

/** A note name at the head of a scale name: letter, accidentals, octave. */
const NOTE_HEAD = /^[A-Ga-g](#|b|s|x)*-?\d*$/;
