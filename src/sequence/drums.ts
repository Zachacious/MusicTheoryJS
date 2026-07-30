/**
 * Drum tracks: rhythm patterns onto General MIDI percussion.
 *
 * GM reserves channel 9 (the tenth, counting from one) for drums — note
 * numbers there select instruments, not pitches. {@link GM_DRUMS} names
 * them, and {@link drumPattern} lays drum-machine grids onto a beat-timed
 * stream, one line per instrument. The result converts like any stream;
 * pass `channel: 9` to `sequenceToMidi` so players read it as percussion,
 * and `retuneMidi` already knows to leave that channel alone.
 */

import type { NoteEvent, NoteStream } from "../analysis/types";
import { Note } from "../note/note";
import { type DurationLike, durationBeats } from "../rhythm/duration";
import type { RhythmStep } from "../rhythm/pattern";

/** General MIDI percussion note numbers by name (`kick` = 36, the GM Bass
 * Drum 1). `hihat` is an alias for `closed-hihat`. */
export const GM_DRUMS: Readonly<Record<string, number>> = {
  "kick-2": 35,
  kick: 36,
  "side-stick": 37,
  snare: 38,
  clap: 39,
  "snare-2": 40,
  "low-floor-tom": 41,
  "closed-hihat": 42,
  hihat: 42,
  "high-floor-tom": 43,
  "pedal-hihat": 44,
  "low-tom": 45,
  "open-hihat": 46,
  "low-mid-tom": 47,
  "high-mid-tom": 48,
  crash: 49,
  "high-tom": 50,
  ride: 51,
  china: 52,
  "ride-bell": 53,
  tambourine: 54,
  splash: 55,
  cowbell: 56,
  "crash-2": 57,
  vibraslap: 58,
  "ride-2": 59,
  "high-bongo": 60,
  "low-bongo": 61,
  "mute-conga": 62,
  "open-conga": 63,
  "low-conga": 64,
  "high-timbale": 65,
  "low-timbale": 66,
  "high-agogo": 67,
  "low-agogo": 68,
  cabasa: 69,
  maracas: 70,
  "short-whistle": 71,
  "long-whistle": 72,
  "short-guiro": 73,
  "long-guiro": 74,
  claves: 75,
  "high-woodblock": 76,
  "low-woodblock": 77,
  "mute-cuica": 78,
  "open-cuica": 79,
  "mute-triangle": 80,
  "open-triangle": 81,
};

/** A drum line: a grid string (`"x..X"` — `x` hit, `X` accented hit, `.`,
 * `-`, or `0` rest, whitespace ignored) or a plain rhythm pattern. */
export type DrumLine = string | readonly RhythmStep[];

function lineSteps(line: DrumLine, drum: string): number[] {
  if (typeof line !== "string") return line.map((s) => (s ? 1 : 0));
  const steps: number[] = [];
  for (const c of line) {
    if (/\s/.test(c)) continue;
    if (c === "x" || c === "1") steps.push(1);
    else if (c === "X") steps.push(2);
    else if (c === "." || c === "-" || c === "0") steps.push(0);
    else {
      throw new SyntaxError(
        `unexpected "${c}" in the ${drum} pattern; use x, X, ., -, or spaces`
      );
    }
  }
  return steps;
}

/**
 * Drum-machine grids as one beat-timed stream. Each entry pairs a
 * {@link GM_DRUMS} name with its line; all lines share the grid `step`
 * (default a sixteenth). Accented hits (`X`) carry the base velocity plus
 * 20; plain hits leave velocity to the MIDI writer's default unless
 * `velocity` sets one.
 *
 * @example
 * ```ts
 * import { drumPattern, GM_DRUMS, euclideanRhythm } from "musictheoryjs";
 * const groove = drumPattern({
 *   kick: "x...x...",
 *   snare: "..x...x.",
 *   hihat: "xxxxxxxx",
 * });
 * groove.length; // => 12
 * groove.filter((e) => e.pitch.midi === GM_DRUMS.kick).map((e) => e.start); // => [0, 1]
 * drumPattern({ snare: "..X." })[0]?.velocity; // => 100
 * drumPattern({ cowbell: euclideanRhythm(8, 3) }, { step: "8" }).map((e) => e.start); // => [0, 1.5, 3]
 * ```
 */
export function drumPattern(
  parts: Readonly<Record<string, DrumLine>>,
  options: {
    /** Grid step duration. Default a sixteenth note. */
    step?: DurationLike;
    /** Velocity for plain hits; accents add 20 on top of it (or of 80). */
    velocity?: number;
    /** Fraction of the step each hit sounds (default 1). */
    gate?: number;
    start?: number;
  } = {}
): NoteStream {
  const step = durationBeats(options.step ?? 16);
  const gate = options.gate ?? 1;
  if (!(gate > 0)) {
    throw new RangeError(`gate must be positive, got ${gate}`);
  }
  const events: NoteEvent[] = [];
  for (const [drum, line] of Object.entries(parts)) {
    const noteNumber = GM_DRUMS[drum];
    if (noteNumber === undefined) {
      throw new RangeError(`unknown drum "${drum}"; use a GM_DRUMS name`);
    }
    const pitch = Note.fromMidi(noteNumber);
    lineSteps(line, drum).forEach((hit, i) => {
      if (!hit) return;
      const accent = hit === 2;
      const velocity = accent
        ? Math.min(127, (options.velocity ?? 80) + 20)
        : options.velocity;
      events.push({
        pitch,
        start: (options.start ?? 0) + i * step,
        duration: step * gate,
        ...(velocity !== undefined ? { velocity } : {}),
      });
    });
  }
  return events.sort((a, b) => a.start - b.start);
}
