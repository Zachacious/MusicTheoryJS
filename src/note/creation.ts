/**
 * @module Note/Creation
 * @description
 * This module provides flexible functions for creating Note objects. It supports instantiation
 * from various inputs like note parts (letter, accidental, octave), MIDI numbers, pitch class index,
 * quarter-tone index, frequency, or relative frequency ratios. It also handles optional microtonal
 * information (cents offset, modifiers, tuning systems) and can include calculated/cached values
 * for MIDI, notation string, and frequency directly on the returned object for convenience.
 *
 * The main entry point is the universal `createNote` function, which dispatches to more
 * specific creation functions based on the provided options.
 */

import {
  A4_FREQUENCY,
  A4_MIDI,
  ACCIDENTAL_ADJUSTMENT,
  C0_MIDI,
  CENTS_PER_OCTAVE,
  CENTS_PER_SEMITONE,
  MICROTONAL_CENTS_ADJUSTMENT,
  NOTE_LETTER_BASE_INDEX,
  SEMITONES_PER_OCTAVE,
} from "./constants";
import {
  Accidental,
  EnharmonicPreference,
  MicrotonalModifier,
  Note,
  NoteLetter,
  PitchClassIndex,
  TuningSystem,
} from "./types";
import {
  calculateMidi,
  formatNotation,
  noteToFrequency,
  pitchClassIndexToLetterAccidental,
  quarterToneIndexToLetterAccidental,
  transposeByCents,
} from "./calculations";

/**
 * @internal
 * An internal factory function to assemble a Note object immutably with its core properties
 * and optionally include calculated/cached values.
 */
export function createNoteObject(
  letter: NoteLetter,
  accidental: Accidental,
  octave: number,
  pitchClassIndex: PitchClassIndex,
  includeCachedValues = true,
  microtonalOptions?: {
    cents?: number;
    microtonalModifier?: MicrotonalModifier;
    tuningSystem?: TuningSystem;
  },
  /** If provided, uses this frequency for the cached value instead of calculating it. */
  overrideFrequency?: number
): Note {
  // --- Prepare Core and Microtonal Properties ---
  const coreProperties = {
    letter,
    accidental,
    octave,
    pitchClassIndex,
    ...(microtonalOptions?.cents !== undefined && {
      cents: microtonalOptions.cents,
    }),
    ...(microtonalOptions?.microtonalModifier && {
      microtonalModifier: microtonalOptions.microtonalModifier,
    }),
    ...(microtonalOptions?.tuningSystem && {
      tuningSystem: microtonalOptions.tuningSystem,
    }),
  };

  // --- Prepare Cached Properties (if requested) ---
  let cachedProperties = {};
  if (includeCachedValues) {
    const midi = calculateMidi(pitchClassIndex, octave);
    const notation = formatNotation(
      letter,
      accidental,
      octave,
      coreProperties.microtonalModifier || "" // Use modifier from coreProperties
    );

    let frequency: number | undefined;
    if (overrideFrequency !== undefined) {
      // Use override if provided (typically from createNoteFromFrequency)
      frequency = overrideFrequency;
    } else {
      // Calculate frequency using the standard function
      try {
        // Pass a plain object conforming to Note structure for calculation
        frequency = noteToFrequency(coreProperties as Note);
      } catch (error) {
        console.error(
          "Error calculating frequency during note creation:",
          error
        );
        frequency = undefined;
      }
    }

    cachedProperties = {
      midi,
      notation,
      ...(frequency !== undefined && { frequency }), // Only add frequency if defined
    };
  }

  // --- Combine and Freeze ---
  // Create the final object by merging core and cached properties
  const finalNote = {
    ...coreProperties,
    ...cachedProperties,
  };

  // Freeze the final object and cast to Note
  return Object.freeze(finalNote) as Note;
}

/**
 * Defines the possible options for the universal `createNote` function.
 * Only one primary definition method (e.g., parts, midi, frequency) should be used per call.
 */
export interface CreateNoteOptions {
  /** The diatonic letter name (A-G). Required if creating from parts. */
  letter?: NoteLetter;
  /** The accidental symbol ('', '#', 'b', '##', 'x', 'bb'). Defaults to natural ('') if omitted when using `letter`. */
  accidental?: Accidental;
  /** The scientific octave number. Required if creating from parts, index, or quarterToneIndex. */
  octave?: number;
  /** The MIDI note number (0-127). Alternative creation method. */
  midi?: number;
  /** The pitch class index (0-11). Alternative creation method, requires `octave`. */
  pitchClassIndex?: PitchClassIndex;
  /** The quarter-tone index (0-23). Alternative creation method for 24-TET, requires `octave`. */
  quarterToneIndex?: number;
  /** The exact frequency in Hz. Alternative creation method (highest priority). */
  frequency?: number;
  /** Specifies the preferred spelling ('sharp' or 'flat') for enharmonically ambiguous notes when creating from MIDI, index, quarterToneIndex, or frequency. Defaults to 'sharp'. */
  prefer?: EnharmonicPreference;
  /** If true (default), calculates and attaches `midi`, `notation`, and `frequency` properties to the returned object for convenience. If false, returns only the core `Note` properties. */
  includeCachedValues?: boolean;
  /** Explicit cents deviation from the base 12-TET pitch. Overrides microtonalModifier adjustments if both are present. */
  cents?: number;
  /** Microtonal modifier symbol (e.g., '+', '-') to apply. Used if `cents` is not provided. */
  microtonalModifier?: MicrotonalModifier;
  /** Specifies the intended tuning system (e.g., 'justIntonation'). May affect frequency calculation if `cents` or `microtonalModifier` aren't set. */
  tuningSystem?: TuningSystem;
}

/**
 * Universal note creation function that acts as a flexible dispatcher based on the provided options.
 * It determines the creation method based on a priority order:
 * 1. `frequency`
 * 2. `letter` + `octave` (and optional `accidental`)
 * 3. `quarterToneIndex` + `octave`
 * 4. `midi`
 * 5. `pitchClassIndex` + `octave`
 *
 * It delegates to the appropriate specific `createNoteFrom...` function.
 * Microtonal options (`cents`, `microtonalModifier`, `tuningSystem`) can be combined with any primary method.
 *
 * @param options - An object containing parameters to define the note. See {@link CreateNoteOptions}.
 * @returns A Note object representing the specified pitch. May include cached properties based on `includeCachedValues`.
 * @throws {Error} If insufficient or ambiguous options are provided.
 * @example
 * ```ts
 * // From parts
 * const cSharp4 = createNote({ letter: 'C', accidental: '#', octave: 4 });
 *
 * // From MIDI
 * const a4 = createNote({ midi: 69 });
 *
 * // From frequency (highest priority)
 * const noteFromFreq = createNote({ frequency: 440 }); // Creates A4
 *
 * // Microtonal using parts + cents
 * const c4plus20 = createNote({ letter: 'C', octave: 4, cents: 20 });
 *
 * // Microtonal using MIDI + modifier
 * const dSharpQuarterFlat = createNote({ midi: 63, microtonalModifier: '-', prefer: 'sharp' }); // D#4 - 50 cents
 *
 * // From Quarter Tone Index
 * const fQuarterSharp5 = createNote({ quarterToneIndex: 11, octave: 5 }); // 11 maps to F+
 * ```
 */
export function createNote(options: CreateNoteOptions): Note {
  const prefer = options.prefer ?? "sharp";
  // Default to true for including cached values unless explicitly set to false
  const includeCachedValues = options.includeCachedValues !== false;

  // Extract microtonal options to pass them down consistently
  const microtonalOptions = {
    cents: options.cents,
    microtonalModifier: options.microtonalModifier,
    tuningSystem: options.tuningSystem,
  };

  // Priority 1: Frequency (most precise)
  if (options.frequency !== undefined) {
    // Pass down other relevant options
    return createNoteFromFrequency({
      frequency: options.frequency,
      prefer,
      includeCachedValues,
      // Explicitly pass only microtonal options relevant here
      cents: microtonalOptions.cents, // Allows overriding calculated cents
      microtonalModifier: microtonalOptions.microtonalModifier,
      tuningSystem: microtonalOptions.tuningSystem,
    });
  }

  // Priority 2: Letter, accidental, and octave (most common manual creation)
  if (options.letter !== undefined && options.octave !== undefined) {
    return createNoteFromParts({
      letter: options.letter,
      accidental: options.accidental ?? "", // Default to natural if missing
      octave: options.octave,
      includeCachedValues,
      ...microtonalOptions, // Pass all microtonal options
    });
  }

  // Priority 3: Quarter-tone index + octave (for 24-TET)
  if (options.quarterToneIndex !== undefined && options.octave !== undefined) {
    return createNoteFromQuarterToneIndex({
      quarterToneIndex: options.quarterToneIndex,
      octave: options.octave,
      includeCachedValues,
      // Pass relevant microtonal options (cents override, modifier override, tuning)
      cents: microtonalOptions.cents,
      microtonalModifier: microtonalOptions.microtonalModifier,
      tuningSystem: microtonalOptions.tuningSystem,
    });
  }

  // Priority 4: MIDI number
  if (options.midi !== undefined) {
    return createNoteFromMidi({
      midi: options.midi,
      prefer,
      includeCachedValues,
      ...microtonalOptions, // Pass all microtonal options
    });
  }

  // Priority 5: Pitch class index and octave
  if (options.pitchClassIndex !== undefined && options.octave !== undefined) {
    return createNoteFromIndex({
      pitchClassIndex: options.pitchClassIndex,
      octave: options.octave,
      prefer,
      includeCachedValues,
      ...microtonalOptions, // Pass all microtonal options
    });
  }

  // If none of the valid combinations are met, throw an error
  throw new Error(
    "Invalid note creation parameters. Provide at least one of: (frequency), (letter+octave), (quarterToneIndex+octave), (midi), or (pitchClassIndex+octave)."
  );
}

/** Options for creating a note from its parts (letter, accidental, octave). */
export interface CreateNoteFromPartsOptions {
  /** The diatonic letter name (A-G). */
  letter: NoteLetter;
  /** The accidental symbol ('', '#', 'b', '##', 'x', 'bb'). Defaults to natural ('') if omitted. */
  accidental?: Accidental;
  /** The scientific octave number. */
  octave: number;
  /** If true (default), includes cached `midi`, `notation`, `frequency`. */
  includeCachedValues?: boolean;
  /** Optional cents deviation from the standard pitch defined by parts. */
  cents?: number;
  /** Optional microtonal modifier symbol. */
  microtonalModifier?: MicrotonalModifier;
  /** Optional tuning system specification. */
  tuningSystem?: TuningSystem;
}

/**
 * Creates a Note object from its constituent parts: letter name, accidental, and octave number.
 * This is often the most direct way to create standard musical notes.
 *
 * @param options - An object containing the note parts and optional microtonal/cache settings. See {@link CreateNoteFromPartsOptions}.
 * @returns The created Note object.
 * @throws {Error} If the letter, accidental, or octave is invalid.
 * @example
 * ```ts
 * const c4 = createNoteFromParts({ letter: 'C', octave: 4 });
 * const eb5 = createNoteFromParts({ letter: 'E', accidental: 'b', octave: 5 });
 * const fSharp3_plus10c = createNoteFromParts({ letter: 'F', accidental: '#', octave: 3, cents: 10 });
 * ```
 */
export function createNoteFromParts(options: CreateNoteFromPartsOptions): Note {
  const { letter, octave } = options;
  // Default accidental to natural ('') if nullish (null or undefined)
  const accidental = options.accidental ?? "";
  // Default to true for including cached values unless explicitly set to false
  const includeCachedValues = options.includeCachedValues !== false;

  // Extract microtonal options to pass to the internal object creator
  const microtonalOptions = {
    cents: options.cents,
    microtonalModifier: options.microtonalModifier,
    tuningSystem: options.tuningSystem,
  };

  // --- Input Validation ---
  if (!NOTE_LETTER_BASE_INDEX.hasOwnProperty(letter)) {
    throw new Error(`Invalid note letter provided: ${letter}`);
  }
  const adjustment = ACCIDENTAL_ADJUSTMENT[accidental];
  if (adjustment === undefined) {
    // Check if it's an empty string (natural), which is valid but adjustment is 0
    if (accidental !== "") {
      throw new Error(`Invalid accidental provided: ${accidental}`);
    }
  }
  if (!Number.isInteger(octave)) {
    // Basic integer check. Consider adding octave range validation if desired (e.g., -1 to 9).
    throw new Error(`Octave must be an integer: ${octave}`);
  }
  // --- End Validation ---

  // Calculate the base pitch class index (0-11)
  const baseIndex = NOTE_LETTER_BASE_INDEX[letter];
  // Use validated adjustment, defaulting to 0 for natural ('')
  const validAdjustment = adjustment ?? 0;
  // Calculate final pitch class, ensuring positive result before modulo
  const pitchClassIndex = ((baseIndex +
    validAdjustment +
    SEMITONES_PER_OCTAVE) %
    SEMITONES_PER_OCTAVE) as PitchClassIndex;

  // Delegate to the internal object creator
  return createNoteObject(
    letter,
    accidental,
    octave,
    pitchClassIndex,
    includeCachedValues,
    microtonalOptions
  );
}

/** Options for creating a note from a MIDI number. */
export interface CreateNoteFromMidiOptions {
  /** The MIDI note number (integer between 0 and 127). */
  midi: number;
  /** Preferred spelling ('sharp' or 'flat') for enharmonics. Defaults to 'sharp'. */
  prefer?: EnharmonicPreference;
  /** If true (default), includes cached `midi`, `notation`, `frequency`. */
  includeCachedValues?: boolean;
  /** Optional cents deviation from the standard 12-TET pitch of the MIDI note. */
  cents?: number;
  /** Optional microtonal modifier symbol. */
  microtonalModifier?: MicrotonalModifier;
  /** Optional tuning system specification. */
  tuningSystem?: TuningSystem;
}

/**
 * Creates a Note object from a standard MIDI note number (0-127).
 * Determines the letter, accidental, and octave based on the MIDI value.
 * Allows specifying enharmonic preference for ambiguous cases (like MIDI 61: C# or Db).
 *
 * @param options - An object containing the MIDI number and optional settings. See {@link CreateNoteFromMidiOptions}.
 * @returns The created Note object.
 * @throws {Error} If the MIDI number is outside the valid range (0-127).
 * @example
 * ```ts
 * const a4_sharp = createNoteFromMidi({ midi: 69 }); // Defaults to sharp preference -> A4
 * const a4_flat = createNoteFromMidi({ midi: 69, prefer: 'flat' }); // Still A4 (no enharmonic ambiguity)
 *
 * const cs4_sharp = createNoteFromMidi({ midi: 61 }); // Defaults to sharp -> C#4
 * const db4_flat = createNoteFromMidi({ midi: 61, prefer: 'flat' }); // -> Db4
 *
 * const midi60_plus30c = createNoteFromMidi({ midi: 60, cents: 30 }); // C4 + 30 cents
 * ```
 */
export function createNoteFromMidi(options: CreateNoteFromMidiOptions): Note {
  const { midi } = options;
  const prefer = options.prefer ?? "sharp";
  const includeCachedValues = options.includeCachedValues !== false;

  // Extract microtonal options
  const microtonalOptions = {
    cents: options.cents,
    microtonalModifier: options.microtonalModifier,
    tuningSystem: options.tuningSystem,
  };

  // --- Input Validation ---
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
    throw new Error(
      `Invalid MIDI number: ${midi}. Must be an integer between 0 and 127.`
    );
  }
  // --- End Validation ---

  // Calculate pitch class index (0-11)
  const pitchClassIndex = (midi % SEMITONES_PER_OCTAVE) as PitchClassIndex;
  // Calculate octave relative to C0 = MIDI 12 standard
  const octave = Math.floor((midi - C0_MIDI) / SEMITONES_PER_OCTAVE);

  // Determine the default spelling based on preference
  const { letter, accidental } = pitchClassIndexToLetterAccidental(
    pitchClassIndex,
    prefer
  );

  // Delegate to the internal object creator
  return createNoteObject(
    letter,
    accidental,
    octave,
    pitchClassIndex,
    includeCachedValues,
    microtonalOptions
  );
}

/** Options for creating a note from pitch class index and octave. */
export interface CreateNoteFromIndexOptions {
  /** The pitch class index (integer 0-11, where C=0). */
  pitchClassIndex: PitchClassIndex;
  /** The scientific octave number. */
  octave: number;
  /** Preferred spelling ('sharp' or 'flat') for enharmonics. Defaults to 'sharp'. */
  prefer?: EnharmonicPreference;
  /** If true (default), includes cached `midi`, `notation`, `frequency`. */
  includeCachedValues?: boolean;
  /** Optional cents deviation. */
  cents?: number;
  /** Optional microtonal modifier symbol. */
  microtonalModifier?: MicrotonalModifier;
  /** Optional tuning system specification. */
  tuningSystem?: TuningSystem;
}

/**
 * Creates a Note object from its pitch class index (0-11) and octave number.
 * Useful for algorithmic generation or when the pitch class is known numerically.
 * Determines the letter and accidental spelling based on the enharmonic preference.
 *
 * @param options - An object containing the index, octave, and optional settings. See {@link CreateNoteFromIndexOptions}.
 * @returns The created Note object.
 * @throws {Error} If the pitch class index or octave is invalid.
 * @example
 * ```ts
 * // C4 (index 0, octave 4)
 * const c4_idx = createNoteFromIndex({ pitchClassIndex: 0, octave: 4 });
 *
 * // Bb3 (index 10, octave 3, prefer flat)
 * const bb3_idx = createNoteFromIndex({ pitchClassIndex: 10, octave: 3, prefer: 'flat' });
 *
 * // G#5 + 15 cents (index 8, octave 5)
 * const gs5_plus15 = createNoteFromIndex({ pitchClassIndex: 8, octave: 5, cents: 15 });
 * ```
 */
export function createNoteFromIndex(options: CreateNoteFromIndexOptions): Note {
  const { pitchClassIndex, octave } = options;
  const prefer = options.prefer ?? "sharp";
  const includeCachedValues = options.includeCachedValues !== false;

  // Extract microtonal options
  const microtonalOptions = {
    cents: options.cents,
    microtonalModifier: options.microtonalModifier,
    tuningSystem: options.tuningSystem,
  };

  // --- Input Validation ---
  if (
    !Number.isInteger(pitchClassIndex) ||
    pitchClassIndex < 0 ||
    pitchClassIndex > 11
  ) {
    throw new Error(
      `Invalid pitchClassIndex: ${pitchClassIndex}. Must be an integer between 0 and 11.`
    );
  }
  if (!Number.isInteger(octave)) {
    throw new Error(`Octave must be an integer: ${octave}`);
  }
  // --- End Validation ---

  // Determine the default spelling based on preference
  const { letter, accidental } = pitchClassIndexToLetterAccidental(
    pitchClassIndex,
    prefer
  );

  // Delegate to the internal object creator
  return createNoteObject(
    letter,
    accidental,
    octave,
    pitchClassIndex,
    includeCachedValues,
    microtonalOptions
  );
}

/** Options for creating a note from a quarter-tone index (0-23). */
export interface CreateNoteFromQuarterToneIndexOptions {
  /** The quarter-tone index (integer 0-23) in a 24-TET system. */
  quarterToneIndex: number;
  /** The scientific octave number. */
  octave: number;
  /** If true (default), includes cached `midi`, `notation`, `frequency`. */
  includeCachedValues?: boolean;
  /** Optional explicit cents deviation. If provided, overrides the default +/- 50 cents for quarter-tones. */
  cents?: number;
  /** Optional microtonal modifier symbol. Overrides the symbol derived from the index (e.g., '+'). */
  microtonalModifier?: MicrotonalModifier;
  /** Optional tuning system specification. Defaults to 'quarterTone' if not provided. */
  tuningSystem?: TuningSystem;
}

/**
 * Creates a Note object from a quarter-tone index (0-23) and octave number,
 * representing pitches within a 24-tone equal temperament system.
 * Calculates the corresponding standard pitch class, letter/accidental spelling,
 * and applies a +50 or -50 cents offset (or uses explicit `cents` value if provided).
 *
 * @param options - An object containing the quarter-tone index, octave, and optional settings. See {@link CreateNoteFromQuarterToneIndexOptions}.
 * @returns The created Note object, typically including a `cents` or `microtonalModifier` property.
 * @throws {Error} If the quarter-tone index or octave is invalid.
 * @example
 * ```ts
 * // C4 quarter-sharp (index 1)
 * const cqs4 = createNoteFromQuarterToneIndex({ quarterToneIndex: 1, octave: 4 });
 * // -> Note with pitchClassIndex 0, modifier '+', cents ~50 (unless overridden)
 *
 * // F#4 quarter-flat (index 12 = F#, index 11 = F+) -> need index for F quarter-sharp = 11
 * // Let's try index 13 = F#+ = G quarter-flat
 * // Or index between F#(12) and G(14), which is 13. Should map to F#+ or G-?
 * // Using the defined QUARTER_TONE_NAMES[13] = "F#+"
 * const fqs4 = createNoteFromQuarterToneIndex({ quarterToneIndex: 13, octave: 4 });
 * // -> Note with letter F, acc #, modifier '+', pitchClassIndex 6, cents ~50
 *
 * // Create with explicit cents override (index 5 = D+)
 * const dqs4_explicit = createNoteFromQuarterToneIndex({ quarterToneIndex: 5, octave: 4, cents: 45 });
 * // -> Note with letter D, modifier '+', pitchClassIndex 2, cents 45
 * ```
 */
export function createNoteFromQuarterToneIndex(
  options: CreateNoteFromQuarterToneIndexOptions
): Note {
  const { quarterToneIndex, octave } = options;
  const includeCachedValues = options.includeCachedValues !== false;

  // --- Input Validation ---
  if (!Number.isInteger(quarterToneIndex)) {
    // Allow values outside 0-23, they will be normalized
    console.warn(
      // Use warn instead of error for out-of-range but integer index
      `Quarter-tone index ${quarterToneIndex} is not in standard 0-23 range; it will be normalized.`
    );
  }
  if (!Number.isInteger(octave)) {
    throw new Error(`Octave must be an integer: ${octave}`);
  }
  // --- End Validation ---

  // Normalize index to the 0-23 range
  const normalizedIndex = ((quarterToneIndex % 24) + 24) % 24;

  // Determine the base 12-TET pitch class index
  const pitchClassIndex = Math.floor(normalizedIndex / 2) as PitchClassIndex;
  // Is it an "in-between" quarter-tone step? (Odd indices)
  const isQuarterStep = normalizedIndex % 2 === 1;

  // Get the default spelling based on the quarter-tone name mapping
  const {
    letter,
    accidental,
    microtonalModifier: defaultModifier,
  } = quarterToneIndexToLetterAccidental(normalizedIndex);

  // Use provided microtonal modifier if given, otherwise use the one derived from the index
  const finalMicrotonalModifier = options.microtonalModifier ?? defaultModifier;

  // Calculate cents: Use explicit cents if provided, otherwise default to +50 if it's a quarter step
  let totalCents: number | undefined = options.cents;
  if (totalCents === undefined && isQuarterStep) {
    // Find the standard cents value for the derived or provided modifier
    const modifierCents =
      MICROTONAL_CENTS_ADJUSTMENT[finalMicrotonalModifier] ??
      (isQuarterStep ? 50 : 0);
    // Only apply default if modifier implies it (e.g. '+') and no explicit cents given
    if (Math.abs(modifierCents) === 50) {
      // Assuming +/- map to 50 cents
      totalCents = modifierCents;
    }
  }

  // If totalCents is exactly 0, treat as undefined unless explicitly set to 0
  if (totalCents === 0 && options.cents === undefined) {
    totalCents = undefined;
  }

  // Prepare microtonal options for the internal creator
  const microtonalOptions = {
    cents: totalCents,
    microtonalModifier: finalMicrotonalModifier,
    // Default tuning system to 'quarterTone' if creating via index, unless overridden
    tuningSystem: options.tuningSystem ?? "quarterTone",
  };

  // Delegate to the internal object creator
  return createNoteObject(
    letter,
    accidental,
    octave,
    pitchClassIndex,
    includeCachedValues,
    microtonalOptions
  );
}

/** Options for creating a note from a frequency. */
export interface CreateNoteFromFrequencyOptions {
  /** The frequency value in Hertz (Hz). Must be positive. */
  frequency: number;
  /** Preferred spelling ('sharp' or 'flat') for the determined note. Defaults to 'sharp'. */
  prefer?: EnharmonicPreference;
  /** If true (default), includes cached `midi`, `notation`, `frequency`. */
  includeCachedValues?: boolean;
  /** Optional explicit cents deviation. Overrides the automatically calculated deviation from 12-TET. */
  cents?: number;
  /** Optional microtonal modifier symbol to associate with the note for notation. */
  microtonalModifier?: MicrotonalModifier;
  /** Optional tuning system specification. */
  tuningSystem?: TuningSystem;
}

/**
 * Creates a Note object from a given frequency in Hertz (Hz).
 * Calculates the nearest standard 12-TET note and the cents deviation.
 * Allows overriding the calculated cents or specifying microtonal modifiers/tuning systems.
 * The original frequency is cached if `includeCachedValues` is true.
 *
 * @param options - An object containing the frequency and optional settings. See {@link CreateNoteFromFrequencyOptions}.
 * @returns The created Note object.
 * @throws {Error} If the frequency is non-positive or results in an out-of-range MIDI value.
 */
export function createNoteFromFrequency(
  options: CreateNoteFromFrequencyOptions
): Note {
  const { frequency } = options;
  const prefer = options.prefer ?? "sharp";
  const includeCachedValues = options.includeCachedValues !== false;

  // --- Input Validation ---
  if (typeof frequency !== "number" || frequency <= 0) {
    throw new Error(
      `Invalid frequency: ${frequency} Hz. Must be a positive number.`
    );
  }
  // --- End Validation ---

  // --- Calculations ---
  const midiFloat =
    SEMITONES_PER_OCTAVE * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI;
  const nearestMidi = Math.round(midiFloat);

  // --- MIDI Range Validation ---
  if (nearestMidi < 0 || nearestMidi > 127) {
    throw new Error(
      `Frequency ${frequency}Hz converts to MIDI ${midiFloat.toFixed(
        2
      )}, which rounds to ${nearestMidi}. This is out of the standard MIDI range (0-127).`
    );
  }
  // --- End Validation ---

  // --- Determine Core Properties ---
  const pitchClassIndex = (nearestMidi %
    SEMITONES_PER_OCTAVE) as PitchClassIndex;
  const octave = Math.floor((nearestMidi - C0_MIDI) / SEMITONES_PER_OCTAVE);
  const { letter, accidental } = pitchClassIndexToLetterAccidental(
    pitchClassIndex,
    prefer
  );

  // --- Determine Microtonal Options (especially cents) ---
  let finalCents: number | undefined = options.cents;
  if (finalCents === undefined) {
    const calculatedCents = (midiFloat - nearestMidi) * CENTS_PER_SEMITONE;
    const CENTS_THRESHOLD = 1e-6;
    if (Math.abs(calculatedCents) > CENTS_THRESHOLD) {
      finalCents = calculatedCents;
    }
  }
  const microtonalOptions = {
    cents: finalCents,
    microtonalModifier: options.microtonalModifier,
    tuningSystem: options.tuningSystem,
  };

  // --- Delegate to Immutable Factory ---
  // Pass the original frequency as override only if caching is enabled.
  const frequencyOverride = includeCachedValues ? frequency : undefined;

  return createNoteObject(
    letter,
    accidental,
    octave,
    pitchClassIndex,
    includeCachedValues,
    microtonalOptions,
    frequencyOverride // Pass original frequency for caching if needed
  );
}

/**
 * Creates a new Note that is related to a reference Note by a specific frequency ratio.
 * Useful for generating notes in Just Intonation or other ratio-based systems.
 * Calculates the target frequency and uses `transposeByCents` for precise transposition.
 *
 * @param referenceNote - The Note object to use as the starting point.
 * @param ratio - The frequency ratio to apply (e.g., 3/2 for a Perfect Fifth).
 * @param [options] - Optional parameters.
 * @param [options.prefer='sharp'] - Preferred enharmonic spelling for the resulting note.
 * @returns A new Note object representing the calculated pitch.
 * @throws {Error} If the ratio is non-positive.
 * @example
 * ```ts
 * const c4 = createNoteFromParts({ letter: 'C', octave: 4 });
 *
 * // Create a Just Perfect Fifth (3/2 ratio) above C4
 * const g4_just = createNoteByRatio(c4, 3/2);
 * // -> G4 with cents slightly sharper than equal temperament (~ +1.96 cents)
 *
 * // Create a Just Major Third (5/4 ratio) above C4
 * const e4_just = createNoteByRatio(c4, 5/4);
 * // -> E4 with cents slightly flatter than equal temperament (~ -13.69 cents)
 * ```
 */
export function createNoteByRatio(
  referenceNote: Note,
  ratio: number,
  options?: { prefer?: EnharmonicPreference }
): Note {
  // --- Input Validation ---
  if (typeof ratio !== "number" || ratio <= 0) {
    throw new Error(`Invalid ratio: ${ratio}. Must be a positive number.`);
  }
  // --- End Validation ---

  // Calculate the interval corresponding to the ratio in cents
  // Ratio = 2^(cents / 1200)  =>  log2(Ratio) = cents / 1200  =>  cents = 1200 * log2(Ratio)
  const cents = CENTS_PER_OCTAVE * Math.log2(ratio);

  // Transpose the reference note by the calculated cents value
  // This function handles combining cents offsets correctly.
  return transposeByCents(referenceNote, cents, options);
}
