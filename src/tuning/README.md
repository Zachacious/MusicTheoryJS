# Tuning Module (MusicTheoryJS)

This module within MusicTheoryJS focuses on musical tuning systems, extending beyond the standard 12-tone equal temperament (12-TET). It provides definitions for various historical and theoretical tunings and allows you to apply these systems to musical notes, typically by calculating precise pitch adjustments in cents.

## Overview

Standard electronic keyboards and most modern Western music use 12-TET, where the octave is divided into 12 identical semitones. However, many other tuning systems exist, offering different interval qualities based on mathematical ratios (Just Intonation), historical practices (Pythagorean, Meantone), or alternative equal divisions (EDOs).

This module allows you to:

- **Explore Predefined Tunings:** Access definitions and adjustment logic for systems like Just Intonation (5-limit), Pythagorean, Quarter-comma Meantone, and example EDOs (19-EDO, 31-EDO) stored in the `TUNING_SYSTEMS` constant.
- **Apply Tunings to Notes:** Use the `applyTuningSystem` function to take an array of standard `Note` objects and return a new array where notes have been adjusted (typically by adding a `cents` property) to reflect their pitch in the specified tuning system relative to a reference note (usually A4=440Hz or the tonic).
- **Define Custom Tunings:** Register your own tuning systems using `registerTuningSystem` by providing a name, description, and a custom function that calculates the appropriate cents adjustment for any given note.
- **Convert Ratios and Cents:** Use utility functions like `ratioToCents` and `centsToRatio` to convert between frequency ratios (fundamental to Just Intonation) and cents values (useful for representing small pitch deviations).
- **Calculate Frequency Ratios/Differences:** Determine the frequency ratio or cents difference between notes or raw frequencies using functions like `getFrequencyRatio` and `centsBetweenFrequencies`.

## Core Concepts

- **Tuning System:** A method defining the precise frequency relationships between notes in a scale or musical system.
- **Cents:** A logarithmic unit measuring musical intervals, where one octave is divided into 1200 cents and one 12-TET semitone is 100 cents. This module often uses cents to represent the _deviation_ of a note in a non-12-TET system compared to its nearest 12-TET equivalent.
- **`TUNING_SYSTEMS`:** An exported constant object containing definitions for various tuning systems, including their names, descriptions, and the core `adjustmentFunction`.
- **`TuningSystemFunction`:** A function type that takes a note and a reference note and returns the required cents adjustment for that note in the specific tuning system.

## Getting Started

To use a different tuning, you typically apply it to a set of notes:

1.  **Create your notes:** Generate an array of standard `Note` objects (e.g., representing a scale or chord in 12-TET).
2.  **Choose a tuning system:** Select a predefined system name (like `"justIntonation"`) or provide your own custom `TuningSystemFunction`.
3.  **Apply the tuning:** Call `applyTuningSystem` with your notes and the chosen system. You can optionally provide a reference note (defaults to A4).
4.  **Use the results:** The function returns a _new_ array of `Note` objects. Notes that differ from their 12-TET counterparts in the chosen tuning will now likely have a `cents` property indicating the adjustment. You can then use these notes for frequency calculation (`noteToFrequency`) or further analysis.

You can also register your own tunings for reuse with `registerTuningSystem` and explore interval relationships using the ratio/cents conversion utilities.

## Key Functionality

- **Applying Tunings:** The main function is `applyTuningSystem`, which takes notes and a system identifier (string name or custom function) and returns adjusted notes.
- **Predefined Systems:** Access standard definitions via the `TUNING_SYSTEMS` object (e.g., `TUNING_SYSTEMS.pythagorean`).
- **Custom Systems:** Extend the library using `registerTuningSystem` to add your own tuning definitions.
- **Ratio/Cents Utilities:** Convert between frequency ratios and cents using `ratioToCents`, `centsToRatio`, and calculate differences with `getFrequencyRatio` and `centsBetweenFrequencies`. _(Note: Some of these utility functions might also exist in other modules like `calculations`; check documentation or implementation if specific behavior is needed)._

## Tree Shaking

Import only the functions or constants you need directly from `musictheoryjs/tuning` (or the main library entry point) to optimize bundle size.
