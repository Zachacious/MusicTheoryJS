/**
 * Counterpoint checking: the rules a species teacher marks in red, applied
 * to two melodic lines.
 *
 * The voicing engine in the chord module *avoids* parallels when it writes;
 * this is the other direction — two existing lines, examined. Streams are
 * sampled at every onset, and each pair of consecutive moments where both
 * voices sound is tested for parallel fifths and octaves (including the
 * antiparallel kind — the interval class repeating with both voices in
 * motion), direct (hidden) fifths and octaves — similar motion into a
 * perfect interval with a leap in the upper voice — voice crossing, and
 * voice overlap. Unisons count as octaves, and compound intervals as their
 * simple class, as the classroom rules have it.
 */

import { mod } from "../math/index";
import { Note } from "../note/note";
import type { NoteEvent, NoteStreamInput } from "./types";

const EPS = 1e-6;

/** One rule violation, timed at the moment of arrival. */
export interface CounterpointIssue {
  readonly type:
    | "parallel-fifths"
    | "parallel-octaves"
    | "direct-fifths"
    | "direct-octaves"
    | "voice-crossing"
    | "voice-overlap";
  /** The beat (or whatever unit the streams use) where the issue lands. */
  readonly time: number;
  readonly upper: Note;
  readonly lower: Note;
}

function normalize(stream: NoteStreamInput): NoteEvent[] {
  return stream
    .map((e) => ({ ...e, pitch: Note.from(e.pitch) }))
    .sort((a, b) => a.start - b.start);
}

/** The event sounding at `time`, latest-started when several qualify. */
function soundingAt(
  events: readonly NoteEvent[],
  time: number
): NoteEvent | null {
  let found: NoteEvent | null = null;
  for (const e of events) {
    if (e.start > time + EPS) break;
    if (e.start + e.duration > time + EPS) found = e;
  }
  return found;
}

/**
 * Check two lines — `upper` above, `lower` below — against the classical
 * rules. Issues come back in time order; an empty array is a clean pass.
 *
 * @example
 * ```ts
 * import { checkCounterpoint, melody } from "musictheoryjs";
 * const soprano = melody(["C5", "D5"], "q");
 * const alto = melody(["F4", "G4"], "q");
 * checkCounterpoint(soprano, alto).map((i) => i.type); // => ["parallel-fifths"]
 * // Contrary motion out of the fifth is fine.
 * checkCounterpoint(melody(["C5", "B4"], "q"), alto); // => []
 * checkCounterpoint(melody(["E4"], "q"), melody(["G4"], "q"))[0]?.type; // => "voice-crossing"
 * ```
 */
export function checkCounterpoint(
  upper: NoteStreamInput,
  lower: NoteStreamInput
): CounterpointIssue[] {
  const up = normalize(upper);
  const low = normalize(lower);
  const onsets = [...up, ...low]
    .map((e) => e.start)
    .sort((a, b) => a - b)
    .filter((t, i, all) => i === 0 || t - (all[i - 1] as number) > EPS);

  const moments: { time: number; upper: Note; lower: Note }[] = [];
  for (const time of onsets) {
    const u = soundingAt(up, time);
    const l = soundingAt(low, time);
    if (u !== null && l !== null) {
      moments.push({ time, upper: u.pitch, lower: l.pitch });
    }
  }

  const issues: CounterpointIssue[] = [];
  const flag = (
    type: CounterpointIssue["type"],
    at: { time: number; upper: Note; lower: Note }
  ): void => {
    issues.push({ type, time: at.time, upper: at.upper, lower: at.lower });
  };

  moments.forEach((moment, i) => {
    const prev = moments[i - 1];
    const crossed = moment.upper.midi < moment.lower.midi;
    // Flag a crossing where it begins, not on every beat it persists.
    const wasCrossed = prev !== undefined && prev.upper.midi < prev.lower.midi;
    if (crossed && !wasCrossed) flag("voice-crossing", moment);
    if (prev === undefined) return;

    const du = moment.upper.midi - prev.upper.midi;
    const dl = moment.lower.midi - prev.lower.midi;
    const prevClass = mod(prev.upper.midi - prev.lower.midi, 12);
    const currClass = mod(moment.upper.midi - moment.lower.midi, 12);

    if (du !== 0 && dl !== 0) {
      if (currClass === 7 && prevClass === 7) {
        flag("parallel-fifths", moment);
      } else if (currClass === 0 && prevClass === 0) {
        flag("parallel-octaves", moment);
      } else if (du * dl > 0 && Math.abs(du) > 2) {
        // Similar motion into a perfect interval, upper voice leaping.
        if (currClass === 7) flag("direct-fifths", moment);
        else if (currClass === 0) flag("direct-octaves", moment);
      }
    }
    // Overlap: a voice moves past where the other just stood.
    if (dl !== 0 && moment.lower.midi > prev.upper.midi) {
      flag("voice-overlap", moment);
    } else if (du !== 0 && moment.upper.midi < prev.lower.midi) {
      flag("voice-overlap", moment);
    }
  });

  return issues;
}
