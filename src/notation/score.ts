/**
 * The score model shared by the notation exporters.
 *
 * A {@link Score} is a flat list of events — a note, a stack of notes, or a
 * rest, each with a {@link DurationLike} — plus the usual front matter (title,
 * time signature, key, tempo). The exporters also take lighter shapes and
 * normalise them here: a {@link Scale} becomes a run of notes, a {@link Chord}
 * one stacked event, and a plain array of note names a melody.
 */

import { Chord, type ChordLike } from "../chord/chord";
import { type Key, type KeyLike, key as toKey } from "../key/key";
import { Note, type NoteLike } from "../note/note";
import {
  type Duration,
  type DurationLike,
  asDuration,
  wholeNotes,
} from "../rhythm/duration";
import {
  type TimeSignature,
  type TimeSignatureLike,
  asTimeSignature,
} from "../rhythm/meter";
import { Scale } from "../scale/scale";

/** One event in a score: a note, several notes sounding together, or —
 * with `notes` and `chord` both absent — a rest. */
export interface ScoreEvent {
  /** The pitches sounding, for a note (one) or a stack (several). */
  readonly notes?: ReadonlyArray<Note | NoteLike | string>;
  /** A chord to sound, as an alternative to listing `notes`. */
  readonly chord?: ChordLike;
  /** How long the event lasts. Default a quarter. */
  readonly duration?: DurationLike;
}

/** A score: events plus front matter. */
export interface Score {
  readonly title?: string;
  /** Default 4/4. */
  readonly timeSignature?: TimeSignatureLike;
  /** Key for the key signature, e.g. `"Bb major"`. Default C major. */
  readonly key?: KeyLike;
  /** Tempo in quarter-note beats per minute, emitted when given. */
  readonly tempo?: number;
  readonly events: readonly ScoreEvent[];
}

/** What the exporters accept: a full {@link Score}, a {@link Scale} (a run of
 * its notes), a {@link Chord} (one stacked event), or an array mixing note
 * names, {@link Note}s, and {@link ScoreEvent}s. */
export type ScoreInput =
  | Score
  | Scale
  | Chord
  | ReadonlyArray<Note | NoteLike | string | ScoreEvent>;

/** Options for the notation exporters. A full {@link Score} input wins over
 * these field by field. */
export interface NotationOptions {
  readonly title?: string;
  /** Default 4/4. */
  readonly timeSignature?: TimeSignatureLike;
  /** Key for the key signature. Default C major. */
  readonly key?: KeyLike;
  /** Tempo in quarter-note beats per minute. */
  readonly tempo?: number;
  /** Duration for events that don't carry their own. Default a quarter
   * (a bare {@link Chord} input defaults to a whole note instead). */
  readonly duration?: DurationLike;
}

/** A normalised event: concrete pitches (empty = rest) and duration. */
export interface NormalEvent {
  readonly pitches: readonly Note[];
  readonly duration: Duration;
}

/** A normalised score, ready to render. */
export interface NormalScore {
  readonly title?: string;
  readonly timeSignature: TimeSignature;
  readonly key: Key;
  readonly tempo?: number;
  readonly events: readonly NormalEvent[];
}

function isScoreEvent(value: unknown): value is ScoreEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof Note) &&
    !("step" in value) &&
    ("notes" in value || "chord" in value || "duration" in value)
  );
}

function normalEvent(event: ScoreEvent, fallback: DurationLike): NormalEvent {
  const pitches =
    event.chord !== undefined
      ? Chord.from(event.chord).notes
      : (event.notes ?? []).map((n) => Note.from(n));
  return { pitches, duration: asDuration(event.duration ?? fallback) };
}

/** Normalise any {@link ScoreInput} to a {@link NormalScore}. */
export function asScore(
  input: ScoreInput,
  options: NotationOptions = {}
): NormalScore {
  let score: Score;
  if (input instanceof Scale) {
    score = { events: input.notes.map((n) => ({ notes: [n] })) };
  } else if (input instanceof Chord) {
    score = {
      events: [{ notes: input.notes, duration: options.duration ?? 1 }],
    };
  } else if (Array.isArray(input)) {
    score = {
      events: (
        input as ReadonlyArray<Note | NoteLike | string | ScoreEvent>
      ).map((item) => (isScoreEvent(item) ? item : { notes: [item] })),
    };
  } else {
    score = input as Score;
  }

  const fallback = options.duration ?? 4;
  return {
    ...((score.title ?? options.title)
      ? { title: score.title ?? options.title }
      : {}),
    timeSignature: asTimeSignature(
      score.timeSignature ?? options.timeSignature ?? "4/4"
    ),
    key: toKey(score.key ?? options.key ?? "C major"),
    ...((score.tempo ?? options.tempo) !== undefined
      ? { tempo: score.tempo ?? options.tempo }
      : {}),
    events: score.events.map((e) => normalEvent(e, fallback)),
  };
}

const EPS = 1e-9;

/** Plain and dotted note values, longest first, for greedy decomposition. */
const CANDIDATES: readonly Duration[] = [0.5, 1, 2, 4, 8, 16, 32, 64, 128]
  .flatMap((value) => [2, 1, 0].map((dots) => ({ value, dots })))
  .sort((a, b) => wholeNotes(b) - wholeNotes(a));

/**
 * Decompose a span of whole notes into plain/dotted values, longest first —
 * the pieces of a note split across a barline, or the rests that pad out a
 * measure. Residues below a 128th are dropped.
 */
export function decomposeWholeNotes(span: number): Duration[] {
  const out: Duration[] = [];
  let rest = span;
  while (rest > 1 / 128 - EPS) {
    const picked = CANDIDATES.find((c) => wholeNotes(c) <= rest + EPS);
    if (picked === undefined) break;
    out.push(picked);
    rest -= wholeNotes(picked);
  }
  return out;
}

/** A rendered piece of an event after barline splitting: its duration, and
 * whether a tie continues into the next piece. */
export interface EventPiece {
  readonly event: NormalEvent;
  readonly duration: Duration;
  readonly tie: boolean;
}

/** One measure of pieces. The last measure of a score may run short. */
export type Measure = EventPiece[];

/**
 * Lay events into measures of the score's meter, splitting events that cross
 * a barline into tied pieces. Rests split without ties.
 * @throws {RangeError} when a tuplet event crosses a barline — a split tuplet
 *   has no plain notation, so re-group the tuplet or change the meter.
 */
export function layoutMeasures(score: NormalScore): Measure[] {
  const barLength =
    score.timeSignature.numerator / score.timeSignature.denominator;
  const measures: Measure[] = [[]];
  let used = 0; // whole notes used in the current measure

  const push = (piece: EventPiece, length: number) => {
    (measures[measures.length - 1] as Measure).push(piece);
    used += length;
    if (used >= barLength - EPS) {
      measures.push([]);
      used = 0;
    }
  };

  for (const event of score.events) {
    let remaining = wholeNotes(event.duration);
    const room = barLength - used;
    if (remaining <= room + EPS) {
      push({ event, duration: event.duration, tie: false }, remaining);
      continue;
    }
    if (event.duration.tuplet !== undefined) {
      throw new RangeError(
        "a tuplet crosses a barline; re-group the tuplet or change the meter"
      );
    }
    const isRest = event.pitches.length === 0;
    // Fill the current measure, then whole measures, then the remainder —
    // each span decomposed into plain/dotted values, tied (unless a rest).
    const spans: number[] = [room];
    remaining -= room;
    while (remaining > barLength + EPS) {
      spans.push(barLength);
      remaining -= barLength;
    }
    if (remaining > EPS) spans.push(remaining);
    const pieces = spans.flatMap((span) => decomposeWholeNotes(span));
    pieces.forEach((duration, i) => {
      push(
        { event, duration, tie: !isRest && i < pieces.length - 1 },
        wholeNotes(duration)
      );
    });
  }

  const last = measures[measures.length - 1] as Measure;
  if (last.length === 0 && measures.length > 1) measures.pop();
  return measures;
}
