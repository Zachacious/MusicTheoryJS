/**
 * @module core/errors
 * Error type thrown by all core functions on invalid input.
 * Soft-failure variants (`tryNote`, `tryInterval`) return `null` instead.
 */

/**
 * The error class used for every hard failure in the library.
 *
 * @example
 * ```ts
 * import { MusicTheoryError, note } from "musictheoryjs";
 *
 * note("H2"); // => throws "Invalid note"
 * try {
 *   note("H2");
 * } catch (e) {
 *   e instanceof MusicTheoryError; // => true
 *   e.name; // => "MusicTheoryError"
 * }
 * ```
 */
export class MusicTheoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MusicTheoryError";
  }
}
