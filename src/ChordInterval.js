/*
ChordInterval.js
*/

import { clampNumber } from './util';

/**
 * Chord intervals contain an integer representing a scale degree and a modifier-- #, ##, b, bb, or Natural
 * <br> 'ChordInterval' can be a lot to type so use an alias like:
 * <br> const CI = MT.ChordInterval.create;
 *
 * @memberof module:MT
 * @example
 * const mod = MT.Note.modifier;
 * const CI = MT.ChordInterval.create;
 *
 * const sharpRoot = CI(1, mod.SHARP);
 */
class ChordInterval {
  /**
   *Creates an instance of ChordInterval.
   *
   * @param {number} [pInterval=0] Scale degree
   * @param {number} [pModifier=0] modifier
   * @memberof ChordInterval
   */
  constructor(pInterval = 0/* 0 scale degree - root note */, pModifier = 0/* Natural */) {
    this.interval = pInterval;
    this.modifier = clampNumber(pModifier, -2, 2);
  }

  /**
   * An alias for the constructor
   *
   * @static
   * @param {number} [pInterval=0] Scale degree
   * @param {number} [pModifier=0] modifier
   * @returns {ChordInterval}
   */
  static create(pInterval = 0, pModifier = 0) {
    return new ChordInterval(pInterval, pModifier);
  }
}

export default ChordInterval;
