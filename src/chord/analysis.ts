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
import { pcsetMask, pcsetSize, pcsetTranspose } from "../pitch/pcset";
import { pitchClass as pitchClassOf } from "../pitch/spelled";
import { Chord } from "./chord";
import {
  CHORD_DEFINITIONS,
  CHORD_TEMPLATES,
  type ChordQuality,
  chordDictionaryVersion,
} from "./templates";

/** Mask of semitones-above-root, or -1 when the input isn't whole semitones. */
function maskFromSemitones(semitones: Iterable<number>): number {
  let mask = 0;
  for (const s of semitones) {
    if (!Number.isInteger(s)) return -1;
    mask |= 1 << (((s % 12) + 12) % 12);
  }
  return mask;
}

/**
 * Precomputed mask → qualities (dictionary order wins on ties). Rebuilt
 * whenever the dictionary changes, so a quality registered at runtime is
 * detectable immediately.
 */
let maskCache: ReadonlyMap<number, ChordQuality[]> = new Map();
let maskCacheVersion = -1;

function maskToQualities(): ReadonlyMap<number, ChordQuality[]> {
  const version = chordDictionaryVersion();
  if (version === maskCacheVersion) return maskCache;
  const map = new Map<number, ChordQuality[]>();
  for (const def of CHORD_DEFINITIONS) {
    const mask = pcsetMask(def.intervals.map((iv) => iv.semitones));
    const list = map.get(mask);
    if (list) list.push(def.name);
    else map.set(mask, [def.name]);
  }
  maskCache = map;
  maskCacheVersion = version;
  return map;
}

/** The chord quality matching an exact set of intervals-above-root, if any. */
export function detectQuality(
  semitonesAboveRoot: Iterable<number>
): ChordQuality | undefined {
  return maskToQualities().get(maskFromSemitones(semitonesAboveRoot))?.[0];
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
    const quality = maskToQualities().get(pcsetTranspose(mask, -rootPc))?.[0];
    if (quality) {
      return Chord.of(root, quality);
    }
  }
  return null;
}

/** The pitch-class mask of a named quality, rooted on its own root. */
function qualityMask(quality: ChordQuality): number {
  const template = CHORD_TEMPLATES[quality];
  if (!template) throw new RangeError(`unknown chord quality: "${quality}"`);
  return pcsetMask(template.map((iv) => iv.semitones));
}

/**
 * The qualities that contain this one — every chord you could extend it into
 * over the same root without dropping a tone. A major triad extends into
 * maj7, 6, 9 and the rest of its family; the quality itself is never listed.
 *
 * @example
 * ```ts
 * import { chordSupersets } from "musictheoryjs";
 * const wider = chordSupersets("maj");
 * wider.includes("maj7"); // => true
 * wider.includes("maj6"); // => true
 * wider.includes("maj"); // => false
 * wider.includes("min"); // => false
 * ```
 */
export function chordSupersets(quality: ChordQuality): ChordQuality[] {
  const mask = qualityMask(quality);
  return CHORD_DEFINITIONS.filter((def) => {
    const other = pcsetMask(def.intervals.map((iv) => iv.semitones));
    return other !== mask && (other & mask) === mask;
  }).map((def) => def.name);
}

/**
 * The qualities contained within this one — every chord you could reduce it
 * to. A major triad reduces to the bare fifth; the quality itself is never
 * listed. Results come back smallest first.
 *
 * @example
 * ```ts
 * import { chordSubsets } from "musictheoryjs";
 * const narrower = chordSubsets("maj7");
 * narrower.includes("maj"); // => true
 * narrower.includes("power"); // => true
 * narrower.includes("maj7"); // => false
 * ```
 */
export function chordSubsets(quality: ChordQuality): ChordQuality[] {
  const mask = qualityMask(quality);
  return CHORD_DEFINITIONS.map((def) => ({
    name: def.name,
    mask: pcsetMask(def.intervals.map((iv) => iv.semitones)),
  }))
    .filter((d) => d.mask !== mask && (d.mask & mask) === d.mask)
    .sort((a, b) => pcsetSize(a.mask) - pcsetSize(b.mask))
    .map((d) => d.name);
}
