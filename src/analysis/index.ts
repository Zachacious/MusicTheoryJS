/**
 * The analysis module: symbolic music-theory analytics over notes and note
 * streams — pitch-class set theory with Forte set-class names, twelve-tone
 * rows, key detection, harmonic (chord) analysis over time, and
 * counterpoint checking between lines. Pure and dependency-free; audio
 * transcription is a client concern that feeds {@link NoteEvent}s in.
 */

export * from "./types.js";
export * from "./pcset.js";
export * from "./forte.js";
export * from "./key.js";
export * from "./chords.js";
export * from "./harmony.js";
export * from "./counterpoint.js";
export * from "./serial.js";
export * from "./modulation.js";
