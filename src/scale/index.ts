/**
 * Main entry point for scales module
 */

// Export types
export * from "./types";

// Export creation functions
export {
  createScale,
  createScaleByName,
  createScaleFromNotes,
  createChromaticScale,
  createCustomScale,
  createScaleFromString,
  createScaleFromSteps,
} from "./creation";

// Export operations
export {
  transposeScale,
  getDegree,
  isNoteInScale,
  findClosestScaleNote,
  mergeScales,
  getScaleSegment,
  getScaleDegree,
  filterScaleDegrees,
  getMode,
  invertScale,
} from "./operations";

// Export detection functions
export { detectScales, detectKey, type ScaleMatch } from "./detection";

// Export mode functions
export {
  createModalScale,
  createModeFromMajor,
  getAllMajorModes,
} from "./modes";

// Export analysis functions
export {
  getScaleFunction,
  analyzeScaleIntervals,
  analyzeScaleBrightness,
  analyzeScaleStructure,
  compareScales,
  findRelatedScales,
  analyzePossibleCadences,
  analyzeScaleTension,
  type ScaleFunctionRole,
  type ScaleIntervalAnalysis,
  type ScaleBrightness,
  type ScaleStructureAnalysis,
  type ScaleRelationship,
  type RelatedScales,
  type CadenceType,
  type ScaleTensionProfile,
} from "./analysis";

// Export constants (but not all of them)
export { SCALE_PATTERNS, MODE_NAMES } from "./constants";
