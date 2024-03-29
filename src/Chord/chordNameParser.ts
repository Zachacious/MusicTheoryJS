import {
   TONES_MAX,
   TONES_MIN,
   OCTAVE_MAX,
   OCTAVE_MIN,
} from "../Note/noteConstants";
import { getWholeToneFromName } from "../Semitone";
import { parseModifier } from "../Modifier";
import wrap from "../utils/wrap";
import clamp from "../utils/clamp";
import ChordInterval from "./ChordInterval";
import ChordTemplates from "./chordTemplates";
import ChordInitializer from "./ChordInitializer";
// import table from "./noteLookup.json";

/**
 * Regex for matching note name, modifier, and octave
 */
const nameRegex = /([A-G])(?=[^(]*\))/g;
const modifierRegex = /(#|s|b)(?=[^(]*\))/g;
const octaveRegex = /([0-9]+)(?=[^(]*\))/g;
const chordNameRegex = /(min|maj|dim|aug)(?![^(]*\))/g;
const additionsRegex = /([#|s|b]?[0-9]+)(?![^(]*\))/g;

/**
 * @param chord the string to parse
 * @returns a valid ChordInitializer
 * @internal
 */
const parseChord = (chord: string): ChordInitializer => {
   try {
      const result: ChordInitializer = chordLookup(chord);
      if (result) {
         return result;
      }
   } catch {
      // do nothing
   }

   let noteIdenifier: string = "";
   let noteModifier: number = 0;
   let noteOctave: string = "";
   let chordName: string = "maj";
   let additions: string[] = [];

   const nameMatch = chord.match(nameRegex)?.join("").split("");
   const modifierMatch = chord.match(modifierRegex)?.join("").split("");
   const octaveMatch = chord.match(octaveRegex)?.join("").split("");
   const chordNameMatch = chord.match(chordNameRegex)?.join("");
   const additionsMatch = chord.match(additionsRegex)?.join("").split("");

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

   if (chordNameMatch) {
      // const [name] = chordNameMatch;
      chordName = chordNameMatch;
   }

   if (additionsMatch) {
      additions = additionsMatch;
   }

   const intervals: ChordInterval[] = [];

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

      intervals.push(...ChordTemplates[chordName]);

      for (const addition of additions) {
         let mod = 0;
         if (addition[0] === "#" || addition[0] === "s") {
            mod = 1;
            additions.shift();
         } else if (addition[0] === "b") {
            mod = -1;
            additions.shift();
         }

         const additionNum = parseInt(addition, 10);

         if (intervals.includes(additionNum)) {
            const index = intervals.indexOf(additionNum);
            intervals[index] = [additionNum, mod];
         } else {
            intervals.push([additionNum, mod]);
         }
      }

      return {
         root: semitone,
         octave: octave,
         template: intervals,
      };
   }

   throw new Error("Invalid chord name");
};

/**
 * @returns a lookup table of chord names and their initializers
 * @internal
 */
const createTable = (): { [key: string]: ChordInitializer } => {
   const table: { [key: string]: ChordInitializer } = {};

   const noteLetters = ["A", "B", "C", "D", "E", "F", "G"];
   const noteModifiers = ["b", "#", "s"];
   const qualities = ["maj", "min", "dim", "aug", "sus"];
   const additions = [
      "",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "9",
      "11",
      "13",
      "b2",
      "b3",
      "b4",
      "b5",
      "b6",
      "b7",
      "b9",
      "b11",
      "b13",
      "s2",
      "s3",
      "s4",
      "s5",
      "s6",
      "s7",
      "s9",
      "s11",
      "s13",
      "#2",
      "#3",
      "#4",
      "#5",
      "#6",
      "#7",
      "#9",
      "#11",
      "#13",
      "7s11",
      "7#11",
      "7b9",
      "7#9",
      "7b5",
      "7#5",
      "7b9b5",
      "7#9#5",
      "7b13",
      "7#13",
      "9#5",
      "9b5",
      "9#11",
      "9b11",
      "9#13",
      "9b13",
      "11#5",
      "11b5",
      "11#9",
      "11b9",
      "11#13",
      "11b13",
   ];

   for (const quality of qualities) {
      for (const addition of additions) {
         for (const noteLetter of noteLetters) {
            const key = `(${noteLetter})${quality}${addition}`;
            table[key] = parseChord(key);
            for (const noteModifier of noteModifiers) {
               const key = `(${noteLetter}${noteModifier})${quality}${addition}`;
               table[key] = parseChord(key);
               for (let i = OCTAVE_MIN; i <= OCTAVE_MAX; i++) {
                  const key = `(${noteLetter}${noteModifier}${i})${quality}${addition}`;
                  table[key] = parseChord(key);
               }
            }
         }
      }
   }

   return table;
};

let _chordLookup: { [key: string]: ChordInitializer } = {};

/**
 * @param key the string to lookup
 * @returns a valid chord initializer
 * @throws an error if the key is not a valid chord
 * @internal
 */
const chordLookup = (key: string): ChordInitializer => {
   // buildChordTable();
   return _chordLookup[key];
};

// registerInitializer(() => {
//    _chordLookup = createTable();
// });

// if (table && Object.keys(table).length > 0) {
//    _chordLookup = table as { [key: string]: ChordInitializer };
// } else {
//    _chordLookup = createTable();
// }

const buildChordTable = (): { [key: string]: ChordInitializer } => {
   // if (Object.entries(_chordLookup).length > 0) return _chordLookup;
   _chordLookup = createTable();
   Object.freeze(_chordLookup);
   console.log("built chord table");
   // console.log(Object.entries(_chordLookup).length);
   return _chordLookup;
};

// save the lookup table to file

// import("fs")
//    .then((fs) => {
//       if (process?.env?.GENTABLES ?? false) {
//          try {
//             if (!_chordLookup) _chordLookup = createTable();
//             fs.writeFileSync(
//                "./src/Chord/noteLookup.json",
//                JSON.stringify(_chordLookup)
//             );
//          } catch (err) {
//             console.warn(err);
//          }
//       }
//    })
//    .catch(() => {
//       console.log("Not running from NODE - This is fine");
//    });

export default parseChord;
export { buildChordTable };
