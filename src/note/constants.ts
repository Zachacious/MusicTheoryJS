import {
  Accidental,
  MicrotonalModifier,
  NoteLetter,
  PitchClassIndex,
  TuningSystem,
} from "./types";

// Core music theory constants
export const SEMITONES_PER_OCTAVE = 12;
export const CENTS_PER_SEMITONE = 100;
export const CENTS_PER_OCTAVE = SEMITONES_PER_OCTAVE * CENTS_PER_SEMITONE; // 1200 cents
export const MIDDLE_C_MIDI = 60;
export const MIDDLE_C_OCTAVE = 4;
export const C0_MIDI = MIDDLE_C_MIDI - MIDDLE_C_OCTAVE * SEMITONES_PER_OCTAVE;
export const A4_FREQUENCY = 440; // Standard tuning frequency in Hz
export const A4_MIDI = 69;

// Letter to base pitch class index mapping
export const NOTE_LETTER_BASE_INDEX: Readonly<
  Record<NoteLetter, PitchClassIndex>
> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// Accidental to semitone adjustment mapping
export const ACCIDENTAL_ADJUSTMENT: Readonly<Record<Accidental, number>> = {
  bb: -2,
  b: -1,
  "": 0,
  "#": 1,
  "##": 2,
  x: 2, // Treat 'x' as double sharp
};

// Microtonal modifier to cents adjustment mapping
export const MICROTONAL_CENTS_ADJUSTMENT: Readonly<
  Record<MicrotonalModifier, number>
> = {
  "": 0,
  "+": 50, // quarter sharp
  "-": -50, // quarter flat
  "++": 150, // three-quarter sharp
  "--": -150, // three-quarter flat
  "↑": 25, // slight raise (can be customized)
  "↓": -25, // slight lower (can be customized)
};

// Default pitch class to note spelling mappings
export const SHARP_NAMES: ReadonlyArray<string> = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export const FLAT_NAMES: ReadonlyArray<string> = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

// Quarter-tone spelling with mixed sharps and flats
export const QUARTER_TONE_NAMES: ReadonlyArray<string> = [
  "C",
  "C+",
  "C#",
  "C#+" /* or "D-" */,
  "D",
  "D+",
  "D#",
  "D#+" /* or "E-" */,
  "E",
  "E+",
  "F",
  "F+",
  "F#",
  "F#+",
  "G",
  "G+",
  "G#",
  "G#+",
  "A",
  "A+",
  "A#",
  "A#+",
  "B",
  "B+",
];

// Frequency ratios for just intonation (relative to the tonic)
export const JUST_INTONATION_RATIOS: Record<string, number> = {
  "1/1": 1, // Perfect unison
  "9/8": 9 / 8, // Major second
  "5/4": 5 / 4, // Major third
  "4/3": 4 / 3, // Perfect fourth
  "3/2": 3 / 2, // Perfect fifth
  "5/3": 5 / 3, // Major sixth
  "15/8": 15 / 8, // Major seventh
  "2/1": 2, // Octave
  "6/5": 6 / 5, // Minor third
  "8/5": 8 / 5, // Minor sixth
  "9/5": 9 / 5, // Minor seventh
  "16/9": 16 / 9, // Minor second
};

// Tuning system definitions
export const TUNING_SYSTEMS: Record<
  TuningSystem,
  {
    name: string;
    description: string;
    centsAdjustment?: (pitchClass: PitchClassIndex) => number; // Function to calculate cent adjustments
  }
> = {
  equalTemperament: {
    name: "12-tone Equal Temperament",
    description: "Standard tuning with 12 equal semitones per octave",
    centsAdjustment: () => 0, // No adjustment for standard equal temperament
  },
  pythagorean: {
    name: "Pythagorean Tuning",
    description: "Based on pure perfect fifths",
    centsAdjustment: (pitchClass) => {
      // Approximate Pythagorean tuning adjustments relative to 12-TET
      const adjustments = [0, 12, 4, 16, 8, 0, 12, 2, 14, 6, 18, 10];
      return adjustments[pitchClass];
    },
  },
  justIntonation: {
    name: "Just Intonation",
    description: "Uses pure frequency ratios",
    centsAdjustment: (pitchClass) => {
      // Approximate Just Intonation adjustments relative to 12-TET (C major)
      const adjustments = [0, -12, 4, -14, -2, 2, -10, 0, -12, 4, -16, -2];
      return adjustments[pitchClass];
    },
  },
  quarterTone: {
    name: "24-tone Equal Temperament",
    description: "Quarter-tone system with 24 equal divisions per octave",
    centsAdjustment: () => 0, // No built-in adjustment (handled by microtonalModifier)
  },
  custom: {
    name: "Custom Tuning",
    description: "User-defined tuning system",
  },
};

// Reverse lookup for pitch class index from letter and accidental
export const LETTER_ACCIDENTAL_TO_PITCH_CLASS: Record<string, PitchClassIndex> =
  {};

// Initialize the reverse lookup table
for (const [letter, baseIndex] of Object.entries(NOTE_LETTER_BASE_INDEX)) {
  for (const [accidental, adjustment] of Object.entries(
    ACCIDENTAL_ADJUSTMENT
  )) {
    const pitchClassIndex = ((baseIndex + adjustment + SEMITONES_PER_OCTAVE) %
      SEMITONES_PER_OCTAVE) as PitchClassIndex;
    LETTER_ACCIDENTAL_TO_PITCH_CLASS[`${letter}${accidental}`] =
      pitchClassIndex;
  }
}
