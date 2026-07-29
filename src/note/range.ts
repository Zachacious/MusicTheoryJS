/**
 * Note ranges — chromatic runs between two pitches.
 *
 * The run is inclusive of both endpoints and follows their direction:
 * `noteRange("C4", "E4")` ascends, `noteRange("E4", "C4")` descends. Ascending
 * runs spell with sharps by default, descending runs with flats — the way the
 * two directions are conventionally written — with `prefer` overriding either.
 * For runs filtered through a scale, see `scaleRange` in the scale module.
 */

import { chroma } from "../pitch/spelled";
import { type EnharmonicPreference, Note, type NoteLike } from "./note";

/**
 * Every chromatic note from `from` to `to`, inclusive, in order.
 *
 * @param options.prefer - Accidental spelling for the black keys. Defaults to
 *   `"sharp"` ascending and `"flat"` descending.
 *
 * @example
 * ```ts
 * import { noteRange } from "musictheoryjs";
 * noteRange("C4", "E4").map(String); // => ["C4","C#4","D4","D#4","E4"]
 * noteRange("E4", "C4").map(String); // => ["E4","Eb4","D4","Db4","C4"]
 * ```
 */
export function noteRange(
  from: Note | NoteLike | string,
  to: Note | NoteLike | string,
  options: { prefer?: EnharmonicPreference } = {}
): Note[] {
  const start = chroma(Note.from(from));
  const end = chroma(Note.from(to));
  const ascending = start <= end;
  const prefer = options.prefer ?? (ascending ? "sharp" : "flat");
  const step = ascending ? 1 : -1;
  const notes: Note[] = [];
  for (let c = start; ascending ? c <= end : c >= end; c += step) {
    // MIDI numbers sit 12 above chroma (both count semitones from C).
    notes.push(Note.fromMidi(c + 12, prefer));
  }
  return notes;
}
