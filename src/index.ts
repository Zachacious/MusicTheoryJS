/**
 * MusicTheoryJS — a modern, tree-shakable music theory library.
 *
 * Primarily Western and ergonomic (correct enharmonic spelling, spelled
 * intervals, scales, and chords), with first-class support for non-standard
 * tunings and microtonal/non-Western music through a pluggable tuning system.
 *
 * The public API is a set of named exports. For the smallest bundles, import
 * from a subpath (`musictheoryjs/note`, `/interval`, `/scale`, `/chord`,
 * `/sequence`, `/tuning`) so unused areas tree-shake away.
 *
 * @example Western
 * ```ts
 * import { Note, Scale, Chord } from "musictheoryjs";
 * Scale.from("C4", "major").noteNames(); // => ["C4","D4","E4","F4","G4","A4","B4"]
 * Chord.from("Cmaj7").noteNames(); // => ["C4","E4","G4","B4"]
 * ```
 *
 * @example Microtonal / non-Western
 * ```ts
 * import { equalTemperament, centsTuning, scaleFromTuning } from "musictheoryjs";
 * scaleFromTuning(equalTemperament(24)).length; // => 24
 * const rast = centsTuning([0, 204, 355, 498, 702, 906, 1057], { name: "Rast" });
 * scaleFromTuning(rast, { frequency: 264 }, true).length; // => 8
 * ```
 *
 * @module
 */

export * from "./collection/index";
export * from "./pitch/index";
export * from "./interval/index";
export * from "./note/index";
export * from "./tuning/index";
export * from "./scale/index";
export * from "./chord/index";
export * from "./key/index";
export * from "./rhythm/index";
export * from "./sequence/index";
export * from "./analysis/index";
export * from "./midi/index";
export * from "./notation/index";
export * from "./audio/index";

/** The library version. */
export const VERSION = "3.2.0";
