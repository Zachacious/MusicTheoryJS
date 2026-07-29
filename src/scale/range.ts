/**
 * Scale ranges — runs of scale tones between two pitches.
 *
 * Where `noteRange` (note module) walks every chromatic step, `scaleRange`
 * walks only the scale's degrees, spelled by the scale itself: two octaves of
 * D dorian eighth-notes is `scaleRange("D dorian", "D3", "D5")`. Endpoints
 * outside the scale simply bound the run; they are not added to it.
 */

import type { Note, NoteLike } from "../note/note";
import { Note as NoteClass } from "../note/note";
import { chroma } from "../pitch/spelled";
import { Scale, type ScaleLike } from "./scale";

/**
 * The scale's notes from `from` to `to`, inclusive at both ends, in order.
 * Descending when `from` is higher than `to`.
 *
 * @example
 * ```ts
 * import { scaleRange } from "musictheoryjs";
 * scaleRange("C4 major", "C4", "C5").map(String); // => ["C4","D4","E4","F4","G4","A4","B4","C5"]
 * scaleRange("C4 major", "E4", "B3").map(String); // => ["E4","D4","C4","B3"]
 * ```
 */
export function scaleRange(
  s: ScaleLike,
  from: Note | NoteLike | string,
  to: Note | NoteLike | string
): Note[] {
  const theScale = Scale.from(s);
  const start = chroma(NoteClass.from(from));
  const end = chroma(NoteClass.from(to));
  const low = Math.min(start, end);
  const high = Math.max(start, end);

  // Walk degrees from safely below the window; each full cycle of the scale
  // rises one octave, so overshoot by a cycle on each side.
  const size = theScale.size;
  const tonicChroma = chroma(theScale.tonic);
  const octavesBelow = Math.ceil((tonicChroma - low) / 12) + 1;
  const notes: Note[] = [];
  for (let k = 1 - octavesBelow * size; ; k++) {
    const candidate = theScale.degree(k);
    const c = chroma(candidate);
    if (c > high) break;
    if (c >= low) notes.push(candidate);
  }
  return start <= end ? notes : notes.reverse();
}
