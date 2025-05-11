# MusicTheoryJS API Documentation

Welcome to the complete API reference for **MusicTheoryJS v3**, a comprehensive, modern, and type-safe library for music theory operations in JavaScript and TypeScript.

This library provides immutable data structures and a rich set of functions for modeling, manipulating, analyzing, and converting fundamental musical concepts like notes, intervals, chords, scales, progressions, and tuning systems, with first-class support for microtonal concepts.

## Getting Started

New users might find these core functions helpful to begin exploring:

- **Notes:** {@link createNote} (universal note creator) or {@link createNoteFromParts} (create from letter/octave).
- **Intervals:** Use predefined constants like {@link MAJOR_THIRD} or {@link PERFECT_FIFTH} (defined in Interval module).
- **Scales:** {@link createScale} or {@link createScaleByName} to generate scales.
- **Chords:** {@link createChord} or {@link createChordFromSymbol} to build chords.

## Core Interfaces

Understand the main data structures used throughout the library:

- {@link Note}: Represents a musical note (pitch, spelling, octave, optional microtones).
- {@link Interval}: Represents the distance between notes (in semitones).
- {@link Scale}: Represents a musical scale (root, notes, pattern).
- {@link Chord}: Represents a musical chord (root, notes, quality, bass, inversion).

## Module Overview

The API is organized into functional modules:

- **[Note Module](modules/note.html)**: Creating, manipulating, analyzing, and converting individual musical notes (pitch, MIDI, frequency, cents, notation). Includes microtonal note handling.
- **[Interval Module](modules/interval.html)**: Defines the `Interval` type (semitones) and provides constants for common interval sizes (e.g., `PERFECT_FIFTH`). Includes basic interval operations.
- **[Scale Module](modules/scale.html)**: Creating scales (by name, pattern, steps, notes), generating modes, analyzing scale structure, function, and characteristics, detecting scales in note sets.
- **[Chord Module](modules/chord.html)**: Creating chords (by quality, symbol, notes, intervals), parsing/generating symbols, handling voicing and inversions, analyzing structure and function, creating and analyzing chord progressions, Roman numeral analysis.
- **[Tuning Module](modules/tuning.html)**: Defining and applying alternative tuning systems (Just Intonation, Pythagorean, Meantone, EDOs, Custom) via cents adjustments. Includes ratio/cents conversion utilities.

## Feature Highlights

MusicTheoryJS offers a powerful range of features:

- **Comprehensive Modeling:** Accurately represents notes, intervals, chords (triads, 7ths, extensions, alterations, sus, add), scales (diatonic, modal, pentatonic, blues, symmetric, exotic), and progressions.
- **Flexible Creation:** Instantiate musical objects from various common inputs (symbols, names, MIDI, frequency, intervals, ratios, steps).
- **Rich Analysis:** Includes tools to analyze scale structure/tension/brightness, chord function/structure/tensions, chord connections, Roman numerals, and diatonic relationships.
- **Advanced Pitch Control:** Robust support for microtonality via `cents` offsets, specific functions for Just Intonation and EDOs, and tools for defining and applying custom tuning systems. Includes precise cents-based transposition and interval calculations.
- **Practical Utilities:** Chord symbol parsing and formatting (standard, jazz, unicode), common progression generation, voice leading analysis, enharmonic respelling, and more.
- **Modern Design:** Built with TypeScript for type safety, utilizes immutable data structures for predictable behavior, and designed for tree-shaking to optimize application bundle sizes.

## Design Notes

- **Immutability:** Core objects (`Note`, `Scale`, `Chord`) are immutable. Functions that modify these return _new_ instances.
- **Tree Shaking:** For best results in web projects, import only the specific functions you need directly from the relevant module path (e.g., `import { createScale } from 'musictheoryjs/scale';`). Importing everything from the main entry point might reduce the effectiveness of tree shaking.
