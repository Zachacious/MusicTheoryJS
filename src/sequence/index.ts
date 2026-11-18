/**
 * The sequence module: notes placed in time. Everything upstream answers
 * "what notes"; this module answers "when" — melodies and rhythm-pattern
 * lines, arpeggios and strums, comped progressions and bass lines, groove
 * (swing, accent, humanize, gate), the motif transforms of counterpoint
 * (retrograde, inversion, augmentation, the diatonic sequence), and song
 * form. Streams are timed in quarter-note beats and convert exactly to MIDI,
 * to notation scores, and back.
 */

export * from "./stream.js";
export * from "./arpeggio.js";
export * from "./comp.js";
export * from "./drums.js";
export * from "./groove.js";
export * from "./motif.js";
export * from "./form.js";
export * from "./convert.js";
