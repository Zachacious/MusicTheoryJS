/**
 * Voicing dictionaries: named, idiomatic ways to arrange a chord's tones.
 *
 * A dictionary maps a chord quality to one or more voicings, each written as
 * intervals above the root. Writing them as intervals rather than notes is what
 * makes them portable — the same entry voices the chord on any root, and the
 * spelling follows from the interval, so a `m3` stays a minor third rather than
 * becoming an augmented second.
 *
 * The entries here are the two that come up constantly: rootless left-hand
 * voicings for jazz piano comping, and plain triad inversions. Callers can pass
 * any object of the same shape.
 */

import type { Interval } from "../interval/interval";
import { parseInterval } from "../interval/parse";
import type { Note } from "../note/note";
import { Chord, type ChordLike } from "./chord";
import type { ChordQuality } from "./templates";

/** Voicings for a chord quality, each a list of intervals above the root. */
export type VoicingDictionary = Readonly<Record<string, readonly string[]>>;

/**
 * Rootless left-hand jazz voicings — the Bill Evans shapes. Each quality lists
 * its A and B forms, so a comping part can alternate between them to keep the
 * voice leading tight. The root is deliberately absent: the bass has it.
 */
export const LEFTHAND_VOICINGS: VoicingDictionary = {
  dom7: ["M3 M6 m7 M9", "m7 M9 M10 M13"],
  maj69: ["M3 P5 A6 M9"],
  min7: ["m3 P5 m7 M9", "m7 M9 m10 P12"],
  maj7: ["M3 P5 M7 M9", "M7 M9 M10 P12"],
  min7b5: ["m3 d5 m7 P8", "m7 P8 m10 d12"],
  dom7b9: ["M3 m6 m7 m9", "m7 m9 M10 m13"],
  dom7b13: ["M3 m6 m7 m9", "m7 m9 M10 m13"],
  dim7: ["P1 m3 d5 M6", "d5 M6 P8 m10"],
  dom7s11: ["m7 M9 A11 A13"],
  dom7s9: ["M3 m7 A9"],
  minMaj7: ["m3 P5 M7 M9", "M7 M9 m10 P12"],
  min6: ["m3 P5 M6 M9", "M6 M9 m10 P12"],
};

/** Triads in root position and both inversions, voiced close. */
export const TRIAD_VOICINGS: VoicingDictionary = {
  maj: ["P1 M3 P5", "M3 P5 P8", "P5 P8 M10"],
  min: ["P1 m3 P5", "m3 P5 P8", "P5 P8 m10"],
  dim: ["P1 m3 d5", "m3 d5 P8", "d5 P8 m10"],
  aug: ["P1 M3 A5", "M3 A5 P8", "A5 P8 M10"],
};

/**
 * The voicings a dictionary holds for a quality, as parsed intervals. Returns
 * an empty array when the dictionary has no entry, so callers can fall back
 * rather than branch on `undefined`.
 *
 * @example
 * ```ts
 * import { lookupVoicings, LEFTHAND_VOICINGS, intervalName } from "musictheoryjs";
 * const forms = lookupVoicings("maj7", LEFTHAND_VOICINGS);
 * forms.length; // => 2
 * forms[0].map(intervalName); // => ["M3", "P5", "M7", "M9"]
 * lookupVoicings("power", LEFTHAND_VOICINGS); // => []
 * ```
 */
export function lookupVoicings(
  quality: ChordQuality | string,
  dictionary: VoicingDictionary = LEFTHAND_VOICINGS
): Interval[][] {
  const entry = dictionary[quality];
  if (!entry) return [];
  return entry.map((form) => form.split(/\s+/).map(parseInterval));
}

/**
 * Voice a chord using a dictionary: every form the dictionary lists for that
 * chord's quality, realised as notes above its root.
 *
 * @example
 * ```ts
 * import { voicingsOf, TRIAD_VOICINGS, LEFTHAND_VOICINGS } from "musictheoryjs";
 * const forms = voicingsOf("C", TRIAD_VOICINGS);
 * forms.length; // => 3
 * forms[0].map(String); // => ["C4", "E4", "G4"]
 * forms[1].map(String); // => ["E4", "G4", "C5"]
 * // Rootless left-hand voicings leave the root to the bass.
 * voicingsOf("Dm7", LEFTHAND_VOICINGS)[0].map(String); // => ["F4", "A4", "C5", "E5"]
 * ```
 */
export function voicingsOf(
  chord: ChordLike,
  dictionary: VoicingDictionary = LEFTHAND_VOICINGS
): Note[][] {
  const c = Chord.from(chord);
  // A chord built from bare intervals has no named quality, so no dictionary
  // can speak for it.
  if (c.quality === undefined) return [];
  return lookupVoicings(c.quality, dictionary).map((form) =>
    form.map((iv) => c.root.transpose(iv))
  );
}
