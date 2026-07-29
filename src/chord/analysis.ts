/**
 * Chord analysis: recognising a chord from a set of notes.
 *
 * Detection works on pitch classes (spelling-independent) as 12-bit masks:
 * every template's pitch-class set is one integer, so trying a candidate root
 * is a rotate-and-look-up, not an array comparison. Each note is tried as a
 * possible root and the resulting mask matched against the known
 * {@link CHORD_TEMPLATES}. This is the inverse of building a chord from a
 * symbol.
 */

import { Note, type NoteLike } from "../note/note";
import { pcsetMask, pcsetTranspose } from "../pitch/pcset";
import { pitchClass as pitchClassOf } from "../pitch/spelled";
import { Chord } from "./chord";
import { CHORD_DEFINITIONS, type ChordQuality } from "./templates";

/** Mask of semitones-above-root, or -1 when the input isn't whole semitones. */
function maskFromSemitones(semitones: Iterable<number>): number {
  let mask = 0;
  for (const s of semitones) {
    if (!Number.isInteger(s)) return -1;
    mask |= 1 << (((s % 12) + 12) % 12);
  }
  return mask;
}

/** Precomputed mask → qualities (dictionary order wins on ties). */
const MASK_TO_QUALITIES: ReadonlyMap<number, ChordQuality[]> = (() => {
  const map = new Map<number, ChordQuality[]>();
  for (const def of CHORD_DEFINITIONS) {
    const mask = pcsetMask(def.intervals.map((iv) => iv.semitones));
    const list = map.get(mask);
    if (list) list.push(def.name);
    else map.set(mask, [def.name]);
  }
  return map;
})();

/** The chord quality matching an exact set of intervals-above-root, if any. */
export function detectQuality(
  semitonesAboveRoot: Iterable<number>
): ChordQuality | undefined {
  return MASK_TO_QUALITIES.get(maskFromSemitones(semitonesAboveRoot))?.[0];
}

/**
 * Identify the chord formed by a set of notes. Every note is tried as a
 * potential root; the first exact template match is returned, preferring the
 * lowest note as the root when it yields a match.
 *
 * @returns a {@link Chord} (with its detected quality and the matched root), or
 *   `null` if no known chord fits.
 */
export function detectChord(
  notes: ReadonlyArray<Note | NoteLike | string>
): Chord | null {
  const parsed = notes.map((n) => Note.from(n));
  if (parsed.length === 0) return null;

  const mask = pcsetMask(parsed.map((n) => pitchClassOf(n)));

  // Try the lowest-sounding note first, then upward, as the root — so
  // symmetric chords (aug, dim7) and unsorted input still root on the bass.
  const rootOrder = [...parsed].sort((a, b) => a.compareTo(b));
  for (const root of rootOrder) {
    const rootPc = pitchClassOf(root);
    const quality = MASK_TO_QUALITIES.get(pcsetTranspose(mask, -rootPc))?.[0];
    if (quality) {
      return Chord.of(root, quality);
    }
  }
  return null;
}
