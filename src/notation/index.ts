/**
 * The notation module: export notes, chords, scales, or full scores as ABC
 * tunes or MusicXML documents — durations, dots, tuplets, key and time
 * signatures, ties across barlines.
 */

export type {
  NotationOptions,
  Score,
  ScoreEvent,
  ScoreInput,
} from "./score";
export * from "./abc";
export * from "./musicxml";
