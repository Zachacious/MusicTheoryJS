/*
ChordInterval.js
Author: Zach Moore
*/

import { clampNumber } from './util';

function ChordInterval(pInterval = 0/* 0 scale degree - root note */, pModifier = 1/* Natural */) {
  this.interval = pInterval;
  this.modifier = clampNumber(pModifier, 1, 5);
}

export default ChordInterval;
