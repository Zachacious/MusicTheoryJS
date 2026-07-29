/**
 * The chord dictionary: one source of truth for every built-in quality.
 *
 * Each row defines a chord once — canonical name, spelled intervals, display
 * suffix, and the symbol-suffix aliases musicians actually write. Everything
 * else derives from this table: {@link CHORD_TEMPLATES} for building chords,
 * the suffix→quality map used by the symbol parser, the display suffix used
 * by `Chord.toString`, and the pitch-class masks used by detection.
 *
 * As with scales, spelling the intervals (M3 vs d4) keeps generated chord
 * tones correctly named. Dictionary order matters in one place: when two
 * qualities share a pitch-class set (e.g. `aug7` and `7b13`), detection
 * reports the one listed first.
 */

import type { Interval } from "../interval/interval";
import { parseInterval } from "../interval/parse";

/** A named chord template: intervals of each chord tone above the root. */
export type ChordTemplate = readonly Interval[];

/**
 * The dictionary rows: `[canonical name, spelled intervals, display suffix,
 * ...aliases]`. The canonical name, the display suffix, and every alias are
 * all accepted when parsing a chord symbol; the display suffix is what
 * `Chord.toString` prints.
 */
const DEFS = [
  // == Bare intervals ==
  ["power", "P1 P5", "5"],
  ["quartal", "P1 P4 m7 m10", "quartal", "4"],

  // == Major triads and added tones ==
  ["maj", "P1 M3 P5", "", "M", "major", "^"],
  ["majb5", "P1 M3 d5", "Mb5"],
  ["add9", "P1 M3 P5 M9", "add9", "Madd9", "add2", "2"],
  ["addb9", "P1 M3 P5 m9", "addb9", "Maddb9"],

  // == Sixths ==
  ["maj6", "P1 M3 P5 M6", "6", "M6", "add6", "add13"],
  ["maj69", "P1 M3 P5 M6 M9", "6/9", "69", "6add9", "M69"],
  ["maj6s11", "P1 M3 P5 M6 A11", "6#11", "M6#11", "6b5", "M6b5"],
  ["maj69s11", "P1 M3 P5 M6 M9 A11", "6/9#11", "69#11"],
  ["min6", "P1 m3 P5 M6", "m6", "-6"],
  ["min69", "P1 m3 P5 M6 M9", "m6/9", "m69", "-69"],

  // == Major sevenths ==
  ["maj7", "P1 M3 P5 M7", "maj7", "M7", "Maj7", "ma7", "Δ", "Δ7", "^7"],
  ["maj9", "P1 M3 P5 M7 M9", "maj9", "M9", "Δ9", "^9"],
  ["maj11", "P1 M3 P5 M7 M9 P11", "maj11", "M11"],
  ["maj13", "P1 M3 P5 M7 M9 M13", "maj13", "M13", "Δ13", "^13"],
  ["maj7b5", "P1 M3 d5 M7", "maj7b5", "M7b5"],
  [
    "maj7s5",
    "P1 M3 A5 M7",
    "maj7#5",
    "M7#5",
    "maj7+5",
    "+maj7",
    "augMaj7",
    "^7#5",
  ],
  ["maj9s5", "P1 M3 A5 M7 M9", "maj9#5", "M9#5", "Maj9#5"],
  ["maj7b6", "P1 M3 m6 M7", "maj7b6", "M7b6"],
  ["maj7b9", "P1 M3 P5 M7 m9", "maj7b9", "M7b9"],
  [
    "maj7s11",
    "P1 M3 P5 M7 A11",
    "maj7#11",
    "M7#11",
    "maj#4",
    "Δ#11",
    "Δ#4",
    "^7#11",
  ],
  ["maj9s11", "P1 M3 P5 M7 M9 A11", "maj9#11", "M9#11", "Δ9#11", "^9#11"],
  [
    "maj13s11",
    "P1 M3 P5 M7 M9 A11 M13",
    "maj13#11",
    "M13#11",
    "M13+4",
    "M13#4",
  ],
  ["maj7s9s11", "P1 M3 P5 M7 A9 A11", "maj7#9#11", "M7#9#11"],
  ["maj9b5", "P1 M3 d5 M7 M9", "maj9b5", "M9b5"],
  ["maj7add13", "P1 M3 P5 M6 M7 M9", "maj7add13", "M7add13"],

  // == Dominant sevenths ==
  ["dom7", "P1 M3 P5 m7", "7", "dom", "dom7"],
  ["dom9", "P1 M3 P5 m7 M9", "9"],
  ["dom11", "P1 P5 m7 M9 P11", "11"],
  ["dom13", "P1 M3 P5 m7 M9 M13", "13"],
  ["dom7no5", "P1 M3 m7", "7no5"],
  ["dom9no5", "P1 M3 m7 M9", "9no5"],
  ["dom13no5", "P1 M3 m7 M9 M13", "13no5"],
  ["dom7add6", "P1 M3 P5 m7 M13", "7add6", "67", "7add13"],
  ["dom7b6", "P1 M3 P5 m6 m7", "7b6"],

  // == Altered dominants ==
  // aug7 and 7b13 share a pitch-class set; aug7 is listed first so detection
  // keeps reporting it.
  ["aug7", "P1 M3 A5 m7", "aug7", "7#5", "+7", "7+", "7aug"],
  ["dom7b13", "P1 M3 m7 m13", "7b13"],
  ["dom7b5", "P1 M3 d5 m7", "7b5"],
  ["dom7b9", "P1 M3 P5 m7 m9", "7b9"],
  ["dom7s9", "P1 M3 P5 m7 A9", "7#9"],
  ["dom7s11", "P1 M3 P5 m7 A11", "7#11", "7#4"],
  ["dom9b5", "P1 M3 d5 m7 M9", "9b5"],
  ["dom9s5", "P1 M3 A5 m7 M9", "9#5", "9+", "aug9"],
  ["dom9b13", "P1 M3 m7 M9 m13", "9b13"],
  ["dom9s11", "P1 M3 P5 m7 M9 A11", "9#11", "9+4", "9#4"],
  ["dom9s5s11", "P1 M3 A5 m7 M9 A11", "9#5#11"],
  ["dom9s11b13", "P1 M3 P5 m7 M9 A11 m13", "9#11b13", "9b5b13"],
  ["dom13b5", "P1 M3 d5 m7 M9 M13", "13b5"],
  ["dom13b9", "P1 M3 P5 m7 m9 M13", "13b9"],
  ["dom13s9", "P1 M3 P5 m7 A9 M13", "13#9"],
  ["dom13s11", "P1 M3 P5 m7 M9 A11 M13", "13#11", "13+4", "13#4"],
  ["dom13b9s11", "P1 M3 P5 m7 m9 A11 M13", "13b9#11"],
  ["dom13s9s11", "P1 M3 P5 m7 A9 A11 M13", "13#9#11"],
  ["dom7s5b9", "P1 M3 A5 m7 m9", "7#5b9", "7b9#5"],
  ["dom7s5s9", "P1 M3 A5 m7 A9", "7#5#9", "7#9#5", "7alt"],
  ["dom7b9b13", "P1 M3 P5 m7 m9 m13", "7b9b13"],
  ["dom7b9s9", "P1 M3 P5 m7 m9 A9", "7b9#9"],
  ["dom7b9s11", "P1 M3 P5 m7 m9 A11", "7b9#11", "7b5b9", "7b9b5"],
  ["dom7s9b13", "P1 M3 P5 m7 A9 m13", "7#9b13"],
  ["dom7s9s11", "P1 M3 P5 m7 A9 A11", "7#9#11", "7b5#9", "7#9b5"],
  ["dom7s11b13", "P1 M3 P5 m7 A11 m13", "7#11b13", "7b5b13"],
  ["dom7s5b9s11", "P1 M3 A5 m7 m9 A11", "7#5b9#11"],
  [
    "dom7b9s11b13",
    "P1 M3 P5 m7 m9 A11 m13",
    "7b9#11b13",
    "7b9b13#11",
    "7b5b9b13",
  ],
  ["dom7s9s11b13", "P1 M3 P5 m7 A9 A11 m13", "7#9#11b13"],
  ["dom7alt", "P1 M3 m7 m9", "alt7", "alt"],

  // == Suspended ==
  ["sus2", "P1 M2 P5", "sus2"],
  ["sus4", "P1 P4 P5", "sus4", "sus"],
  ["sus24", "P1 M2 P4 P5", "sus24", "sus4add9", "sus2sus4"],
  ["dom7sus4", "P1 P4 P5 m7", "7sus4", "7sus"],
  ["dom9sus4", "P1 P4 P5 m7 M9", "9sus4", "9sus"],
  ["dom13sus4", "P1 P4 P5 m7 M9 M13", "13sus4", "13sus"],
  [
    "dom7sus4b9",
    "P1 P4 P5 m7 m9",
    "7sus4b9",
    "7susb9",
    "7b9sus4",
    "b9sus",
    "7b9sus",
    "phryg",
  ],
  ["dom7sus4b9b13", "P1 P4 P5 m7 m9 m13", "7sus4b9b13", "7b9b13sus4"],
  ["dom11b9", "P1 P5 m7 m9 P11", "11b9"],
  ["maj7sus4", "P1 P4 P5 M7", "maj7sus4", "M7sus4"],
  ["maj9sus4", "P1 P4 P5 M7 M9", "maj9sus4", "M9sus4"],
  ["dom7s5sus4", "P1 P4 A5 m7", "7#5sus4"],
  ["maj7s5sus4", "P1 P4 A5 M7", "maj7#5sus4", "M7#5sus4"],
  ["maj9s5sus4", "P1 P4 A5 M7 M9", "maj9#5sus4", "M9#5sus4"],

  // == Minor ==
  ["min", "P1 m3 P5", "m", "min", "minor", "-"],
  ["mins5", "P1 m3 A5", "m#5", "-#5", "m+"],
  ["minAdd4", "P1 m3 P4 P5", "madd4"],
  ["minAdd9", "P1 m3 P5 M9", "madd9", "minAdd9"],
  ["min7", "P1 m3 P5 m7", "m7", "min7", "mi7", "-7"],
  ["min9", "P1 m3 P5 m7 M9", "m9", "min9", "-9"],
  ["min11", "P1 m3 P5 m7 M9 P11", "m11", "min11", "-11"],
  ["min13", "P1 m3 P5 m7 M9 M13", "m13", "min13", "-13"],
  ["min7add11", "P1 m3 P5 m7 P11", "m7add11", "m7add4"],
  ["min7s5", "P1 m3 m6 m7", "m7#5"],
  ["min9s5", "P1 m3 m6 m7 M9", "m9#5"],
  ["minb6maj7", "P1 m3 m6 M7", "mb6M7"],
  ["minb6b9", "P1 m3 m6 m9", "mb6b9"],
  [
    "minMaj7",
    "P1 m3 P5 M7",
    "mMaj7",
    "mM7",
    "m/maj7",
    "m/M7",
    "mΔ",
    "-Δ7",
    "minMaj7",
  ],
  ["minMaj9", "P1 m3 P5 M7 M9", "mMaj9", "mM9"],
  ["minMaj11", "P1 m3 P5 M7 M9 P11", "mMaj11", "mM11"],
  ["minMaj13", "P1 m3 P5 M7 M9 M13", "mMaj13", "mM13"],
  ["minMaj7b6", "P1 m3 P5 m6 M7", "mMaj7b6"],
  ["minMaj9b6", "P1 m3 P5 m6 M7 M9", "mMaj9b6"],

  // == Diminished and half-diminished ==
  ["dim", "P1 m3 d5", "dim", "°", "o"],
  ["dim7", "P1 m3 d5 d7", "dim7", "°7", "o7"],
  ["dimMaj7", "P1 m3 d5 M7", "dimMaj7", "oM7", "°M7"],
  ["dim7Maj7", "P1 m3 d5 M6 M7", "dim7Maj7", "o7M7"],
  ["min7b5", "P1 m3 d5 m7", "m7b5", "min7b5", "ø", "ø7", "h", "h7", "-7b5"],
  ["min9b5", "P1 m3 d5 m7 M9", "m9b5"],

  // == Augmented ==
  ["aug", "P1 M3 A5", "aug", "+", "+5"],
  ["augAdd9", "P1 M3 A5 M9", "+add9", "M#5add9"],
  ["augAdds9", "P1 M3 A5 A9", "+add#9"],
] as const;

/** Canonical quality name of a chord template. */
export type ChordQuality = (typeof DEFS)[number][0];

/** One chord-dictionary entry: how a quality is built, printed, and parsed. */
export interface ChordDefinition {
  /** Canonical quality name, e.g. `"min7b5"`. */
  readonly name: ChordQuality;
  /** Intervals of each chord tone above the root. */
  readonly intervals: ChordTemplate;
  /** The suffix `Chord.toString` prints, e.g. `"m7b5"`. */
  readonly suffix: string;
  /** Further accepted symbol suffixes, e.g. `"ø"`. */
  readonly aliases: readonly string[];
}

/**
 * Every built-in chord quality, in dictionary order (the order detection uses
 * to break ties between qualities that share a pitch-class set).
 */
export const CHORD_DEFINITIONS: readonly ChordDefinition[] = DEFS.map(
  ([name, intervals, suffix, ...aliases]) => ({
    name,
    intervals: intervals.split(" ").map(parseInterval),
    suffix,
    aliases,
  })
);

/** Chord templates by canonical quality name. */
export const CHORD_TEMPLATES: Readonly<Record<ChordQuality, ChordTemplate>> =
  Object.fromEntries(
    CHORD_DEFINITIONS.map((def) => [def.name, def.intervals])
  ) as Record<ChordQuality, ChordTemplate>;

/** The canonical names of all built-in chord qualities, in dictionary order. */
export const CHORD_QUALITIES: readonly ChordQuality[] = CHORD_DEFINITIONS.map(
  (def) => def.name
);

/** Display suffix for each canonical chord quality. */
export const CHORD_SUFFIXES: Readonly<Record<ChordQuality, string>> =
  Object.fromEntries(
    CHORD_DEFINITIONS.map((def) => [def.name, def.suffix])
  ) as Record<ChordQuality, string>;

/** True if `name` is a known built-in chord template. */
export function isChordQuality(name: string): name is ChordQuality {
  return Object.hasOwn(CHORD_TEMPLATES, name);
}
