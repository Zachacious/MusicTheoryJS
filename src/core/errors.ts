/**
 * @module core/errors
 * Error type thrown by all core functions on invalid input.
 * Soft-failure variants (`tryNote`, `tryInterval`) return `null` instead.
 */

export class MusicTheoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MusicTheoryError";
  }
}
