/**
 * The tuning registry: tunings addressable by name.
 *
 * Passing a {@link Tuning} object around is the direct route and stays
 * available everywhere. But an application that lets a user *choose* a tuning
 * — a settings menu, a preset dropdown, a saved project file — needs to store
 * that choice as a string and resolve it later. That is what this is for:
 * register once at startup, then refer to the tuning by name.
 *
 * The built-ins are registered eagerly, so `getTuning("24-EDO")` works without
 * setup. This mirrors the chord and scale dictionaries: `register*`,
 * `remove*`, `reset*`, and a version counter for anything caching downstream.
 */

import {
  justIntonation,
  pythagorean,
  quarterCommaMeantone,
} from "./historical";
import {
  MAQAM_NAMES,
  RAGA_NAMES,
  maqamTuning,
  pelog,
  ragaTuning,
  slendro,
} from "./presets";
import { type Tuning, equalTemperament, isTuning } from "./tuning";

/** One registry entry: the name as written, plus the tuning itself. */
interface Entry {
  /** The name exactly as registered — what a picker should display. */
  readonly display: string;
  readonly tuning: Tuning;
}

/** Normalized name → entry. Lookup ignores case; display keeps it. */
const registry = new Map<string, Entry>();

let registryVersion = 0;

/**
 * The built-ins are seeded on first use rather than at module load. This
 * module and `./tuning` import each other, and doing work during evaluation
 * would depend on which one the bundler happens to start with.
 */
let seeded = false;

function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;
  registerBuiltins();
}

/**
 * Tuning names come from users and config files, so matching ignores case and
 * surrounding space. "24-edo" and "24-EDO" are the same tuning.
 */
function normalize(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * The current tuning-registry revision; changes whenever a tuning is
 * registered, removed, or the registry is reset. Cache anything derived from
 * the registry against this and rebuild when it moves.
 *
 * @example
 * ```ts
 * import { tuningRegistryVersion, registerTuning, equalTemperament, resetTunings } from "musictheoryjs";
 * const before = tuningRegistryVersion();
 * registerTuning("version-demo", equalTemperament(19));
 * tuningRegistryVersion() === before; // => false
 * resetTunings();
 * ```
 */
export function tuningRegistryVersion(): number {
  return registryVersion;
}

/**
 * Register a tuning under a name, making it resolvable by
 * {@link getTuning} and anywhere a tuning name is accepted.
 *
 * @throws {TypeError} when the value is not a usable tuning.
 * @throws {Error} when the name is already taken — silently replacing a tuning
 *   would change what every note sounds like elsewhere in the program. Remove
 *   it first to replace it deliberately.
 *
 * @example
 * ```ts
 * import { registerTuning, getTuning, centsTuning, removeTuning } from "musictheoryjs";
 * const bohlenPierce = centsTuning([0, 146, 293, 439, 585, 732, 878, 1024, 1170], {
 *   name: "Bohlen-Pierce-ish",
 *   period: 1902,
 * });
 * registerTuning("bp", bohlenPierce);
 * getTuning("bp").period; // => 1902
 * removeTuning("bp"); // => true
 * ```
 */
export function registerTuning(name: string, tuning: Tuning): void {
  ensureSeeded();
  const key = normalize(name);
  if (key === "") {
    throw new TypeError("a tuning name cannot be empty");
  }
  if (!isTuning(tuning)) {
    throw new TypeError(
      `cannot register "${name}": expected a Tuning with name, size, period, and centsForDegree`
    );
  }
  if (registry.has(key)) {
    throw new Error(
      `tuning registry conflict: "${name}" is already registered; remove it first to replace it`
    );
  }
  registry.set(key, { display: name.trim(), tuning });
  registryVersion++;
}

/**
 * The tuning registered under a name.
 * @throws {RangeError} when nothing is registered under it, listing the
 *   closest known names so a typo is obvious.
 *
 * @example
 * ```ts
 * import { getTuning } from "musictheoryjs";
 * getTuning("12-TET").size; // => 12
 * getTuning("24-EDO").size; // => 24
 * getTuning("rast").size; // => 7
 * getTuning("nope"); // => throws "unknown tuning"
 * ```
 */
export function getTuning(name: string): Tuning {
  ensureSeeded();
  const found = registry.get(normalize(name));
  if (!found) {
    // A near-miss list turns a typo into a one-line fix rather than a hunt.
    const near = suggest(normalize(name));
    const hint = near.length > 0 ? `; did you mean ${near.join(", ")}?` : "";
    throw new RangeError(`unknown tuning: "${name}"${hint}`);
  }
  return found.tuning;
}

/**
 * The tuning registered under a name, or `null` when there is none — the
 * non-throwing counterpart of {@link getTuning}.
 *
 * @example
 * ```ts
 * import { tryGetTuning } from "musictheoryjs";
 * tryGetTuning("12-TET")?.size; // => 12
 * tryGetTuning("nope"); // => null
 * ```
 */
export function tryGetTuning(name: string): Tuning | null {
  ensureSeeded();
  return registry.get(normalize(name))?.tuning ?? null;
}

/**
 * True when a tuning is registered under the name.
 *
 * @example
 * ```ts
 * import { hasTuning } from "musictheoryjs";
 * hasTuning("Pythagorean"); // => true
 * hasTuning("pythagorean"); // => true
 * hasTuning("nope"); // => false
 * ```
 */
export function hasTuning(name: string): boolean {
  ensureSeeded();
  return registry.has(normalize(name));
}

/**
 * Every registered tuning name, in registration order — built-ins first, then
 * anything added since. Suitable for populating a picker.
 *
 * @example
 * ```ts
 * import { tuningNames } from "musictheoryjs";
 * tuningNames().includes("12-TET"); // => true
 * tuningNames().includes("Slendro"); // => true
 * tuningNames().length > 20; // => true
 * ```
 */
export function tuningNames(): string[] {
  ensureSeeded();
  return [...registry.values()].map((entry) => entry.display);
}

/**
 * Remove a registered tuning. Returns whether anything was removed.
 *
 * @example
 * ```ts
 * import { registerTuning, removeTuning, equalTemperament } from "musictheoryjs";
 * registerTuning("scratch-tuning", equalTemperament(31));
 * removeTuning("scratch-tuning"); // => true
 * removeTuning("scratch-tuning"); // => false
 * ```
 */
export function removeTuning(name: string): boolean {
  ensureSeeded();
  const removed = registry.delete(normalize(name));
  if (removed) registryVersion++;
  return removed;
}

/**
 * Drop every runtime registration and restore the built-ins. Useful between
 * tests, or when a host application reloads its own tunings.
 *
 * @example
 * ```ts
 * import { registerTuning, resetTunings, hasTuning, equalTemperament } from "musictheoryjs";
 * registerTuning("temporary", equalTemperament(53));
 * resetTunings();
 * hasTuning("temporary"); // => false
 * hasTuning("12-TET"); // => true
 * ```
 */
export function resetTunings(): void {
  registry.clear();
  seeded = true;
  registerBuiltins();
  registryVersion++;
}

/** Names within one edit of the query, for the "did you mean" hint. */
function suggest(query: string): string[] {
  return [...registry.entries()]
    .filter(([key]) => key.includes(query) || query.includes(key))
    .map(([, entry]) => entry.display)
    .slice(0, 3);
}

/**
 * Anything a tuning-taking function accepts: a {@link Tuning} or the name of a
 * registered one.
 */
export type TuningLike = Tuning | string;

/**
 * Resolve a {@link TuningLike} to a tuning. Objects pass through untouched, so
 * this costs nothing on the direct path.
 *
 * @example
 * ```ts
 * import { asTuning, equalTemperament } from "musictheoryjs";
 * asTuning("24-EDO").size; // => 24
 * asTuning(equalTemperament(19)).size; // => 19
 * ```
 */
export function asTuning(tuning: TuningLike): Tuning {
  return typeof tuning === "string" ? getTuning(tuning) : tuning;
}

/** Seed the registry with everything that ships. */
function registerBuiltins(): void {
  const builtins: Array<readonly [string, Tuning]> = [
    ["12-TET", equalTemperament(12)],
    ["Pythagorean", pythagorean()],
    ["Meantone", quarterCommaMeantone()],
    ["Just", justIntonation()],
    ["Slendro", slendro()],
    ["Pelog", pelog()],
  ];
  // The equal temperaments people actually reach for.
  for (const n of [5, 7, 12, 15, 17, 19, 22, 24, 31, 41, 53]) {
    builtins.push([`${n}-EDO`, equalTemperament(n)]);
  }
  for (const name of MAQAM_NAMES) builtins.push([name, maqamTuning(name)]);
  for (const name of RAGA_NAMES) builtins.push([name, ragaTuning(name)]);

  for (const [name, tuning] of builtins) {
    registry.set(normalize(name), { display: name, tuning });
  }
}
