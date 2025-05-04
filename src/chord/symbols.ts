/**
 * @module Chord/Symbol
 * @description
 * This module provides utility functions specifically for parsing chord symbol strings
 * into structured data and generating various string representations (symbols)
 * for Chord objects, including standard, jazz, and Unicode formats.
 */

// Import chord constants (symbol map, regex) and types
import { CHORD_SYMBOL_MAP, CHORD_SYMBOL_REGEX } from "./constants";
import { Chord, ChordQuality } from "./types";

// Import chord creation function used by formatChordSymbol if input is string
import { createChordFromSymbol } from "./creation"; // Used by formatChordSymbol
// Import necessary Note types and functions
import { notesAreEqual } from "../note";

/**
 * Generates a standard chord symbol string (e.g., "Cm7", "G7/B", "F#dim")
 * from a Chord object's properties (root, quality, bass).
 * Uses common abbreviations for qualities.
 *
 * @param chord - The Chord object to format.
 * @returns A string representing the chord symbol in a standard format.
 * @throws {Error} If the input chord or its root/quality is invalid.
 * @remarks This function provides a default string representation. For other formats (Jazz, Unicode), see `formatChordSymbol`. The exact symbols used for qualities depend on the switch statement logic (e.g., 'm' for minor, '+' for augmented, 'dim' for diminished, 'maj7', 'm7b5').
 * @example
 * ```ts
 * const cMaj7 = createChord({ root: createNote('C4'), quality: 'maj7'});
 * generateChordSymbol(cMaj7); // "Cmaj7"
 *
 * const g7slashB = createChord({ root: createNote('G3'), quality: '7', bass: createNote('B3') });
 * generateChordSymbol(g7slashB); // "G7/B"
 *
 * const fSharpDim = createChord({ root: createNote('F#4'), quality: 'diminished'});
 * generateChordSymbol(fSharpDim); // "F#dim"
 * ```
 */
export function generateChordSymbol(chord: Chord): string {
  // --- Input Validation ---
  if (!chord || !chord.root || !chord.quality) {
    throw new Error("Invalid Chord object provided to generateChordSymbol.");
  }
  // --- End Validation ---

  // Format the root note (letter + accidental, use empty string if accidental is null/undefined/empty)
  let symbol = `${chord.root.letter}${chord.root.accidental ?? ""}`;

  // Add quality/extension notation based on the canonical quality name
  switch (chord.quality) {
    case "major":
      // Major triads typically have no symbol after the root
      break;
    case "minor":
      symbol += "m";
      break;
    case "augmented":
      symbol += "+"; // Or 'aug'
      break;
    case "diminished":
      symbol += "dim"; // Or '°' / 'o'
      break;
    case "sus2":
      symbol += "sus2";
      break;
    case "sus4":
      symbol += "sus4"; // Or 'sus'
      break;
    case "maj7":
      symbol += "maj7"; // Or 'M7', 'Δ7'
      break;
    case "min7":
      symbol += "m7"; // Or '-7'
      break;
    case "7": // Dominant 7th
    case "dom7": // Explicit dominant 7th name
      symbol += "7";
      break;
    case "dim7":
      symbol += "dim7"; // Or '°7', 'o7'
      break;
    case "half-dim7": // Minor 7 flat 5
      symbol += "m7b5"; // Or 'ø7'
      break;
    case "minMaj7":
      symbol += "mM7"; // Or '-Δ7'
      break;
    // Add cases for other common qualities if needed (9, 11, 13, 6, altered etc.)
    // using common abbreviations.
    default:
      // For less common or complex qualities not explicitly handled,
      // append the quality name directly. This might not be standard notation.
      symbol += chord.quality;
  }

  // Add slash notation for the bass note if it's present and different from the root (pitch check)
  if (chord.bass && !notesAreEqual(chord.bass, chord.root)) {
    symbol += `/${chord.bass.letter}${chord.bass.accidental ?? ""}`; // Add slash bass
  }

  return symbol;
}

/**
 * Parses a chord symbol string using CHORD_SYMBOL_REGEX and CHORD_SYMBOL_MAP
 * to extract the root letter, accidental, canonical quality name, and optional bass note components.
 *
 * @param symbol - The chord symbol string (e.g., "F#m7b5/C", "Bbmaj7", "Caug").
 * @returns An object with parsed components (`root`, `accidental`, `quality`, optional `bass` object with letter/accidental), or `null` if parsing fails.
 * @throws {Error} If the input symbol is not a string or is empty after trimming.
 * @remarks This parser relies on the defined `CHORD_SYMBOL_REGEX` and `CHORD_SYMBOL_MAP`. It handles common notations but may fail on highly complex or non-standard symbols. The quality identification maps various aliases to a canonical name. Bass note parsing is basic (Letter + optional Accidental). Note: This function appears duplicated in `creation.ts` in the original code structure.
 * @see {@link CHORD_SYMBOL_REGEX}
 * @see {@link CHORD_SYMBOL_MAP}
 * @example
 * ```ts
 * parseChordSymbol("Cmaj7");
 * // -> { root: "C", accidental: "", quality: "maj7", bass: undefined }
 *
 * parseChordSymbol("F#m7b5/A");
 * // -> { root: "F", accidental: "#", quality: "half-dim7", bass: { letter: "A", accidental: "" } }
 *
 * parseChordSymbol("G+");
 * // -> { root: "G", accidental: "", quality: "augmented", bass: undefined }
 *
 * parseChordSymbol("Invalid"); // -> null
 * ```
 */
export function parseChordSymbol(symbol: string): {
  root: string; // Root letter (e.g., "C", "F")
  accidental: string; // Accidental symbol (e.g., "#", "b", "")
  quality: ChordQuality; // Canonical quality name (e.g., "maj7", "minor")
  bass?: { letter: string; accidental: string }; // Optional bass note components
} | null {
  // --- Input Validation ---
  if (typeof symbol !== "string") {
    console.warn("Invalid input: Chord symbol must be a string.");
    return null;
  }
  const trimmedSymbol = symbol.trim();
  if (trimmedSymbol.length === 0) {
    return null; // Empty string is not a valid symbol
  }
  // --- End Validation ---

  // Apply the regex to parse the symbol string
  const match = trimmedSymbol.match(CHORD_SYMBOL_REGEX);
  if (!match) {
    // Regex did not match the input format
    return null;
  }

  // Extract captured groups based on the regex structure in constants.ts
  // Group 1: Root Letter
  // Group 2: Root Accidental (optional)
  // Group 3: Quality/Extension/Alteration part (optional)
  // Group 4: Bass Note part (Letter + Accidental) (optional)
  // Note: Original code had different destructuring. Adjusting based on current regex.
  const [
    _, // Full match ignored
    root, // Group 1: Letter (A-G, case varies)
    accidental = "", // Group 2: Accidental for root, default ""
    // Group 3 is complex quality/extension string, needs lookup
    qualityStringPart = "", // The matched quality/extension string, default ""
    // Group 4: Bass note (Letter + Accidental), e.g., "C#", "Bb", "A"
    bassNotation = "", // Default "" if no slash bass
  ] = match;
  // The original destructuring assumed different groups for quality vs extension.
  // The current regex puts them together in group 3. Let's use group 3 directly.
  const qualityKey = qualityStringPart; // Use the matched quality string

  // Determine the canonical chord quality using the symbol map
  let quality: ChordQuality = "major"; // Default to major triad if qualityKey is empty or not found

  // Look up the matched quality string (case-sensitive based on map keys)
  if (CHORD_SYMBOL_MAP[qualityKey]) {
    quality = CHORD_SYMBOL_MAP[qualityKey];
  }
  // Add fallback logic? E.g. try lowercase? Or assume major if not found?
  // Current logic defaults to major if lookup fails.

  // Parse the captured bass note string (if present)
  let bass;
  if (bassNotation) {
    // Bass notation captured group 4 should be Letter + optional Accidental
    const bassLetter = bassNotation.charAt(0); // First char is letter
    const bassAccidental = bassNotation.substring(1) || ""; // Remainder is accidental, default ""
    // Basic validation on parsed bass parts
    if (
      bassLetter.match(/^[A-Ga-g]$/) &&
      ["", "#", "b"].includes(bassAccidental)
    ) {
      bass = { letter: bassLetter, accidental: bassAccidental };
    } else {
      console.warn(
        `Could not parse bass note notation "${bassNotation}" from symbol "${symbol}".`
      );
      // Bass remains undefined
    }
  }

  // Return the parsed components
  return {
    root: root, // Root letter (case preserved from input for now)
    accidental: accidental, // Root accidental
    quality: quality, // Canonical quality name
    bass, // Optional object { letter, accidental }
  };
}

/**
 * Formats a Chord object or chord symbol string into different common notation styles.
 *
 * @param chord - The Chord object or a chord symbol string to format. If a string is provided, it will be parsed first using `createChordFromSymbol`.
 * @param format - The desired output format:
 * - `"standard"`: Default internal format (e.g., "Cmaj7", "G7/B"). See `generateChordSymbol`.
 * - `"jazz"`: Common jazz notation (e.g., "CΔ7", "G7/B", "F-7", "Dø7"). See `formatJazzSymbol`.
 * - `"unicode"`: Uses Unicode characters for accidentals and some symbols (e.g., "C♯m⁷", "G⁷/B♭"). See `formatUnicodeSymbol`.
 * - `"classical"`: Placeholder - currently returns standard format. Requires scale context for Roman numerals.
 * - `"nashville"`: Placeholder - currently returns standard format. Requires key context for Nashville numbers.
 * @returns A string representing the chord in the specified format. Returns standard format for unimplemented styles or on error.
 * @throws {Error} If the input is a string and cannot be parsed into a valid Chord object.
 * @example
 * ```ts
 * const chord = createChordFromSymbol("F#m7b5/C");
 *
 * formatChordSymbol(chord, 'standard'); // "F#m7b5/C" (or "F#half-dim7/C" depending on generateChordSymbol logic)
 * formatChordSymbol(chord, 'jazz');     // "F#ø/C"
 * formatChordSymbol(chord, 'unicode');  // "F♯ø⁷/C" (approx)
 * formatChordSymbol("Bbmaj7", 'jazz'); // "BbΔ7"
 * ```
 */
export function formatChordSymbol(
  chord: Chord | string,
  format: "standard" | "jazz" | "classical" | "nashville" | "unicode"
): string {
  // If a string symbol is provided, parse it into a Chord object first.
  let chordObj: Chord;
  try {
    chordObj = typeof chord === "string" ? createChordFromSymbol(chord) : chord;
    // Basic validation of the resulting object
    if (!chordObj || !chordObj.root || !chordObj.quality || !chordObj.bass) {
      throw new Error("Provided object is not a valid Chord.");
    }
  } catch (e) {
    console.error(
      `Error processing input for formatChordSymbol: ${(e as Error).message}`
    );
    // Fallback for invalid input
    return typeof chord === "string" ? chord : "[Invalid Chord]";
  }

  // Select the appropriate formatting function based on the requested format
  switch (format) {
    case "standard":
      // Use the default symbol generation function
      return generateChordSymbol(chordObj);

    case "jazz":
      // Use the jazz-specific formatting helper
      return formatJazzSymbol(chordObj);

    case "unicode":
      // Use the unicode-specific formatting helper
      return formatUnicodeSymbol(chordObj);

    case "classical":
      // Requires scale context to generate Roman numerals. Return standard for now.
      console.warn(
        "Classical (Roman Numeral) formatting requires scale context and is not fully implemented here."
      );
      return generateChordSymbol(chordObj); // Placeholder

    case "nashville":
      // Requires key context to generate Nashville numbers. Return standard for now.
      console.warn(
        "Nashville Number System formatting requires key context and is not fully implemented here."
      );
      return generateChordSymbol(chordObj); // Placeholder

    default:
      // Fallback to standard format for any unrecognized format option
      console.warn(
        `Unknown format "${format}" requested. Using standard format.`
      );
      return generateChordSymbol(chordObj);
  }
}

/**
 * @internal
 * Formats a Chord object using common jazz notation symbols (-, o, Δ, ø).
 *
 * @param chord - The Chord object to format.
 * @returns The chord symbol string in jazz notation.
 */
function formatJazzSymbol(chord: Chord): string {
  // Format the root note (letter + accidental)
  let symbol = `${chord.root.letter}${chord.root.accidental ?? ""}`;

  // Add quality/extension notation using common jazz symbols
  switch (chord.quality) {
    case "major":
      // Major triads often have no symbol or sometimes 'maj' or 'M'
      // Stick to no symbol for simplicity based on original code
      break;
    case "minor":
      symbol += "-"; // Hyphen for minor
      break;
    case "augmented":
      symbol += "+"; // Plus for augmented
      break;
    case "diminished":
      symbol += "o"; // Degree symbol for diminished triad
      break;
    case "maj7":
      symbol += "Δ"; // Delta symbol for major 7th
      // Sometimes Δ7 explicitly, original used just Δ
      break;
    case "min7":
      symbol += "-7"; // Hyphen 7 for minor 7th
      break;
    case "7":
    case "dom7":
      symbol += "7"; // 7 for dominant 7th
      break;
    case "dim7":
      symbol += "o7"; // Degree 7 for fully diminished 7th
      break;
    case "half-dim7": // m7b5
      symbol += "ø"; // Slashed circle for half-diminished 7th (often implies 7th)
      // Sometimes ø7 explicitly, original used ø
      break;
    case "minMaj7":
      symbol += "-Δ"; // Hyphen Delta for minor-major 7th
      // Or sometimes -Δ7
      break;
    // Add jazz notations for extensions (9, 11, 13) and alterations if needed
    // Often involves superscripts or parentheses, e.g., G7(b9), C-9
    // Default uses quality name for unhandled cases.
    default:
      // For other qualities, try to use compact notation or fallback
      // Original code replaced 'major' with 'maj', 'minor' with '-'. Let's replicate.
      let qualityJazz = chord.quality
        .replace("major", "maj")
        .replace("minor", "-");
      // Add specific replacements if needed (e.g., aug7 -> +7)
      if (chord.quality === "aug7") qualityJazz = "+7";
      symbol += qualityJazz;
  }

  // Add slash notation for bass note if different from root
  if (chord.bass && !notesAreEqual(chord.bass, chord.root)) {
    symbol += `/${chord.bass.letter}${chord.bass.accidental ?? ""}`;
  }

  return symbol;
}

/**
 * @internal
 * Formats a Chord object using Unicode musical symbols for accidentals (♯, ♭, 𝄪, 𝄫)
 * and some common quality indicators (° , ⁷).
 *
 * @param chord - The Chord object to format.
 * @returns The chord symbol string using Unicode characters.
 */
function formatUnicodeSymbol(chord: Chord): string {
  // Format the root note's letter
  let symbol = chord.root.letter;

  // Add accidental using proper Unicode symbols
  // Using nullish coalescing for accidental safety
  const rootAccidental = chord.root.accidental ?? "";
  if (rootAccidental === "#") {
    symbol += "♯"; // Unicode sharp U+266F
  } else if (rootAccidental === "b") {
    symbol += "♭"; // Unicode flat U+266D
  } else if (rootAccidental === "x" || rootAccidental === "##") {
    symbol += "𝄪"; // Unicode double sharp U+1D12A
  } else if (rootAccidental === "bb") {
    symbol += "𝄫"; // Unicode double flat U+1D12B
  }
  // No symbol for natural ('')

  // Add quality/extension notation using Unicode symbols where appropriate
  switch (chord.quality) {
    case "major":
      // Major triads typically have no symbol
      break;
    case "minor":
      symbol += "m"; // Standard 'm' is common even with unicode
      break;
    case "augmented":
      symbol += "+"; // Standard '+'
      break;
    case "diminished":
      symbol += "°"; // Unicode degree symbol U+00B0
      break;
    case "maj7":
      symbol += "M⁷"; // Uppercase M, Unicode superscript 7 U+2077
      break;
    case "min7":
      symbol += "m⁷"; // Lowercase m, Unicode superscript 7 U+2077
      break;
    case "7":
    case "dom7":
      symbol += "⁷"; // Unicode superscript 7 U+2077
      break;
    case "dim7":
      symbol += "°⁷"; // Degree symbol + superscript 7
      break;
    case "half-dim7":
      symbol += "ø⁷"; // Slashed circle + superscript 7 (ø U+00F8)
      break;
    // Add other common unicode representations if desired (e.g., for sus, add, extensions)
    default:
      // Fallback for other qualities: append the quality name
      symbol += chord.quality;
  }

  // Add slash notation for bass note if different from root
  if (chord.bass && !notesAreEqual(chord.bass, chord.root)) {
    symbol += `/`; // Slash separator

    // Format the bass note with Unicode accidentals
    let bassSymbol = chord.bass.letter;
    const bassAccidental = chord.bass.accidental ?? "";
    if (bassAccidental === "#") {
      bassSymbol += "♯";
    } else if (bassAccidental === "b") {
      bassSymbol += "♭";
    } else if (bassAccidental === "x" || bassAccidental === "##") {
      bassSymbol += "𝄪";
    } else if (bassAccidental === "bb") {
      bassSymbol += "𝄫";
    }
    symbol += bassSymbol;
  }

  return symbol;
}

/**
 * Generates an array of common alternative string representations (symbols) for a given Chord object.
 * Includes standard notation, common aliases (like '-', 'o', 'Δ', 'ø'), and potentially Unicode formats.
 *
 * @param chord - The Chord object.
 * @returns An array of strings, each representing a common way to write the chord symbol. May contain duplicates if aliases overlap. Includes the 'standard' format first.
 * @throws {Error} If the input chord is invalid.
 * @remarks The list of aliases is based on common conventions (e.g., from `CHORD_SYMBOL_MAP`). Enharmonic spelling of the root is noted as not fully implemented in the original code.
 * @example
 * ```ts
 * const cm7 = createChord({ root: createNote('C4'), quality: 'min7' });
 * getAlternateChordSpellings(cm7); // Example: ['Cm7', 'C-7', 'Cmin7', 'Cm⁷']
 *
 * const gSharpDim = createChord({ root: createNote('G#3'), quality: 'diminished' });
 * getAlternateChordSpellings(gSharpDim); // Example: ['G#dim', 'G#o', 'G♯°']
 * ```
 */
export function getAlternateChordSpellings(chord: Chord): string[] {
  // --- Input Validation ---
  if (!chord || !chord.root || !chord.quality) {
    throw new Error(
      "Invalid Chord object provided to getAlternateChordSpellings."
    );
  }
  // --- End Validation ---

  const alternates: string[] = [];

  // 1. Generate the standard symbol as a baseline
  const standard = generateChordSymbol(chord);
  alternates.push(standard);

  // 2. Add jazz notation format if different
  const jazz = formatJazzSymbol(chord);
  if (jazz !== standard) {
    alternates.push(jazz);
  }

  // 3. Add unicode notation format if different from others
  const unicode = formatUnicodeSymbol(chord);
  if (unicode !== standard && unicode !== jazz) {
    alternates.push(unicode);
  }

  // 4. Add common alternate quality notations based on Chord Quality map / common usage
  // This looks up aliases in CHORD_SYMBOL_MAP that map *to* the chord's quality.
  for (const [alias, quality] of Object.entries(CHORD_SYMBOL_MAP)) {
    if (quality === chord.quality && alias !== "" && alias !== quality) {
      // Check if alias maps to this quality and isn't the quality name itself or empty
      // Construct the alternate symbol using the root + alias
      const alternateSymbol = `${chord.root.letter}${
        chord.root.accidental ?? ""
      }${alias}`;
      // Add slash bass if needed
      if (chord.bass && !notesAreEqual(chord.bass, chord.root)) {
        alternates.push(
          `${alternateSymbol}/${chord.bass.letter}${
            chord.bass.accidental ?? ""
          }`
        );
      } else {
        alternates.push(alternateSymbol);
      }
    }
  }
  // The original switch statement provided specific hardcoded alternates. Let's add those too for adherence.
  const rootStr = `${chord.root.letter}${chord.root.accidental ?? ""}`;
  switch (chord.quality) {
    case "major":
      if (rootStr !== standard) alternates.push(`${rootStr}M`); // Add 'M' if not already just root letter
      break;
    case "minor":
      if (`${rootStr}-` !== jazz) alternates.push(`${rootStr}-`);
      if (`${rootStr}min` !== standard) alternates.push(`${rootStr}min`);
      break;
    case "diminished":
      if (`${rootStr}o` !== jazz) alternates.push(`${rootStr}o`);
      break;
    case "maj7":
      if (`${rootStr}M7` !== standard) alternates.push(`${rootStr}M7`);
      if (`${rootStr}Δ` !== jazz) alternates.push(`${rootStr}Δ`); // Already added Δ7? No, just Δ. Add it.
      break;
    case "min7":
      if (`${rootStr}min7` !== standard) alternates.push(`${rootStr}min7`);
      if (`${rootStr}-7` !== jazz) alternates.push(`${rootStr}-7`);
      break;
    case "half-dim7":
      if (`${rootStr}ø` !== jazz) alternates.push(`${rootStr}ø`); // Add ø
      if (`${rootStr}m7b5` !== standard) alternates.push(`${rootStr}m7b5`);
      break;
    // Add more cases for other common aliases if needed
  }

  // Add enharmonic spelling of the root if applicable?
  // Original code noted this was not implemented. Requires enharmonic logic.
  // Example placeholder logic:
  /*
  if (
    ["C#", "D#", "F#", "G#", "A#"].includes(rootStr) ||
    ["Db", "Eb", "Gb", "Ab", "Bb"].includes(rootStr)
  ) {
     // Find enharmonic root using respellNote or similar logic...
     // const enharmonicRoot = respellNote(chord.root, { prefer: chord.root.accidental.includes('#') ? 'flat' : 'sharp' });
     // const enharmonicRootStr = `${enharmonicRoot.letter}${enharmonicRoot.accidental ?? ''}`;
     // Add alternates using enharmonic root... e.g., alternates.push(generateChordSymbol({ ...chord, root: enharmonicRoot }));
     console.warn("Enharmonic root spelling alternates not fully implemented.");
  }
  */

  // Filter out duplicate symbols that might have been added through different methods
  // Use Set for efficient filtering
  return [...new Set(alternates)]; // Return unique spellings
}
