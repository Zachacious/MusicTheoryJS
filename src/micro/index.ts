/**
 * @module micro
 * Microtonality on the core: cents arithmetic and normalization, frequency
 * ratios, full-precision just intonation, and n-EDO transposition.
 */

export {
  type CentsOptions,
  CENTS_PER_OCTAVE,
  addCents,
  centsBetween,
  centsToRatio,
  microtonalName,
  parseRatio,
  ratioToCents,
} from "./cents";
export { JUST_RATIOS, fromRatio, justNote, justRatio } from "./ji";
export { edoScale, edoStepCents, edoTranspose } from "./edo";
