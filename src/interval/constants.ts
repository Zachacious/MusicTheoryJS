/**
 * Named constants for the common diatonic intervals within an octave.
 * Tree-shakable: importing one interval does not pull in the rest.
 */

import { type Interval, interval } from "./interval";

export const PERFECT_UNISON: Interval = interval(1, "P");
export const MINOR_SECOND: Interval = interval(2, "m");
export const MAJOR_SECOND: Interval = interval(2, "M");
export const MINOR_THIRD: Interval = interval(3, "m");
export const MAJOR_THIRD: Interval = interval(3, "M");
export const PERFECT_FOURTH: Interval = interval(4, "P");
export const AUGMENTED_FOURTH: Interval = interval(4, "A");
export const DIMINISHED_FIFTH: Interval = interval(5, "d");
export const PERFECT_FIFTH: Interval = interval(5, "P");
export const MINOR_SIXTH: Interval = interval(6, "m");
export const MAJOR_SIXTH: Interval = interval(6, "M");
export const MINOR_SEVENTH: Interval = interval(7, "m");
export const MAJOR_SEVENTH: Interval = interval(7, "M");
export const PERFECT_OCTAVE: Interval = interval(8, "P");
