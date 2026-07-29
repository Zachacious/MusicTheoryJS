/**
 * @module tuning/registry
 * The tuning registry and the functions that consume it. Registered tunings
 * are visible to `frequency()` and `pitchBend()` by name — registering a
 * system actually changes what notes sound like (the audit's defect #9: the
 * old registry was invisible to `noteToFrequency`).
 */

import { MusicTheoryError, Pitch, note, semitoneHeight } from "../core";
import { closestMatch } from "../core/util";
import {
  Tuning,
  edoTuning,
  equalTemperament,
  isTuning,
  justTuning,
  meantoneTuning,
  pythagoreanTuning,
} from "./tuning";

/**
 * The implicit default for every tuning-taking function. A module constant —
 * re-registering the "equal" *name* changes what the name resolves to, never
 * what `frequency("A4")` means with no tuning argument.
 */
const DEFAULT_TUNING = equalTemperament();

let registry: Map<string, Tuning> | null = null;

function getRegistry(): Map<string, Tuning> {
  if (registry === null) {
    registry = new Map();
    for (const t of [
      equalTemperament(),
      pythagoreanTuning(),
      meantoneTuning(),
      justTuning(),
      edoTuning(19),
      edoTuning(24),
      edoTuning(31),
    ]) {
      registry.set(t.name, t);
    }
  }
  return registry;
}

/**
 * Register a tuning under its `name`, making it available to `frequency()`
 * and `pitchBend()` by that name. Re-registering a name replaces it.
 * Invalid tunings throw — there is no silent failure path.
 *
 * @example
 * ```ts
 * import { registerTuning, equalTemperament, frequency, tuningNames } from "musictheoryjs";
 *
 * // Any { name, description, a4, offset() } object works; the registry is global.
 * registerTuning({ ...equalTemperament({ a4: 432 }), name: "doctest-well" });
 * frequency("A4", "doctest-well"); // => 432
 * frequency("C4", "doctest-well"); // => ~256.87
 * tuningNames().includes("doctest-well"); // => true
 * ```
 */
export function registerTuning(tuning: Tuning): void {
  if (!isTuning(tuning) || tuning.name === "") {
    throw new MusicTheoryError(
      "Invalid tuning: expected { name, description, a4, offset() } with a non-empty name."
    );
  }
  if (!Number.isFinite(tuning.a4) || tuning.a4 <= 0) {
    throw new MusicTheoryError(
      `Invalid tuning a4 ${tuning.a4}: must be a positive number of Hz.`
    );
  }
  getRegistry().set(tuning.name, Object.isFrozen(tuning) ? tuning : Object.freeze({ ...tuning }));
}

/**
 * Look up a registered tuning by name; `null` when absent.
 *
 * @example
 * ```ts
 * import { getTuning } from "musictheoryjs";
 *
 * getTuning("meantone").name; // => "meantone"
 * getTuning("meantone").a4; // => 440
 * getTuning("no-such-tuning"); // => null
 * ```
 */
export function getTuning(name: string): Tuning | null {
  return getRegistry().get(name) ?? null;
}

/**
 * Names of all registered tunings (built-ins plus registered customs).
 *
 * @example
 * ```ts
 * import { tuningNames } from "musictheoryjs";
 *
 * tuningNames().slice(0, 4); // => ["equal", "pythagorean", "meantone", "just"]
 * tuningNames().includes("24-EDO"); // => true
 * ```
 */
export function tuningNames(): string[] {
  return [...getRegistry().keys()];
}

/**
 * Resolve a tuning argument: a `Tuning` object passes through, a name is
 * looked up in the registry (throwing with a suggestion when unknown), and
 * `undefined` means standard equal temperament at A4 = 440.
 *
 * @example
 * ```ts
 * import { resolveTuning, meantoneTuning } from "musictheoryjs";
 *
 * resolveTuning().name; // => "equal"
 * resolveTuning("just").name; // => "just"
 * resolveTuning(meantoneTuning({ a4: 415 })).a4; // => 415
 * resolveTuning("pythagorian"); // => throws "did you mean"
 * ```
 */
export function resolveTuning(input?: string | Tuning): Tuning {
  if (input === undefined) return DEFAULT_TUNING;
  if (isTuning(input)) return input;
  if (typeof input === "string") {
    const found = getRegistry().get(input);
    if (found !== undefined) return found;
    const suggestion = closestMatch(input, getRegistry().keys());
    throw new MusicTheoryError(
      `Unknown tuning ${JSON.stringify(input)}` +
        (suggestion !== null ? ` — did you mean "${suggestion}"?` : ".") +
        " Register custom tunings with registerTuning()."
    );
  }
  throw new MusicTheoryError(
    `Invalid tuning: ${JSON.stringify(input)}. Expected a registered name or a Tuning object.`
  );
}

/**
 * The tuning system's cents deviation from 12-TET for a note's spelled pitch
 * class (the note's own `cents` field is not included):
 * `tuningOffset("G#4", "meantone")` ≈ −17.1, `tuningOffset("Ab4", "meantone")`
 * ≈ +24.0 — spelled pitches, different offsets.
 *
 * @example
 * ```ts
 * import { tuningOffset } from "musictheoryjs";
 *
 * tuningOffset("G#4", "meantone"); // => ~-17.11
 * tuningOffset("Ab4", "meantone"); // => ~23.95
 * tuningOffset("Ab4"); // => 0
 * ```
 */
export function tuningOffset(
  input: string | Pitch,
  tuning?: string | Tuning
): number {
  return resolveTuning(tuning).offset(note(input));
}

/**
 * Frequency in Hz of a note under a tuning system, from the tuning's stored
 * reference pitch: `frequency("A4")` is 440, `frequency("C4",
 * equalTemperament({ a4: 432 }))` ≈ 256.87 (the old docs' retune example,
 * now correct). Includes the note's own `cents` deviation and the tuning's
 * spelled-pitch offset. `null` for pitch classes. Accepts registered names:
 * `frequency("E4", "just")`.
 *
 * @example
 * ```ts
 * import { frequency, equalTemperament } from "musictheoryjs";
 *
 * frequency("A4"); // => 440
 * frequency("C4", equalTemperament({ a4: 432 })); // => ~256.87
 * frequency("G#4", "meantone"); // => ~411.22
 * frequency("Ab4", "meantone"); // => ~421.09
 * frequency("C"); // => null
 * ```
 */
export function frequency(
  input: string | Pitch,
  tuning?: string | Tuning
): number | null {
  const p = note(input);
  const height = semitoneHeight(p);
  if (height === null) return null;
  const t = resolveTuning(tuning);
  const totalCents = (p.cents ?? 0) + t.offset(p);
  return t.a4 * Math.pow(2, (height - 69 + totalCents / 100) / 12);
}

export interface PitchBendOptions {
  /** Pitch-bend range in semitones per direction (default ±2). */
  readonly range?: number;
}

/**
 * 14-bit MIDI pitch-bend value (0–16383, center 8192) that realizes a note's
 * total deviation — its own `cents` plus the tuning's spelled-pitch offset —
 * within the given bend range (default ±2 semitones): `pitchBend("A4")` is
 * 8192, `pitchBend("E4", "just")` is 8272. Values beyond the range clamp.
 *
 * @example
 * ```ts
 * import { pitchBend, addCents } from "musictheoryjs";
 *
 * pitchBend("A4"); // => 8192
 * pitchBend("E4", "just"); // => 8272
 * pitchBend(addCents("C4", 50)); // => 10240
 * pitchBend(addCents("C4", 50), undefined, { range: 1 }); // => 12288
 * ```
 */
export function pitchBend(
  input: string | Pitch,
  tuning?: string | Tuning,
  options?: PitchBendOptions
): number {
  const p = note(input);
  const range = options?.range ?? 2;
  if (!Number.isFinite(range) || range <= 0) {
    throw new MusicTheoryError(
      `Invalid pitch-bend range ${range}: must be a positive number of semitones.`
    );
  }
  const t = resolveTuning(tuning);
  const totalCents = (p.cents ?? 0) + t.offset(p);
  const value = Math.round(8192 + (totalCents / (range * 100)) * 8192);
  return Math.max(0, Math.min(16383, value));
}
