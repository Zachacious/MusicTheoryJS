import NoteInitializer from "./NoteInitializer";
import { TONES_MAX, TONES_MIN, OCTAVE_MAX, OCTAVE_MIN } from "./noteConstants";
import { getWholeToneFromName } from "../Semitone";
import { parseModifier } from "../Modifier";
import wrap from "../utils/wrap";
import clamp from "../utils/clamp";
// import { registerInitializer } from "../Initializer/Initializer";
// import table from "./noteLookup.json";
// import fs from "fs";

//**********************************************************
/**
 * Regex for matching note name, modifier, and octave
 */
//**********************************************************
const nameRegex = /([A-G])/g;
const modifierRegex = /(#|s|b)/g;
const octaveRegex = /([0-9]+)/g;

//**********************************************************
/**
 * attempts to parse a note from a string
 */
//**********************************************************
const parseNote = (
   note: string,
   supressWarning: boolean = false
): NoteInitializer => {
   try {
      const result: NoteInitializer = noteLookup(note);
      if (result) {
         return result;
      }

      if (!supressWarning)
         console.warn(
            `Ineffecient note string formatting - ${note}. Get a performance increase by using the format [A-G][#|s|b][0-9] and using buildTables method(see documentation)`
         );
   } catch (err) {
      if (!supressWarning)
         console.warn(
            `Ineffecient note string formatting - ${note}. Get a performance increase by using the format [A-G][#|s|b][0-9] and using buildTables method(see documentation)`
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
         // combine all modifiers into an offeset value to be added to the semitone
         noteModifier = modifierMatch
            .map((item: string): number => parseModifier(item) as number)
            .reduce((a: number, b: number): number => a + b);
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

      const wrappedTone = wrap(
         getWholeToneFromName(noteIdenifier) + modifier,
         TONES_MIN,
         TONES_MAX
      );
      const semitone: number = wrappedTone.value;

      let octave: number = 4;
      if (noteOctave)
         octave = clamp(parseInt(noteOctave, 10), OCTAVE_MIN, OCTAVE_MAX);

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
      noteTable[noteLabel] = parseNote(noteLabel, true); // 'C' for example
      for (
         let iModifierOuter = 0;
         iModifierOuter < noteModifiers.length;
         ++iModifierOuter
      ) {
         const key = `${noteLabel}${noteModifiers[iModifierOuter]}`;
         noteTable[key] = parseNote(key, true); // 'C#' for example
      }
      for (let iOctave = OCTAVE_MIN; iOctave < OCTAVE_MAX; ++iOctave) {
         const key = `${noteLabel}${iOctave}`;
         noteTable[key] = parseNote(key, true); // 'C4' for example
         for (
            let iModifier = 0;
            iModifier < noteModifiers.length;
            ++iModifier
         ) {
            const key = `${noteLabel}${noteModifiers[iModifier]}${iOctave}`;
            noteTable[key] = parseNote(key, true); // 'C#4' for example
         }
      }
   }

   return noteTable;
};

/**
 * The lookup table
 */
let _noteLookup: { [key: string]: NoteInitializer } = {};

const noteLookup = (key: string) => {
   // buildNoteTable();
   return _noteLookup[key];
};

// registerInitializer(() => {
//    _noteLookup = createTable();
// });

// if (table && Object.keys(table).length > 0) {
//    _noteLookup = table;
// } else {
//    _noteLookup = createTable();
// }

const buildNoteTable = (): { [key: string]: NoteInitializer } => {
   _noteLookup = createTable();
   Object.freeze(_noteLookup);
   console.log("built note table");
   return _noteLookup;
};

// save the lookup table to file

// import("fs")
//    .then((fs) => {
//       if (process?.env?.GENTABLES ?? false) {
//          try {
//             if (!_noteLookup) _noteLookup = createTable();
//             fs.writeFileSync(
//                "./src/Note/noteLookup.json",
//                JSON.stringify(_noteLookup)
//             );
//          } catch (err) {
//             console.warn(err);
//          }
//       }
//    })
//    .catch(() => {
//       console.log("Not running from NODE - This is fine");
//    });

export default parseNote;
export { buildNoteTable };
