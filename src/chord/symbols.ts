/**
 * Functions for parsing and generating chord symbols
 */

import { CHORD_SYMBOL_MAP, CHORD_SYMBOL_REGEX } from "./constants";
import { Chord, ChordQuality } from "./types";
import { Note, notesAreEqual } from "../note";

import { createChordFromSymbol } from "./creation";

/**
 * Generate a chord symbol from a chord
 */
export function generateChordSymbol(chord: Chord): string {
  // Format the root note (letter + accidental)
  let symbol = `${chord.root.letter}${chord.root.accidental}`;

  // Add quality/extension notation
  switch (chord.quality) {
    case "major":
      // Major triads typically have no symbol
      break;

    case "minor":
      symbol += "m";
      break;

    case "augmented":
      symbol += "+";
      break;

    case "diminished":
      symbol += "dim";
      break;

    case "sus2":
      symbol += "sus2";
      break;

    case "sus4":
      symbol += "sus4";
      break;

    case "maj7":
      symbol += "maj7";
      break;

    case "min7":
      symbol += "m7";
      break;

    case "7":
    case "dom7":
      symbol += "7";
      break;

    case "dim7":
      symbol += "dim7";
      break;

    case "half-dim7":
      symbol += "m7b5";
      break;

    case "minMaj7":
      symbol += "mM7";
      break;

    default:
      // For other qualities, just append the quality name
      symbol += chord.quality;
  }

  // Add slash notation for bass note if different from root
  if (!notesAreEqual(chord.bass, chord.root)) {
    symbol += `/${chord.bass.letter}${chord.bass.accidental}`;
  }

  return symbol;
}

/**
 * Parse a chord symbol into its component parts
 */
export function parseChordSymbol(symbol: string): {
  root: string;
  accidental: string;
  quality: ChordQuality;
  bass?: { letter: string; accidental: string };
} | null {
  // Apply regex to parse the symbol
  const match = symbol.match(CHORD_SYMBOL_REGEX);
  if (!match) {
    return null;
  }

  const [
    _,
    root,
    accidental = "",
    qualityPart = "",
    extension = "",
    bassNotation = "",
  ] = match;

  // Determine the chord quality
  let quality: ChordQuality = "major"; // Default to major triad

  // Try to map directly from the matched parts
  const qualityKey = qualityPart + extension || "";
  if (CHORD_SYMBOL_MAP[qualityKey]) {
    quality = CHORD_SYMBOL_MAP[qualityKey];
  }
  // If not found, try just the quality part
  else if (qualityPart && CHORD_SYMBOL_MAP[qualityPart]) {
    quality = CHORD_SYMBOL_MAP[qualityPart];
  }
  // Try just the extension
  else if (extension && CHORD_SYMBOL_MAP[extension]) {
    quality = CHORD_SYMBOL_MAP[extension];
  }

  // Parse any bass note for slash chords
  let bass;
  if (bassNotation) {
    const bassLetter = bassNotation.charAt(0);
    const bassAccidental = bassNotation.substring(1) || "";
    bass = { letter: bassLetter, accidental: bassAccidental };
  }

  return { root, accidental, quality, bass };
}

/**
 * Formats a chord in different notation styles
 */
export function formatChordSymbol(
  chord: Chord | string,
  format: "standard" | "jazz" | "classical" | "nashville" | "unicode"
): string {
  // If string is provided, parse it to a chord
  const chordObj =
    typeof chord === "string" ? createChordFromSymbol(chord) : chord;

  switch (format) {
    case "standard":
      // Default format (e.g., "Cmaj7")
      return generateChordSymbol(chordObj);

    case "jazz":
      // Jazz notation with delta for major 7, triangles, etc.
      return formatJazzSymbol(chordObj);

    case "classical":
      // Classical symbol using Roman numerals (requires context)
      // Not implemented without scale context
      return generateChordSymbol(chordObj);

    case "nashville":
      // Nashville number system (requires key context)
      // Not implemented without key context
      return generateChordSymbol(chordObj);

    case "unicode":
      // Unicode symbols for common chords
      return formatUnicodeSymbol(chordObj);

    default:
      return generateChordSymbol(chordObj);
  }
}

/**
 * Format a chord using jazz notation conventions
 */
function formatJazzSymbol(chord: Chord): string {
  // Format the root note (letter + accidental)
  let symbol = `${chord.root.letter}${chord.root.accidental}`;

  // Add quality/extension notation using jazz symbols
  switch (chord.quality) {
    case "major":
      // Major triads typically have no symbol
      break;

    case "minor":
      symbol += "-";
      break;

    case "augmented":
      symbol += "+";
      break;

    case "diminished":
      symbol += "o";
      break;

    case "maj7":
      symbol += "Δ"; // Delta symbol for major 7th
      break;

    case "min7":
      symbol += "-7";
      break;

    case "7":
    case "dom7":
      symbol += "7";
      break;

    case "dim7":
      symbol += "o7";
      break;

    case "half-dim7":
      symbol += "ø"; // Half-diminished symbol
      break;

    case "minMaj7":
      symbol += "-Δ";
      break;

    default:
      // For other qualities, use more compact notation
      symbol += chord.quality.replace("major", "maj").replace("minor", "-");
  }

  // Add slash notation for bass note if different from root
  if (!notesAreEqual(chord.bass, chord.root)) {
    symbol += `/${chord.bass.letter}${chord.bass.accidental}`;
  }

  return symbol;
}

/**
 * Format a chord using Unicode music symbols
 */
function formatUnicodeSymbol(chord: Chord): string {
  // Format the root note (letter + accidental)
  let symbol = chord.root.letter;

  // Add accidental using proper Unicode symbols
  if (chord.root.accidental === "#") {
    symbol += "♯"; // Unicode sharp
  } else if (chord.root.accidental === "b") {
    symbol += "♭"; // Unicode flat
  } else if (chord.root.accidental === "x" || chord.root.accidental === "##") {
    symbol += "𝄪"; // Unicode double sharp
  } else if (chord.root.accidental === "bb") {
    symbol += "𝄫"; // Unicode double flat
  }

  // Add quality/extension notation using Unicode symbols
  switch (chord.quality) {
    case "major":
      // Major triads typically have no symbol
      break;

    case "minor":
      symbol += "m";
      break;

    case "augmented":
      symbol += "+";
      break;

    case "diminished":
      symbol += "°"; // Unicode degree symbol for diminished
      break;

    case "maj7":
      symbol += "M⁷"; // Superscript 7
      break;

    case "min7":
      symbol += "m⁷";
      break;

    case "7":
    case "dom7":
      symbol += "⁷";
      break;

    case "dim7":
      symbol += "°⁷";
      break;

    case "half-dim7":
      symbol += "ø⁷";
      break;

    default:
      // For other qualities, just append the quality name
      symbol += chord.quality;
  }

  // Add slash notation for bass note if different from root
  if (!notesAreEqual(chord.bass, chord.root)) {
    symbol += `/`;

    // Format the bass note with Unicode symbols
    let bassSymbol = chord.bass.letter;
    if (chord.bass.accidental === "#") {
      bassSymbol += "♯";
    } else if (chord.bass.accidental === "b") {
      bassSymbol += "♭";
    } else if (
      chord.bass.accidental === "x" ||
      chord.bass.accidental === "##"
    ) {
      bassSymbol += "𝄪";
    } else if (chord.bass.accidental === "bb") {
      bassSymbol += "𝄫";
    }

    symbol += bassSymbol;
  }

  return symbol;
}

/**
 * Get common alternate spellings for a chord
 */
export function getAlternateChordSpellings(chord: Chord): string[] {
  const alternates: string[] = [];

  // Generate the standard symbol as a baseline
  const standard = generateChordSymbol(chord);
  alternates.push(standard);

  // Add jazz notation
  const jazz = formatJazzSymbol(chord);
  if (jazz !== standard) {
    alternates.push(jazz);
  }

  // Add unicode notation
  const unicode = formatUnicodeSymbol(chord);
  if (unicode !== standard && unicode !== jazz) {
    alternates.push(unicode);
  }

  // Add common alternate notations based on quality
  switch (chord.quality) {
    case "major":
      alternates.push(`${chord.root.letter}${chord.root.accidental}M`);
      break;

    case "minor":
      alternates.push(`${chord.root.letter}${chord.root.accidental}-`);
      alternates.push(`${chord.root.letter}${chord.root.accidental}min`);
      break;

    case "diminished":
      alternates.push(`${chord.root.letter}${chord.root.accidental}o`);
      break;

    case "maj7":
      alternates.push(`${chord.root.letter}${chord.root.accidental}M7`);
      alternates.push(`${chord.root.letter}${chord.root.accidental}Δ`);
      break;

    case "min7":
      alternates.push(`${chord.root.letter}${chord.root.accidental}min7`);
      alternates.push(`${chord.root.letter}${chord.root.accidental}-7`);
      break;

    case "half-dim7":
      alternates.push(`${chord.root.letter}${chord.root.accidental}ø`);
      alternates.push(`${chord.root.letter}${chord.root.accidental}m7b5`);
      break;
  }

  // Add enharmonic spelling if it's a black key
  if (
    ["C#", "D#", "F#", "G#", "A#"].includes(
      `${chord.root.letter}${chord.root.accidental}`
    )
  ) {
    // This would require proper enharmonic conversion logic
    // (Not implemented fully in this example)
  }

  // Filter out duplicates
  return [...new Set(alternates)];
}
