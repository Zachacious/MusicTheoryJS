# Scale Module (MusicTheoryJS)

This module provides comprehensive tools for working with musical scales within the MusicTheoryJS library. It allows you to define, create, analyze, and manipulate a wide variety of scales, from standard diatonic and pentatonic scales to modes, microtonal systems, and custom constructions.

## Core Concepts

### The `Scale` Object

A `Scale` object is the central piece of this module. It immutably represents a specific musical scale instance and typically contains:

- **`root`**: The starting `Note` of the scale.
- **`notes`**: A sorted, readonly array of `Note` objects belonging to the scale for one or more octaves.
- **`pattern`**: A readonly array of numbers representing the scale's interval structure (semitones from the root, e.g., `[0, 2, 4, 5, 7, 9, 11]` for major).
- **`name`**: An optional identifier if the scale matches a known pattern (e.g., "major", "dorian").
- **`tuningSystem`**: An optional tag indicating the tuning system (e.g., "equalTemperament", "justIntonation", "24-EDO").

### Scale Patterns and Names

The library uses `ScalePattern` (an array of intervals from the root) to define scale structures. Many common scales are predefined and can be referenced by their `ScaleName` (like "minorPentatonic" or "lydian").

## Creating Scales

The module offers highly flexible ways to create scales:

- **By Name:** Use functions like `createScaleByName` with a root note (object or string like "C4") and a known `ScaleName` (e.g., "major").
- **By Pattern:** Use `createScale` with a root note and an explicit `ScalePattern` array.
- **From Notes:** Automatically derive the pattern and attempt to identify the scale from an array of `Note` objects using `createScaleFromNotes`.
- **From Steps:** Define scales using simple step strings like "WWHWWWH" (Whole/Half steps) via `createScaleFromString` or `createScaleFromSteps`.
- **Custom Intervals:** Build scales with unique interval structures (semitones or cents) using `createCustomScale`.
- **Chromatic:** Easily create a full chromatic scale with `createChromaticScale`.
- **Microtonal Scales:**
  - Generate Just Intonation scales (Major/Minor variants) based on pure ratios using `createJustIntonationScale`.
  - Create scales within any Equal Division of the Octave (EDO) system (like 19-EDO, 24-EDO/quarter-tone, 31-EDO) using `createEDOScale`, optionally selecting specific steps.
  - Apply specific tuning system adjustments (like Pythagorean) to standard scales using `createTunedScale` (requires an `applyTuningSystem` implementation).

Creation functions often accept `ScaleOptions` to control sorting, octave range, enharmonic preference (`prefer`), and whether generated notes include cached values (`includeCachedValues`).

## Scale Operations

Once you have a scale, you can manipulate it:

- **Transpose:** Shift the entire scale up or down using `transposeScale`.
- **Get Notes/Degrees:** Retrieve specific notes by their 1-based degree index (`getDegree`) or find the degree of a given note (`getScaleDegree`). Handle octave wrapping automatically.
- **Check Membership:** Determine if a note's pitch class belongs to the scale using `isNoteInScale`.
- **Find Closest Note:** Find the scale note closest in pitch to an external note using `findClosestScaleNote`.
- **Modes:** Generate any mode (Dorian, Phrygian, etc.) of a given scale starting on a specific degree using `getMode`. You can also create modes directly (`createModalScale`, `createModeFromMajor`) or get all modes of a major scale (`getAllMajorModes`).
- **Filter & Segment:** Create new scales by extracting specific degrees (`filterScaleDegrees`) or a continuous range of degrees (`getScaleSegment`).
- **Merge:** Combine the notes from two scales into a new scale using `mergeScales`.
- **Invert:** Create the melodic inversion of a scale around its root or another center note using `invertScale`.

## Scale Analysis

Gain insights into scale structures and characteristics:

- **Interval Content:** Analyze the frequency of different intervals (perfect fifths, tritones, semitones, large leaps), pattern symmetry, maximum gap, and average step size using `analyzeScaleIntervals`.
- **Structure:** Determine properties like pentatonic/heptatonic/octatonic nature, diatonicity (based on specific W/H pattern), presence of semitones (hemitonic), interval coherence, leading tone presence, and symmetry using `analyzeScaleStructure`.
- **Brightness/Darkness:** Get a qualitative assessment (`very bright` to `very dark`) based on comparison to the major scale pattern using `analyzeScaleBrightness`.
- **Tonal Function:** Identify the traditional role of each degree in 7-note scales (tonic, dominant, etc.) using `getScaleFunction`.
- **Tension:** Get a heuristic tension profile including overall tension score, chromatic tension, dissonance count, dominant pull strength, and identification of high-tension degrees using `analyzeScaleTension`.
- **Comparison:** Understand the relationship between two scales (identical, mode, subset, superset, common notes) using `compareScales`.
- **Related Scales:** Find theoretically related scales (parallel/relative major/minor, dominant, subdominant, etc.) for major/minor scales using `findRelatedScales`.
- **Cadences:** Analyze the potential for forming standard cadences (Authentic, Plagal, etc.) based on the presence of key degrees in 7-note scales using `analyzePossibleCadences`.

## Scale Detection

Identify scales within collections of notes:

- **Standard Scales:** Detect the most likely 12-TET scales containing a given set of notes, ranked by confidence, using `detectScales`.
- **Key Detection:** Find the most probable major or minor key for a set of notes using `detectKey`.
- **Microtonal Scales:** Attempt heuristic detection of common EDO or Just Intonation patterns using `detectMicrotonalScale`.

## Constants

Commonly used predefined patterns are available in `SCALE_PATTERNS`. Mode names and indices are also provided (`MODE_NAMES`, `MODE_INDICES`).

## Tree Shaking

Import only the functions and types you need directly from `musictheoryjs/scale` to leverage tree shaking and minimize bundle sizes.
