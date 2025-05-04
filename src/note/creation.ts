import {
  A4_FREQUENCY,
  A4_MIDI,
  ACCIDENTAL_ADJUSTMENT,
  CENTS_PER_SEMITONE,
  MICROTONAL_CENTS_ADJUSTMENT,
  NOTE_LETTER_BASE_INDEX,
  SEMITONES_PER_OCTAVE,
  TUNING_SYSTEMS,
} from "./constants";
import {
  Accidental,
  EnharmonicPreference,
  MicrotonalModifier,
  MicrotonalNote,
  Note,
  NoteLetter,
  PitchClassIndex,
  TuningSystem,
} from "./types";
import {
  calculateCentsDeviation,
  calculateMidi,
  formatNotation,
  noteToFrequency,
  pitchClassIndexToLetterAccidental,
  quarterToneIndexToLetterAccidental,
  transposeByCents,
} from "./calculations";

// Fix the circular dependency reference
import { C0_MIDI } from "./constants";

/**
 * Creates a note object with all required properties
 */
function createNoteObject(
  letter: NoteLetter,
  accidental: Accidental,
  octave: number,
  pitchClassIndex: PitchClassIndex,
  includeCachedValues = true,
  microtonalOptions?: {
    cents?: number;
    microtonalModifier?: MicrotonalModifier;
    tuningSystem?: TuningSystem;
  }
): Note {
  // Start with the base note properties
  let noteProperties: Record<string, any> = {
    letter,
    accidental,
    octave,
    pitchClassIndex,
  };

  // Add microtonal properties if provided
  if (microtonalOptions) {
    if (microtonalOptions.cents !== undefined) {
      noteProperties.cents = microtonalOptions.cents;
    }
    if (microtonalOptions.microtonalModifier) {
      noteProperties.microtonalModifier = microtonalOptions.microtonalModifier;
    }
    if (microtonalOptions.tuningSystem) {
      noteProperties.tuningSystem = microtonalOptions.tuningSystem;
    }
  }

  if (!includeCachedValues) {
    return Object.freeze(noteProperties) as Note;
  }

  // Calculate midi (for standard notes)
  noteProperties.midi = calculateMidi(pitchClassIndex, octave);

  // Format notation - use type-safe access to microtonalModifier
  const microtonalModifier =
    (noteProperties.microtonalModifier as MicrotonalModifier | undefined) || "";

  noteProperties.notation = formatNotation(
    letter,
    accidental,
    octave,
    microtonalModifier
  );

  // Calculate frequency
  let frequency: number | undefined;
  if (noteProperties.midi >= 0 && noteProperties.midi <= 127) {
    // Base frequency from equal temperament
    const equalTempFreq =
      A4_FREQUENCY *
      Math.pow(2, (noteProperties.midi - A4_MIDI) / SEMITONES_PER_OCTAVE);

    // Apply cents deviation if present
    if (noteProperties.cents !== undefined) {
      frequency =
        equalTempFreq *
        Math.pow(
          2,
          noteProperties.cents / (CENTS_PER_SEMITONE * SEMITONES_PER_OCTAVE)
        );
    }
    // Apply microtonal modifier adjustment if present - use type-safe access
    else if (
      noteProperties.microtonalModifier &&
      noteProperties.microtonalModifier !== ""
    ) {
      const modifier = noteProperties.microtonalModifier as MicrotonalModifier;
      const centsAdjustment = MICROTONAL_CENTS_ADJUSTMENT[modifier] ?? 0;
      frequency =
        equalTempFreq *
        Math.pow(
          2,
          centsAdjustment / (CENTS_PER_SEMITONE * SEMITONES_PER_OCTAVE)
        );
    }
    // Apply tuning system adjustments if specified - use type-safe access
    else if (noteProperties.tuningSystem) {
      const tuningSystem = noteProperties.tuningSystem as TuningSystem;
      if (tuningSystem !== "equalTemperament") {
        const tuning = TUNING_SYSTEMS[tuningSystem];
        if (tuning && tuning.centsAdjustment) {
          const centsAdjustment = tuning.centsAdjustment(pitchClassIndex);
          frequency =
            equalTempFreq *
            Math.pow(
              2,
              centsAdjustment / (CENTS_PER_SEMITONE * SEMITONES_PER_OCTAVE)
            );
        } else {
          frequency = equalTempFreq;
        }
      } else {
        frequency = equalTempFreq;
      }
    } else {
      frequency = equalTempFreq;
    }

    noteProperties.frequency = frequency;
  }

  return Object.freeze(noteProperties) as Note;
}

/**
 * Options for creating a note
 */
export interface CreateNoteOptions {
  /** The letter name (A-G) */
  letter?: NoteLetter;
  /** The accidental (default: natural) */
  accidental?: Accidental;
  /** The octave number (e.g., 4 for middle C) */
  octave?: number;
  /** The MIDI note number (0-127) */
  midi?: number;
  /** The pitch class index (0-11) */
  pitchClassIndex?: PitchClassIndex;
  /** Preferred spelling for enharmonics (default: sharp) */
  prefer?: EnharmonicPreference;
  /** Whether to include cached values for midi, notation, and frequency (default: true) */
  includeCachedValues?: boolean;
  /** Cents deviation from equal temperament */
  cents?: number;
  /** Microtonal modifier for quarter-tones and other microtonal notations */
  microtonalModifier?: MicrotonalModifier;
  /** Specify the tuning system to use */
  tuningSystem?: TuningSystem;
  /** Quarter-tone index (0-23) - alternative to pitchClassIndex for quarter-tone system */
  quarterToneIndex?: number;
  /** Exact frequency in Hz */
  frequency?: number;
}

/**
 * Universal note creation function that supports multiple input formats.
 */
export function createNote(options: CreateNoteOptions): Note {
  const prefer = options.prefer ?? "sharp";
  const includeCachedValues = options.includeCachedValues ?? true;

  // Extract microtonal options
  const microtonalOptions = {
    cents: options.cents,
    microtonalModifier: options.microtonalModifier,
    tuningSystem: options.tuningSystem,
  };

  // Priority 1: Frequency (most precise)
  if (options.frequency !== undefined) {
    return createNoteFromFrequency({
      frequency: options.frequency,
      prefer,
      includeCachedValues,
      ...microtonalOptions,
    });
  }

  // Priority 2: Letter, accidental, and octave
  if (options.letter !== undefined && options.octave !== undefined) {
    return createNoteFromParts({
      letter: options.letter,
      accidental: options.accidental ?? "",
      octave: options.octave,
      includeCachedValues,
      ...microtonalOptions,
    });
  }

  // Priority 3: Quarter-tone index
  if (options.quarterToneIndex !== undefined && options.octave !== undefined) {
    return createNoteFromQuarterToneIndex({
      quarterToneIndex: options.quarterToneIndex,
      octave: options.octave,
      includeCachedValues,
      ...microtonalOptions,
    });
  }

  // Priority 4: MIDI number
  if (options.midi !== undefined) {
    return createNoteFromMidi({
      midi: options.midi,
      prefer,
      includeCachedValues,
      ...microtonalOptions,
    });
  }

  // Priority 5: Pitch class index and octave
  if (options.pitchClassIndex !== undefined && options.octave !== undefined) {
    return createNoteFromIndex({
      pitchClassIndex: options.pitchClassIndex,
      octave: options.octave,
      prefer,
      includeCachedValues,
      ...microtonalOptions,
    });
  }

  throw new Error(
    "Invalid note creation parameters. Provide either (letter+octave), midi, (pitchClassIndex+octave), (quarterToneIndex+octave), or frequency."
  );
}

/**
 * Options for creating a note from parts
 */
export interface CreateNoteFromPartsOptions {
  /** The letter name (A-G) */
  letter: NoteLetter;
  /** The accidental (default: natural) */
  accidental?: Accidental;
  /** The octave number */
  octave: number;
  /** Whether to include cached values (default: true) */
  includeCachedValues?: boolean;
  /** Cents deviation from equal temperament */
  cents?: number;
  /** Microtonal modifier for quarter-tones and other microtonal notations */
  microtonalModifier?: MicrotonalModifier;
  /** Specify the tuning system to use */
  tuningSystem?: TuningSystem;
}

/**
 * Creates a Note object from its constituent parts (letter, accidental, octave).
 */
export function createNoteFromParts(options: CreateNoteFromPartsOptions): Note {
  const { letter, octave } = options;
  const accidental = options.accidental ?? "";
  const includeCachedValues = options.includeCachedValues ?? true;

  // Extract microtonal options
  const microtonalOptions = {
    cents: options.cents,
    microtonalModifier: options.microtonalModifier,
    tuningSystem: options.tuningSystem,
  };

  // Validation
  if (!NOTE_LETTER_BASE_INDEX.hasOwnProperty(letter)) {
    throw new Error(`Invalid note letter: ${letter}`);
  }
  const adjustment = ACCIDENTAL_ADJUSTMENT[accidental];
  if (adjustment === undefined) {
    throw new Error(`Invalid accidental: ${accidental}`);
  }
  if (!Number.isInteger(octave)) {
    throw new Error(`Octave must be an integer: ${octave}`);
  }

  const baseIndex = NOTE_LETTER_BASE_INDEX[letter];
  const pitchClassIndex = ((baseIndex + adjustment + SEMITONES_PER_OCTAVE) %
    SEMITONES_PER_OCTAVE) as PitchClassIndex;

  return createNoteObject(
    letter,
    accidental,
    octave,
    pitchClassIndex,
    includeCachedValues,
    microtonalOptions
  );
}

/**
 * Options for creating a note from MIDI
 */
export interface CreateNoteFromMidiOptions {
  /** The MIDI note number (0-127) */
  midi: number;
  /** How to spell enharmonics (default: sharp) */
  prefer?: EnharmonicPreference;
  /** Whether to include cached values (default: true) */
  includeCachedValues?: boolean;
  /** Cents deviation from equal temperament */
  cents?: number;
  /** Microtonal modifier for quarter-tones and other microtonal notations */
  microtonalModifier?: MicrotonalModifier;
  /** Specify the tuning system to use */
  tuningSystem?: TuningSystem;
}

/**
 * Creates a Note object from a MIDI number.
 */
export function createNoteFromMidi(options: CreateNoteFromMidiOptions): Note {
  const { midi } = options;
  const prefer = options.prefer ?? "sharp";
  const includeCachedValues = options.includeCachedValues ?? true;

  // Extract microtonal options
  const microtonalOptions = {
    cents: options.cents,
    microtonalModifier: options.microtonalModifier,
    tuningSystem: options.tuningSystem,
  };

  if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
    throw new Error(`Invalid MIDI number: ${midi}. Must be between 0 and 127.`);
  }

  const pitchClassIndex = (midi % SEMITONES_PER_OCTAVE) as PitchClassIndex;
  const octave = Math.floor((midi - C0_MIDI) / SEMITONES_PER_OCTAVE);
  const { letter, accidental } = pitchClassIndexToLetterAccidental(
    pitchClassIndex,
    prefer
  );

  return createNoteObject(
    letter,
    accidental,
    octave,
    pitchClassIndex,
    includeCachedValues,
    microtonalOptions
  );
}

/**
 * Options for creating a note from a pitch class index
 */
export interface CreateNoteFromIndexOptions {
  /** The pitch class index (0-11) */
  pitchClassIndex: PitchClassIndex;
  /** The octave number */
  octave: number;
  /** How to spell enharmonics (default: sharp) */
  prefer?: EnharmonicPreference;
  /** Whether to include cached values (default: true) */
  includeCachedValues?: boolean;
  /** Cents deviation from equal temperament */
  cents?: number;
  /** Microtonal modifier for quarter-tones and other microtonal notations */
  microtonalModifier?: MicrotonalModifier;
  /** Specify the tuning system to use */
  tuningSystem?: TuningSystem;
}

/**
 * Creates a Note object from its pitch class index (0-11) and octave.
 */
export function createNoteFromIndex(options: CreateNoteFromIndexOptions): Note {
  const { pitchClassIndex, octave } = options;
  const prefer = options.prefer ?? "sharp";
  const includeCachedValues = options.includeCachedValues ?? true;

  // Extract microtonal options
  const microtonalOptions = {
    cents: options.cents,
    microtonalModifier: options.microtonalModifier,
    tuningSystem: options.tuningSystem,
  };

  if (
    !Number.isInteger(pitchClassIndex) ||
    pitchClassIndex < 0 ||
    pitchClassIndex > 11
  ) {
    throw new Error(
      `Invalid pitchClassIndex: ${pitchClassIndex}. Must be between 0 and 11.`
    );
  }
  if (!Number.isInteger(octave)) {
    throw new Error(`Octave must be an integer: ${octave}`);
  }

  const { letter, accidental } = pitchClassIndexToLetterAccidental(
    pitchClassIndex,
    prefer
  );

  return createNoteObject(
    letter,
    accidental,
    octave,
    pitchClassIndex,
    includeCachedValues,
    microtonalOptions
  );
}

/**
 * Options for creating a note from a quarter-tone index
 */
export interface CreateNoteFromQuarterToneIndexOptions {
  /** Quarter-tone index (0-23) */
  quarterToneIndex: number;
  /** The octave number */
  octave: number;
  /** Whether to include cached values (default: true) */
  includeCachedValues?: boolean;
  /** Additional cents deviation (beyond quarter-tone) */
  cents?: number;
  /** Override default microtonal modifier */
  microtonalModifier?: MicrotonalModifier;
  /** Specify the tuning system to use */
  tuningSystem?: TuningSystem;
}

/**
 * Creates a Note object from a quarter-tone index (0-23) and octave.
 */
export function createNoteFromQuarterToneIndex(
  options: CreateNoteFromQuarterToneIndexOptions
): Note {
  const { quarterToneIndex, octave } = options;
  const includeCachedValues = options.includeCachedValues ?? true;

  if (!Number.isInteger(quarterToneIndex)) {
    throw new Error(
      `Quarter-tone index must be an integer: ${quarterToneIndex}`
    );
  }

  // Normalize to 0-23 range
  const normalizedIndex = ((quarterToneIndex % 24) + 24) % 24;

  // Get the standard pitch class (0-11) and remainder
  const pitchClassIndex = Math.floor(normalizedIndex / 2) as PitchClassIndex;
  const hasQuarterTone = normalizedIndex % 2 === 1;

  // Get standard letter and accidental
  const { letter, accidental, microtonalModifier } =
    quarterToneIndexToLetterAccidental(normalizedIndex);

  // Use provided microtonal modifier if given, otherwise use the calculated one
  const finalMicrotonalModifier =
    options.microtonalModifier || microtonalModifier;

  // Calculate standard cents for the quarter-tone (50 cents if it's a quarter tone)
  const quarterToneCents = hasQuarterTone ? 50 : 0;

  // Combine with any additional cents
  const totalCents = (options.cents || 0) + quarterToneCents;

  // Create microtonal options
  const microtonalOptions = {
    cents: totalCents === 0 ? undefined : totalCents,
    microtonalModifier: finalMicrotonalModifier,
    tuningSystem: options.tuningSystem || "quarterTone",
  };

  return createNoteObject(
    letter,
    accidental,
    octave,
    pitchClassIndex,
    includeCachedValues,
    microtonalOptions
  );
}

/**
 * Options for creating a note from a frequency
 */
export interface CreateNoteFromFrequencyOptions {
  /** Frequency in Hz */
  frequency: number;
  /** How to spell enharmonics (default: sharp) */
  prefer?: EnharmonicPreference;
  /** Whether to include cached values (default: true) */
  includeCachedValues?: boolean;
  /** Override calculated cents deviation */
  cents?: number;
  /** Microtonal modifier to use for display */
  microtonalModifier?: MicrotonalModifier;
  /** Specify the tuning system to use */
  tuningSystem?: TuningSystem;
}

/**
 * Creates a Note object from a frequency value in Hz.
 */
export function createNoteFromFrequency(
  options: CreateNoteFromFrequencyOptions
): Note {
  const { frequency } = options;
  const prefer = options.prefer ?? "sharp";
  const includeCachedValues = options.includeCachedValues ?? true;

  if (frequency <= 0) {
    throw new Error(`Invalid frequency: ${frequency}Hz. Must be positive.`);
  }

  // Calculate MIDI number (floating point)
  const midiFloat = 12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI;

  // Round to nearest MIDI note
  const nearestMidi = Math.round(midiFloat);

  // Calculate cents deviation
  const calculatedCents = calculateCentsDeviation(frequency);

  // Use provided cents if available, otherwise use calculated
  const cents = options.cents !== undefined ? options.cents : calculatedCents;

  // Create microtonal options
  const microtonalOptions = {
    cents: cents === 0 ? undefined : cents,
    microtonalModifier: options.microtonalModifier,
    tuningSystem: options.tuningSystem,
  };

  // Validate MIDI range
  if (nearestMidi < 0 || nearestMidi > 127) {
    throw new Error(
      `Frequency ${frequency}Hz converts to MIDI ${nearestMidi}, which is out of range (0-127).`
    );
  }

  // Create note from nearest MIDI with cents deviation
  const note = createNoteFromMidi({
    midi: nearestMidi,
    prefer,
    includeCachedValues: false, // We'll add our own frequency
    ...microtonalOptions,
  });

  // Add the exact frequency and return
  if (includeCachedValues) {
    return Object.freeze({
      ...note,
      frequency,
      notation: formatNotation(
        note.letter,
        note.accidental,
        note.octave,
        note.microtonalModifier
      ),
      midi: nearestMidi,
    });
  }

  return note;
}

/**
 * Create a note with a specific frequency ratio from a reference note
 */
export function createNoteByRatio(
  referenceNote: Note,
  ratio: number,
  options?: { prefer?: EnharmonicPreference }
): Note {
  const refFreq = noteToFrequency(referenceNote);
  const newFreq = refFreq * ratio;

  // Convert the ratio to cents
  // The formula for ratio to cents is: 1200 * log2(ratio)
  const cents = 1200 * Math.log2(ratio);

  // Use the cents value to transpose from the reference
  return transposeByCents(referenceNote, cents, options);
}
