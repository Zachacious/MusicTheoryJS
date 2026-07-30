/**
 * Song form: expand a letter scheme — AABA, verse/chorus, twelve-bar chorus
 * after chorus — into one flat timeline. This is the theory of form only:
 * sections and their order. What plays inside each section is whatever
 * stream you hand it; arranging instruments within a section is an
 * application's job.
 */

import type { NoteEvent, NoteStream, NoteStreamInput } from "../analysis/types";
import { asNoteStream, streamDuration } from "./stream";

/** One expanded section of a form: its name and where it landed. */
export interface FormSection {
  readonly name: string;
  /** Start of the section, in beats. */
  readonly start: number;
  /** The section's span in beats. */
  readonly length: number;
}

/** A laid-out form: the flattened stream and each section's placement. */
export interface SongForm {
  readonly stream: NoteStream;
  readonly sections: readonly FormSection[];
}

/**
 * Expand a form over named parts. The form is a string of one-letter section
 * names (`"AABA"`) or an array of longer ones (`["verse", "chorus"]`); each
 * name looks up its stream in `parts`. Sections follow one another; a
 * section's span is its stream's {@link streamDuration} unless `lengths`
 * fixes it (one number for all, or per name — use this when a part ends in
 * a rest, or to keep every section the same bar count).
 *
 * @example
 * ```ts
 * import { songForm, melody } from "musictheoryjs";
 * const a = melody(["C4", "E4"], "h");
 * const b = melody(["F4"], "w");
 * const tune = songForm("AABA", { A: a, B: b });
 * tune.sections.map((s) => s.name); // => ["A", "A", "B", "A"]
 * tune.sections.map((s) => s.start); // => [0, 4, 8, 12]
 * tune.stream.length; // => 7
 * const named = songForm(["verse", "chorus"], { verse: a, chorus: b }, { lengths: 8 });
 * named.sections.map((s) => s.start); // => [0, 8]
 * ```
 */
export function songForm(
  form: string | readonly string[],
  parts: Readonly<Record<string, NoteStreamInput>>,
  options: {
    /** Section span in beats: one number for every section, or per name. */
    lengths?: number | Readonly<Record<string, number>>;
  } = {}
): SongForm {
  const names = typeof form === "string" ? [...form] : [...form];
  if (names.length === 0) {
    throw new RangeError("form is empty");
  }
  const lengthOf = (name: string, stream: NoteStreamInput): number => {
    const l = options.lengths;
    const fixed =
      typeof l === "number" ? l : l === undefined ? undefined : l[name];
    return fixed ?? streamDuration(stream);
  };

  const events: NoteEvent[] = [];
  const sections: FormSection[] = [];
  let at = 0;
  for (const name of names) {
    const part = parts[name];
    if (part === undefined) {
      throw new RangeError(
        `form section "${name}" has no part (available: ${Object.keys(parts).join(", ")})`
      );
    }
    for (const e of asNoteStream(part)) {
      events.push({ ...e, start: e.start + at });
    }
    const length = lengthOf(name, part);
    sections.push({ name, start: at, length });
    at += length;
  }
  return { stream: events, sections };
}
