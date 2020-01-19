/*
ChordInterval.js
Author: Zach Moore
*/

import { clampNumber } from './util';

class ChordInterval {
  constructor(pInterval = 0/* 0 scale degree - root note */, pModifier = 1/* Natural */) {
    this.interval = pInterval;
    this.modifier = clampNumber(pModifier, 1, 5);
  }

  static create(pInterval = 0, pModifier = 1) {
    return new ChordInterval(pInterval, pModifier);
  }
}

export default ChordInterval;
