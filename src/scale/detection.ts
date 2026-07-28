/**
 * Scale detection: finding which known scales a set of notes belongs to.
 *
 * Matching is by pitch-class set (spelling-independent). A template matches when
 * its pitch classes, rooted on a candidate tonic, exactly equal the input set —
 * so only scales with the same number of distinct notes are considered.
 */

import { mod } from "../math/index";
import { Note, type NoteLike } from "../note/note";
import { pitchClass as pitchClassOf } from "../pitch/spelled";
import { SCALE_TEMPLATES, type ScaleName } from "./templates";

/** A scale that fits a set of notes. */
export interface ScaleMatch {
  /** The tonic the scale is rooted on. */
  readonly tonic: Note;
  /** The matched template name. */
  readonly name: ScaleName;
}

function pcSetKey(pcs: Iterable<number>): string {
  return [...new Set(pcs)].sort((a, b) => a - b).join(",");
}

/**
 * All known scales whose pitch-class set exactly matches `notes`. Every input
 * note is tried as the tonic, so e.g. the white keys match both C major and
 * A minor (and the other modes).
 */
export function detectScales(
  notes: ReadonlyArray<Note | NoteLike | string>
): ScaleMatch[] {
  const parsed = notes.map((n) => Note.from(n));
  if (parsed.length === 0) return [];

  const targetPcs = new Set(parsed.map((n) => pitchClassOf(n)));
  const targetKey = pcSetKey(targetPcs);
  const matches: ScaleMatch[] = [];
  // De-duplicate on (root pitch class, scale name) so the same note appearing
  // in two octaves doesn't yield the same match twice.
  const seen = new Set<string>();

  for (const tonic of parsed) {
    const rootPc = pitchClassOf(tonic);
    for (const [name, intervals] of Object.entries(SCALE_TEMPLATES)) {
      if (intervals.length !== targetPcs.size) continue;
      const templateKey = pcSetKey(
        intervals.map((iv) => mod(rootPc + iv.semitones, 12))
      );
      if (templateKey !== targetKey) continue;
      const dedupeKey = `${rootPc}:${name}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      matches.push({ tonic, name: name as ScaleName });
    }
  }
  return matches;
}
