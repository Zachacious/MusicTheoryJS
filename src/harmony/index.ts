/**
 * @module harmony
 * Advanced harmony: Krumhansl–Schmuckler key detection, a voice-leading
 * engine that never emits parallel fifths in default mode, Neo-Riemannian
 * and negative-harmony transformations, cadence/borrowed/modulation
 * analysis, and avoid-note-aware chord-scale matching.
 */

export {
  type DetectKeysOptions,
  type KeyDetection,
  type KeyDetectionInput,
  type WeightedNote,
  detectKeys,
} from "./key-detection";
export {
  type ParallelMotion,
  type VoiceLeadingOptions,
  type Voicing,
  findParallels,
  nextVoicing,
  voiceChord,
  voiceLeadingCost,
  voiceProgression,
} from "./voice-leading";
export {
  chromaticMediants,
  leadingToneExchange,
  negativeChord,
  negativeNote,
  neoRiemannian,
  parallel,
  relative,
} from "./transform";
export {
  type Cadence,
  type CadenceType,
  type DetectModulationsOptions,
  type ModulationSegment,
  analyzeCadences,
  borrowedFrom,
  detectCadence,
  detectModulations,
} from "./analysis";
export { type ChordScaleMatch, type ChordScalesOptions, chordScales } from "./chord-scales";
