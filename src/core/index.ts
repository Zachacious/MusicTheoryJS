/**
 * @module core
 * The core pitch/interval engine: spelled pitches, quality-carrying
 * intervals, and exact transposition/distance arithmetic. Zero dependencies;
 * every other module builds on this one.
 */

export { MusicTheoryError } from "./errors";
export {
  type Pitch,
  type Step,
  STEP_SEMITONES,
  chroma,
  freq,
  fromFreq,
  fromMidi,
  isPitch,
  midi,
  note,
  noteName,
  pitch,
  samePitch,
  sameSpelling,
  semitoneHeight,
  spellChroma,
  tryNote,
} from "./pitch";
export {
  type Interval,
  add,
  interval,
  intervalDirection,
  intervalName,
  intervalNumber,
  intervalQuality,
  invert,
  isInterval,
  simplify,
  subtract,
  tryInterval,
} from "./interval";
export { distance, transpose } from "./ops";
