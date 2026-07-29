/**
 * @module scale
 * Scales: creation by name, exactly spelled degrees, modes via chroma
 * rotation (one implementation), degree chords, brightness, and ranked
 * detection (re-exported from the dictionary engine).
 */

export {
  type Scale,
  isScale,
  mode,
  modes,
  scale,
  scaleBrightness,
  scaleChords,
  scaleNotes,
  tryScale,
} from "./scale";
export {
  type DetectScalesOptions,
  type ScaleDetection,
  detectScales,
  getScaleType,
} from "../dict";
