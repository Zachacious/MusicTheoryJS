# MusicTheoryJS v3

**A comprehensive, modern, and flexible music theory library for JavaScript and TypeScript.**

## Introduction

MusicTheoryJS provides developers, musicians, educators, and researchers with a robust toolkit for modeling, analyzing, and manipulating fundamental music theory concepts programmatically. Whether you are building interactive learning tools, composing algorithmic music, analyzing scores, developing VST plugins with web technologies, or exploring generative AI music applications, this library aims to provide the necessary building blocks.

Built with TypeScript, it offers strong type safety and a modern development experience. It handles standard 12-tone equal temperament (12-TET) concepts as well as offering extensive support for various microtonal systems and tunings.

## Goals & Philosophy

This library (specifically Version 3) is built with several key goals in mind:

- **Comprehensiveness:** To accurately model a wide array of music theory elements, including notes, intervals, chords (with qualities, extensions, alterations, inversions), scales (standard, modal, pentatonic, exotic), chord progressions, Roman numeral analysis, and diverse tuning systems.
- **Accuracy & Reliability:** To provide correct calculations and representations based on established music theory principles.
- **Modern & Type-Safe:** Leverage TypeScript for improved developer experience, code clarity, and reduced errors.
- **Immutability:** Core data structures like Notes, Scales, and Chords are treated as immutable, leading to more predictable and safer state management in applications. Operations return new instances rather than modifying originals.
- **Extensive Microtonal Support:** Go beyond 12-TET by default, enabling work with cents deviations, Just Intonation ratios, Equal Divisions of the Octave (EDOs), historical temperaments, and user-defined custom tunings.
- **Tree Shakable & Lightweight:** Designed with modern bundling in mind. By importing only the specific functions or modules needed, developers can minimize the impact on final application bundle sizes, making it suitable for web-based projects. The core has minimal external dependencies.
- **Foundation for AI Music:** Provide the structured data, precise calculations, and theoretical relationships needed for generative music AI, algorithmic composition tools, music information retrieval (MIR) tasks, and intelligent music analysis applications. It handles the symbolic layer, allowing AI models or algorithms to focus on higher-level patterns and creativity.
- **Extensibility:** Allow users to add their own definitions, such as custom tuning systems via the `registerTuningSystem` function.

## Features

MusicTheoryJS offers functionality across several core modules:

- **Notes:** Represent individual pitches with spelling (letter, accidental, octave) and pitch class. Create notes from various inputs (parts, MIDI, frequency, ratios). Calculate MIDI numbers and frequencies, including precise microtonal adjustments based on cents or tuning systems. Compare notes for pitch or strict equality. Handle enharmonic spellings.
- **Intervals:** Define musical intervals based on semitone distance. Provides constants for common intervals (Major Third, Perfect Fifth, etc.) and utilities for simplifying, inverting, and classifying intervals.
- **Chords:** Create chords from roots and standard quality names (major, min7, 7sus4, add9, dim7, etc.) or by parsing chord symbols ("Cmaj7/G", "F#m7b5"). Analyze chords to find root, quality, bass note, inversion, tensions, alterations, and missing/extra tones. Handle voicings and inversions. Generate standard, jazz, or Unicode symbols. Includes microtonal chord creation (Just Intonation, custom intervals).
- **Scales:** Create scales from names (major, dorian, minorPentatonic, etc.), interval patterns, step patterns (W-H), or arrays of notes. Generate modes. Analyze scale structure (diatonic, pentatonic, hemitonic, symmetrical), interval content, brightness, tension, and tonal function of degrees. Compare scales and find related keys (parallel/relative). Includes microtonal scale generation (EDO, JI, Custom).
- **Chord Progressions:** Create progressions from sequences of chord symbols or Roman numerals within a scale context. Generate diatonic progressions. Analyze diatonicity and basic harmonic rhythm. Includes heuristic functions for suggesting next chords and applying simple transformations (substitutions, extensions, secondary dominants, modal interchange).
- **Tuning Systems:** Apply different tunings beyond 12-TET, including Just Intonation, Pythagorean, Meantone, and various EDOs. Calculate cents deviations. Register custom tuning systems. Convert between frequency ratios and cents.

## Who Is This For?

- Web developers building music-related applications (editors, visualizers, educational tools).
- Node.js developers working on music generation, analysis, or backend systems.
- Musicians and composers exploring theory, microtonality, or algorithmic composition.
- Educators creating interactive music theory content.
- Researchers in AI music, MIR, or computational musicology.

## Installation

```bash
npm install musictheoryjs
```

## Basic Usage

```javascript
import { createNote, createScale, createChord } from "musictheoryjs";

// Create a note
const cNote = createNote({ letter: "C", octave: 4 });

// Create a scale
const cMajorScale = createScale(cNote, "major");

// Create a chord
const cMajorChord = createChord(cNote, "major");
```
