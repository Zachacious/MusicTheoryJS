/*
ChordInterval.js
*/

import { clampNumber } from './util';

class ChordInterval {
  constructor(pInterval = 0/* 0 scale degree - root note */, pModifier = 0/* Natural */) {
    this.interval = pInterval;
    this.modifier = clampNumber(pModifier, -2, 2);
  }

  static create(pInterval = 0, pModifier = 0) {
    return new ChordInterval(pInterval, pModifier);
  }
}

export default ChordInterval;
