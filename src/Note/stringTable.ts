import {
   MODIFIED_SEMITONES,
   TONES_MAX,
   TONES_MIN,
   OCTAVE_MAX,
   OCTAVE_MIN,
} from "./noteConstants";
import Semitone from "../Semitone";
import wrap from "../utils/wrap";
import { registerInitializer } from "../Initializer/Initializer";
import table from "./noteStringLookup.json";

const UNKNOWN_MODIFIER_NOTE_STRINGS: Array<string> = [
   "C",
   "C#/Db",
   "D",
   "D#/Eb",
   "E",
   "F",
   "F#/Gb",
   "G",
   "G#/Ab",
   "A",
   "A#/Bb",
   "B",
];

const SHARP_NOTE_STRINGS: Array<string> = [
   "C",
   "C#",
   "D",
   "D#",
   "E",
   "F",
   "F#",
   "G",
   "G#",
   "A",
   "A#",
   "B",
];

const FLAT_MODIFIER_NOTE_STRINGS: Array<string> = [
   "C",
   "Db",
   "D",
   "Eb",
   "E",
   "F",
   "Gb",
   "G",
   "Ab",
   "A",
   "Bb",
   "B",
];

const createTable = (): { [key: string]: string } => {
   const table: { [key: string]: string } = {};
   for (let iTone = TONES_MIN; iTone <= TONES_MAX; ++iTone) {
      for (let iPrev = TONES_MIN; iPrev <= TONES_MAX; ++iPrev) {
         // for (let iOctave = OCTAVE_MIN; iOctave <= OCTAVE_MAX; iOctave++) {
         let modifier = "";
         if (MODIFIED_SEMITONES.includes(iTone)) {
            modifier = "-"; // has an unknown modifier
            // if is flat
            if (wrap(iTone + 1, TONES_MIN, TONES_MAX).value === iPrev)
               modifier = "b";
            // is sharp
            if (wrap(iTone - 1, TONES_MIN, TONES_MAX).value === iPrev)
               modifier = "#";
         }

         // get note name from table
         table[`${iTone}-${iPrev}`] = getNoteLabel(iTone, modifier);
      }
      // }
   }
   return table;
};

const getNoteLabel = (tone: number, modifier: string): string => {
   switch (modifier) {
      case "#":
         return SHARP_NOTE_STRINGS[tone];
      case "b":
         return FLAT_MODIFIER_NOTE_STRINGS[tone];
      case "-":
      default:
         return UNKNOWN_MODIFIER_NOTE_STRINGS[tone];
   }
};

let _noteStringLookup: { [key: string]: string } = {};

const noteStringLookup = (key: string) => {
   if (!_noteStringLookup) {
      _noteStringLookup = createTable();
   }

   return _noteStringLookup[key];
};

// registerInitializer(() => {
//    _noteStringLookup = createTable();
// });

if (table && Object.keys(table).length > 0) {
   _noteStringLookup = table;
} else {
   _noteStringLookup = createTable();
}

// save the lookup table to file

import("fs")
   .then((fs) => {
      if (process?.env?.GENTABLES ?? false) {
         try {
            if (!_noteStringLookup) _noteStringLookup = createTable();
            fs.writeFileSync(
               "./src/Note/noteStringLookup.json",
               JSON.stringify(_noteStringLookup)
            );
         } catch (err) {
            console.warn(err);
         }
      }
   })
   .catch(() => {
      console.log("Not running from NODE - This is fine");
   });

export default noteStringLookup;
