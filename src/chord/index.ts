/**
 * @module chord
 * Chords: symbol tokenizer with the full jazz corpus, exactly spelled chord
 * tones, transposition, octave realization, and ranked detection (re-exported
 * from the dictionary engine). Unknown qualities throw with a suggestion —
 * there is no silent fallback to major.
 */

export {
  type Chord,
  chord,
  chordNotes,
  isChord,
  transposeChord,
  tryChord,
} from "./chord";
export {
  type ChordTokens,
  chordDisplayAlias,
  resolveChordQuality,
  suggestChordQuality,
  tokenizeChordSymbol,
} from "./symbols";
export {
  type ChordDetection,
  type DetectChordsOptions,
  detectChords,
  getChordType,
} from "../dict";
