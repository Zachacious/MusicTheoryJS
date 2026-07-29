/**
 * @module tuning
 * Tuning systems on spelled pitches: temperaments that distinguish G# from
 * Ab, a registry that `frequency()` and `pitchBend()` actually consult, and
 * a stored, configurable reference pitch.
 */

export {
  type JustTuningOptions,
  type MeantoneOptions,
  type Tuning,
  type TuningOptions,
  PURE_FIFTH_CENTS,
  SYNTONIC_COMMA_CENTS,
  edoTuning,
  equalTemperament,
  fifthsIndex,
  isTuning,
  justTuning,
  meantoneTuning,
  pythagoreanTuning,
} from "./tuning";
export {
  type PitchBendOptions,
  frequency,
  getTuning,
  pitchBend,
  registerTuning,
  resolveTuning,
  tuningNames,
  tuningOffset,
} from "./registry";
