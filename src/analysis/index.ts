/**
 * The analysis module: symbolic music-theory analytics over notes and note
 * streams — pitch-class set theory with Forte set-class names, twelve-tone
 * rows, key detection, harmonic (chord) analysis over time, and
 * counterpoint checking between lines. Pure and dependency-free; audio
 * transcription is a client concern that feeds {@link NoteEvent}s in.
 */

export * from "./types";
export * from "./pcset";
export * from "./forte";
export * from "./key";
export * from "./chords";
export * from "./harmony";
export * from "./counterpoint";
export * from "./serial";
export * from "./modulation";
