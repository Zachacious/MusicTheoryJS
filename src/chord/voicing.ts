/**
 * Chord voicings — the same chord tones arranged across octaves.
 *
 * Each function takes a {@link Chord} and returns its notes as a re-octaved,
 * ascending {@link Note} array. Spelling is preserved; only octaves change.
 */

import type { Note } from "../note/note";
import type { Chord } from "./chord";

function ascending(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => a.compareTo(b));
}

/** Close position: chord tones stacked as tightly as possible (the default). */
export function closeVoicing(chord: Chord): Note[] {
  return ascending(chord.notes);
}

/**
 * Drop-2: take the close voicing and drop the second-from-top voice down an
 * octave. A staple of jazz guitar/piano voicings.
 */
export function drop2(chord: Chord): Note[] {
  const notes = ascending(chord.notes);
  if (notes.length < 2) return notes;
  const idx = notes.length - 2;
  const voice = notes[idx] as Note;
  notes[idx] = voice.withOctave(voice.octave - 1);
  return ascending(notes);
}

/** Drop-3: drop the third-from-top voice down an octave. */
export function drop3(chord: Chord): Note[] {
  const notes = ascending(chord.notes);
  if (notes.length < 3) return notes;
  const idx = notes.length - 3;
  const voice = notes[idx] as Note;
  notes[idx] = voice.withOctave(voice.octave - 1);
  return ascending(notes);
}

/**
 * Spread (open) voicing: place each successive chord tone in the next octave
 * up, widening the chord.
 */
export function spread(chord: Chord): Note[] {
  const notes = ascending(chord.notes);
  let octaveBump = 0;
  return notes.map((n, i) => {
    if (i > 0) octaveBump += 1;
    return octaveBump === 0 ? n : n.withOctave(n.octave + octaveBump);
  });
}
