/**
 * The analysis module: symbolic music-theory analytics over notes and note
 * streams — pitch-class set theory, key detection, and harmonic (chord)
 * analysis over time. Pure and dependency-free; audio transcription is a client
 * concern that feeds {@link NoteEvent}s in.
 */

export * from "./types";
export * from "./pcset";
export * from "./key";
export * from "./chords";
export * from "./harmony";
