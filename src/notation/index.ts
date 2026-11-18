/**
 * The notation module: move music in and out as written text. Export notes,
 * chords, scales, or full scores as ABC tunes or MusicXML documents —
 * durations, dots, tuplets, key and time signatures, ties across barlines —
 * and read both back as beat-timed streams: ABC with its rhythm, chords,
 * and ties, MusicXML with parts, voices, ties, and front matter.
 */

export type {
  NotationOptions,
  Score,
  ScoreEvent,
  ScoreInput,
} from "./score.js";
export * from "./abc.js";
export * from "./abc-parse.js";
export * from "./musicxml.js";
export * from "./musicxml-parse.js";
