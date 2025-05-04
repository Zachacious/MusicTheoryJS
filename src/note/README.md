# Note Module (MusicTheoryJS)

Welcome to the Note module, a core part of the MusicTheoryJS library! This module is your primary toolkit for working with musical notes in your JavaScript or TypeScript projects. Whether you're dealing with standard musical notation, MIDI systems, audio frequencies, or exploring microtonal music, this module provides the building blocks and functions you need.

## What is a Note?

At its heart, a Note object in this library represents a specific musical pitch combined with its standard musical spelling. This includes:

- **Letter:** The diatonic letter name (A, B, C, D, E, F, G).
- **Accidental:** Any sharp (#), flat (b), double sharp (## or x), double flat (bb), or natural ('') modifier.
- **Octave:** The scientific octave number (e.g., Middle C is C4, in octave 4).

From these core components, the library understands the note's exact position in the pitch spectrum. Importantly, Note objects created by this library are **immutable** – functions that modify a note (like transposition) will always return a new Note object, leaving the original unchanged.

## Creating Notes

Flexibility is key. You can create Note objects in various ways depending on your input data:

- **From Musical Parts:** Directly specify the letter, accidental (optional), and octave (e.g., creating "F#5").
- **From MIDI:** Provide a standard MIDI number (0-127), and the library determines the corresponding note spelling (allowing you to prefer sharps or flats for ambiguous cases like C#/Db).
- **From Frequency:** Input a frequency in Hz, and the library finds the nearest standard note, also calculating how many cents sharp or flat the frequency is compared to that standard pitch.
- **From Pitch Class & Octave:** Use the numerical pitch class (0-11, C=0) and octave number.
- **From Ratios (Just Intonation):** Create notes based on frequency ratios relative to a reference note (e.g., a perfect fifth using a 3/2 ratio).
- **From Quarter-Tone Index:** Directly create notes within a 24-tone equal temperament system.

## Working with Pitch

Once you have a Note object, you can easily work with its pitch information:

- Get the standard **MIDI number**.
- Calculate the precise **frequency** in Hertz (based on A4=440Hz by default, but adjustable).
- **Compare** notes to see if they represent the same pitch (e.g., is B#3 the same pitch as C4?), optionally within a microtonal tolerance.

## Transposition

Moving notes around is fundamental:

- **Transpose by Semitones:** Shift notes up or down by standard 12-TET semitones (using `Interval` values).
- **Transpose by Cents:** Shift notes by precise microtonal amounts using cents values for fine-grained control.
- **Transpose by Octaves:** Easily move a note up or down by one or more full octaves while preserving its spelling.

## Spelling, Formatting, and Enharmonics

The library understands musical spelling:

- **Format Notes:** Convert Note objects back into standard string notation (like "Bb4" or "G#5"). Microtonal notations (like "C+4" for quarter-sharp) are also supported.
- **Enharmonic Respelling:** Change a note's spelling while keeping the same pitch (e.g., convert an F# note object to a Gb note object).
- **Strict Comparison:** Check if two notes are _exactly_ the same, including their spelling.

## Microtonal Capabilities

This module goes beyond standard tuning:

- **Cents Deviation:** Notes can store an explicit `cents` value representing their deviation from the nearest 12-TET pitch. Functions are provided to add/manipulate these cents values correctly, handling normalization across semitone boundaries.
- **Quarter-Tones:** Easily create notes that are a quarter-tone (+50 cents) or three-quarter-tone (+150 cents) sharp or flat using dedicated functions or microtonal modifiers. Convert existing notes to their nearest quarter-tone representation.
- **Just Intonation:** Create notes based on pure frequency ratios (e.g., "3/2", "5/4") relative to a tonic.
- **EDO Systems:** Generate tools for any Equal Division of the Octave (like 19-EDO, 31-EDO) to calculate intervals and transpose notes accurately within that system.
- **Custom Tunings:** Define your own tuning systems based on specific cents offsets for each scale degree relative to a tonic.
- **Microtonal Scales:** Generate scales using EDO, Just Intonation, or custom tuning definitions.

## Tuning Standards

While A4=440Hz is the default standard used for frequency calculations (defined in `A4_FREQUENCY`), you can easily work with other standards using the `retune` function. This function calculates the equivalent frequency and note representation if A4 were tuned differently (e.g., 432Hz).
