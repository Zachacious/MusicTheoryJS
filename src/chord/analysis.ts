/**
 * Chord analysis: recognising a chord from a set of notes.
 *
 * Detection works on pitch classes (spelling-independent), trying each note as
 * a possible root and matching the resulting interval signature against the
 * known {@link CHORD_TEMPLATES}. This is the inverse of building a chord from a
 * symbol.
 */

import { mod } from "../math/index";
import { Note, type NoteLike } from "../note/note";
import { pitchClass as pitchClassOf } from "../pitch/spelled";
import { Chord } from "./chord";
import { CHORD_TEMPLATES, type ChordQuality } from "./templates";

/** A pitch-class signature: sorted, unique semitones above the root (mod 12). */
function signatureFromSemitones(semitones: Iterable<number>): string {
  const set = new Set<number>();
  for (const s of semitones) set.add(mod(s, 12));
  return [...set].sort((a, b) => a - b).join(",");
}

/** Precomputed signature → qualities (first listed wins on ties). */
const SIGNATURE_TO_QUALITIES: ReadonlyMap<string, ChordQuality[]> = (() => {
  const map = new Map<string, ChordQuality[]>();
  for (const [quality, intervals] of Object.entries(CHORD_TEMPLATES)) {
    const sig = signatureFromSemitones(intervals.map((iv) => iv.semitones));
    const list = map.get(sig);
    if (list) list.push(quality as ChordQuality);
    else map.set(sig, [quality as ChordQuality]);
  }
  return map;
})();

/** The chord quality matching an exact set of intervals-above-root, if any. */
export function detectQuality(
  semitonesAboveRoot: Iterable<number>
): ChordQuality | undefined {
  return SIGNATURE_TO_QUALITIES.get(
    signatureFromSemitones(semitonesAboveRoot)
  )?.[0];
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

  const pcs = parsed.map((n) => pitchClassOf(n));
  const uniquePcs = [...new Set(pcs)];

  // Try the lowest-sounding note first, then upward, as the root — so
  // symmetric chords (aug, dim7) and unsorted input still root on the bass.
  const rootOrder = [...parsed].sort((a, b) => a.compareTo(b));
  for (const root of rootOrder) {
    const rootPc = pitchClassOf(root);
    const quality = detectQuality(uniquePcs.map((pc) => pc - rootPc));
    if (quality) {
      return Chord.of(root, quality);
    }
  }
  return null;
}
