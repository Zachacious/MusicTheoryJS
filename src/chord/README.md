# Chord Module (MusicTheoryJS)

This module is your central hub within the MusicTheoryJS library for everything related to musical chords and chord progressions. It offers a powerful set of tools for creating, analyzing, manipulating, and understanding chords in various theoretical and practical contexts.

## Overview

The Chord module enables you to:

- **Represent Chords:** Work with immutable `Chord` objects that encapsulate root, quality, constituent notes, bass note, inversion, and more.
- **Create Chords Easily:** Instantiate chords in numerous ways – from simple root notes and quality names ("major", "min7", "7sus4"), by parsing standard chord symbols ("Cmaj7/E", "F#dim7"), from arrays of notes, using explicit interval definitions, or based on Roman numerals within a scale context.
- **Handle Voicing and Inversions:** Generate standard chord inversions, sort notes within a chord by pitch, and apply different voicing strategies (close, open, drop voicings).
- **Analyze Chord Structure:** Identify the root, quality, bass note, and inversion of a chord constructed from notes. Find tensions (9, 11, 13) and alterations (b5, #9) compared to standard formulas, as well as missing or extra notes.
- **Analyze Harmonic Function:** Determine a chord's likely function (tonic, predominant, dominant) and tension level within the context of a specific scale.
- **Compare Chords:** Find common tones between chords and analyze voice leading smoothness and potential counterpoint issues (basic parallel/direct fifth detection).
- **Parse & Format Symbols:** Convert between chord objects and their string representations using standard notation, common jazz symbols (Δ, ø, -, o), or Unicode musical symbols. Get lists of alternate spellings.
- **Work with Roman Numerals:** Parse Roman numeral symbols, create chords from numerals within a scale, analyze chords to get their Roman numeral representation, and generate all diatonic chords of a scale with their numerals.
- **Manage Chord Progressions:** Create progressions from sequences of symbols or Roman numerals, generate diatonic progressions based on scale degrees, check if a progression fits a scale, analyze harmonic rhythm (heuristically), suggest harmonically plausible next chords, and apply basic transformations (like substitutions or extensions).
- **Microtonal Chords:** Includes specific functions for creating Just Intonation chords based on frequency ratios and tools for building chords from custom microtonal intervals (cents or fractional semitones) or within EDO systems. Basic microtonal chord identification is also available.

## Core Concepts

- **`Chord` Object:** The immutable representation of a chord instance, containing its `root`, `notes` (in a specific voicing/inversion), `quality`, theoretical `formula`, `bass` note, `inversion` number, `category`, and optional `symbol` and `tuningSystem`.
- **`ChordQuality`:** A defined set of strings representing standard chord types (e.g., "major", "min7", "7b9", "add9"). Used for creation and identification.
- **`ChordFormula`:** Defines the theoretical structure of a `ChordQuality` as a map of scale degrees (1, 3, 5, 7...) to semitone alterations (0, -1, +1...) relative to the major scale intervals. Stored in `CHORD_FORMULAS`.
- **`ChordProgression`:** An array type that can hold a sequence of either `Chord` objects or chord symbol `string`s.

## Getting Started

Typically, you'll import functions from `musictheoryjs/chord`. You can create a chord easily using its symbol or root and quality.

To create C Major 7th:

- Use `createChordFromSymbol("Cmaj7")`.
- Or, create a C root note (`createNote({ letter: 'C', octave: 4 })`) and use `createChord(cNote, "maj7")`.

Once you have a `Chord` object, you can access its properties like `chord.notes`, `chord.root`, `chord.quality`, `chord.bass`, `chord.inversion`, or pass it to analysis functions.

## Key Functionality Areas

- **Creation:** Explore functions like `createChord`, `createChordFromSymbol`, `createChordFromNotes`, `createChordFromIntervals`, `createChordFromRomanNumeral`, `createJustChord`, `createMicrotonalChord`. Use `ChordOptions` to customize inversion, voicing, root octave, etc.
- **Symbols:** Use `parseChordSymbol` to interpret strings, `generateChordSymbol` for standard output, `formatChordSymbol` for different styles (jazz, unicode), and `getAlternateChordSpellings`.
- **Voicing:** Use `sortChordNotes`, `getChordInversion`, `getAllInversions`, and `voiceChord` (with different `voicingType` options).
- **Analysis:** Explore `analyzeChord`, `analyzeChordFunction`, `chordFitsScale`, `findCommonTones`, `analyzeChordConnection`, `analyzeMicrotonalChord`. Check the result interfaces (e.g., `ChordAnalysisResult`).
- **Roman Numerals:** Use `parseRomanNumeral`, `createChordFromRomanNumeral`, `analyzeChordAsRomanNumeral`, `getAllDiatonicChords`. Check the `RomanAnalysis` interface.
- **Progressions:** Use `createProgression`, `createCommonProgression`, `createProgressionFromRomanNumerals`, `createDiatonicProgression` to build sequences. Analyze with `isProgressionDiatonic`, `analyzeHarmonicRhythm`. Explore with `suggestNextChords`, `transformProgression`.

## Constants

Useful predefined data is available:

- `CHORD_FORMULAS`: Maps qualities to their interval structure.
- `CHORD_CATEGORIES`: Classifies chord qualities.
- `SCALE_DEGREE_SEMITONES`: Defines standard major scale intervals.
- `CHORD_SYMBOL_MAP`: Maps aliases to canonical quality names.
- `COMMON_PROGRESSIONS`: Example progressions using Roman numerals.
- And more for parsing and analysis.

## Tree Shaking

This library supports tree shaking. For optimal bundle size, import only the specific functions you need:

`import { createChord, analyzeChord } from 'musictheoryjs/chord';`
