import { NoteInitializer, TONES_MAX, TONES_MIN, OCTAVE_MAX, OCTAVE_MIN } from "../Note";
import { getWholeToneFromName } from "../Semitone";
import Modifier, { parseModifier } from "../Modifier";
import wrap from "./wrap";
import clamp from "./clamp";

//**********************************************************
/**
 * Regex for matching note name, modifier, and octave
 */
//**********************************************************
const nameRegex = /([A-G])/g;
const modifierRegex = /(#|s|b)/g;
const octaveRegex = /([0-9]*)/g;

//**********************************************************
/**
 * attempts to parse a note from a string
 */
//**********************************************************
const noteParser = (note: string, supressWarning: boolean = false): NoteInitializer => {
   try {
      const result: NoteInitializer = noteLookup[note];
      if (result) {
         return result;
      }

      if (!supressWarning)
         console.warn(
            `Ineffecient note string formatting - ${note}. Get a performanc increase by using the format [A-G][#|s|b][0-9]`
         );
   } catch (err) {
      if (!supressWarning)
         console.warn(
            `Ineffecient note string formatting - ${note}. Get a performanc increase by using the format [A-G][#|s|b][0-9]`
         );
   }

   let noteIdenifier: string = "";
   let noteModifier: number = 0;
   let noteOctave: string = "";

   const nameMatch = note.match(nameRegex)?.join("").split("");
   const modifierMatch = note.match(modifierRegex)?.join("").split("");
   const octaveMatch = note.match(octaveRegex)?.join("").split("");

   // combine all modifiers
   if (modifierMatch) {
      if (modifierMatch.length > 1) {
         // TS seams to confuse the types here so use any for now
         noteModifier = modifierMatch.reduce((acc: any, curr: any): any => {
            if (typeof acc === "string") acc = parseModifier(acc);
            const modifier: Modifier = parseModifier(curr);
            return (acc + modifier) as number;
         }) as unknown as number;
      } else {
         noteModifier = parseModifier(modifierMatch[0]);
      }
   }

   if (octaveMatch) {
      const [octave] = octaveMatch;
      noteOctave = octave;
   }

   if (nameMatch) {
      const [noteName] = nameMatch;
      noteIdenifier = noteName;

      let modifier: number = 0;
      if (noteModifier) modifier = noteModifier;

      const wrappedTone = wrap(getWholeToneFromName(noteIdenifier) + modifier, TONES_MIN, TONES_MAX);
      let semitone: number = wrappedTone.value;

      let octave: number = 4;
      if (noteOctave) octave = clamp(parseInt(noteOctave), OCTAVE_MIN, OCTAVE_MAX);

      return {
         semitone: semitone,
         octave: octave,
      };
   }

   throw new Error(`Invalid note: ${note}`);
};

//**********************************************************
/**
 * creates a lookup table for all notes formatted as [A-G][#|b|s][0-9]
 */
//**********************************************************
const createTable = (): { [key: string]: NoteInitializer } => {
   const noteTable: { [key: string]: NoteInitializer } = {};

   const noteLetters = ["A", "B", "C", "D", "E", "F", "G"];
   const noteModifiers = ["b", "#", "s"];

   for (const noteLabel of noteLetters) {
      noteTable[noteLabel] = noteParser(noteLabel, true); // 'C' for example
      for (let iModifierOuter = 0; iModifierOuter < noteModifiers.length; ++iModifierOuter) {
         const key = `${noteLabel}${noteModifiers[iModifierOuter]}`;
         noteTable[key] = noteParser(key, true); // 'C#' for example
      }
      for (let iOctave = OCTAVE_MIN; iOctave < OCTAVE_MAX; ++iOctave) {
         const key = `${noteLabel}${iOctave}`;
         noteTable[key] = noteParser(key, true); // 'C4' for example
         for (let iModifier = 0; iModifier < noteModifiers.length; ++iModifier) {
            const key = `${noteLabel}${noteModifiers[iModifier]}${iOctave}`;
            noteTable[key] = noteParser(key, true); // 'C#4' for example
         }
      }
   }

   return noteTable;
};

//**********************************************************
/**
 * creates the lookup table as soon as the module is loaded
 */
//**********************************************************
const noteLookup: { [key: string]: NoteInitializer } = createTable();
console.log(noteLookup);

export default noteParser;
