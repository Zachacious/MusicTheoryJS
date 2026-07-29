/**
 * The notation module: move music in and out as written text. Export notes,
 * chords, scales, or full scores as ABC tunes or MusicXML documents —
 * durations, dots, tuplets, key and time signatures, ties across barlines —
 * and read ABC back, single pitches or whole tunes.
 */

export type {
  NotationOptions,
  Score,
  ScoreEvent,
  ScoreInput,
} from "./score";
export * from "./abc";
export * from "./abc-parse";
export * from "./musicxml";
