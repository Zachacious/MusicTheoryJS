import { OCTAVE_MAX, OCTAVE_MIN, TONES_MIN } from "../Note/noteConstants";
import ScaleTemplates from "./ScaleTemplates";
import Scale from "./Scale";
import shift from "../utils/shift";

const wholeNotes = [
   "A",
   "B",
   "C",
   "D",
   "E",
   "F",
   "G",
   "A",
   "B",
   "C",
   "D",
   "E",
   "F",
   "G",
];

const removables = ["B#", "Bs", "Cb", "E#", "Es", "Fb"];

//**********************************************************
/**
 * attempts to lookup the note name for a scale efficiently
 */
//**********************************************************
const scaleNoteNameLookup = (scale: Scale, preferSharpKey: boolean = true) => {
   try {
      const key = `${scale.key}-${scale.octave}-${JSON.stringify(
         scale.template
      )}`;
      const notes = notesLookup[key];
      if (notes) {
         return notes;
      }
   } catch (e) {
      console.log(e);
   }

   let notes = [...scale.notes];
   notes = shift(notes, -scale.shiftedInterval()); //unshift back to key = 0 index

   const notesParts: string[][] = notes.map((note) =>
      note.toString().split("/")
   );

   const noteNames: Array<string> = [];
   for (const noteParts of notesParts) {
      //remove Cb B# etc
      for (const part of noteParts) {
         if (removables.includes(part)) {
            const index = noteNames.indexOf(part);
            noteNames.splice(index, 1);
         }
      }

      if (noteNames.length === 0) {
         noteNames.push(
            preferSharpKey ? noteParts[0] : noteParts[noteParts.length - 1]
         );
         continue;
      }

      if (noteParts.length === 1) {
         noteNames.push(noteParts[0]);
         continue;
      }

      const lastWholeNote = noteNames[noteNames.length - 1][0];
      const lastIndex = wholeNotes.indexOf(lastWholeNote);
      const nextNote = wholeNotes[lastIndex + 1];

      if (noteParts[0].includes(nextNote)) {
         noteNames.push(noteParts[0]);
         continue;
      }

      noteNames.push(noteParts[noteParts.length - 1]);
   }

   const shiftedNoteNames: string[] = shift(noteNames, scale.shiftedInterval());

   return shiftedNoteNames;
};

//**********************************************************
/**
 * creates a lookup table for all notes formatted as [A-G][#|b|s][0-9]
 */
//**********************************************************
const createTable = (): { [key: string]: string[] } => {
   const scaleTable: { [key: string]: string[] } = {};

   for (let itone = TONES_MIN; itone < TONES_MIN + OCTAVE_MAX; itone++) {
      for (let ioctave = OCTAVE_MIN; ioctave <= OCTAVE_MAX; ioctave++) {
         for (const template of Object.values(ScaleTemplates)) {
            const scale = new Scale({
               key: itone,
               template: template,
               octave: ioctave,
            });
            scaleTable[`${itone}-${ioctave}-${JSON.stringify(template)}`] =
               scaleNoteNameLookup(scale);
         }
      }
   }

   return scaleTable;
};
// const createTable = (): { [key: string]: string[] } => {
//    const scaleTable: { [key: string]: string[] } = {};

//    const noteLetters = ["A", "B", "C", "D", "E", "F", "G"];
//    const noteTones = [9, 11, 0, 2, 4, 5, 7];
//    const noteModifiers = ["b", "#", "s"];
//    const noteModValues = [-1, 1, 1];
//    const templates = Object.keys(ScaleTemplates);

//    for (const template of templates) {
//       for (const [index, noteLabel] of noteLetters.entries()) {
//          //ex A(minor)
//          const scale1 = new Scale({
//             key: noteTones[index],
//             template: ScaleTemplates[template],
//          });
//          scaleTable[`${noteLabel}(${template})`] = scaleNoteNameLookup(scale1); // 'C' for example

//          for (const [modIndex, mod] of noteModifiers.entries()) {
//             const scale2 = new Scale({
//                key: noteTones[index] + noteModValues[modIndex],
//                template: ScaleTemplates[template],
//             });
//             const key = `${noteLabel}${mod}(${template})`;
//             // ex A#(minor)
//             scaleTable[key] = scaleNoteNameLookup(scale2); // 'C#' for example
//          }
//          for (let iOctave = OCTAVE_MIN; iOctave < OCTAVE_MAX; ++iOctave) {
//             const scale3 = new Scale({
//                key: noteTones[index],
//                template: ScaleTemplates[template],
//                octave: iOctave,
//             });
//             const key = `${noteLabel}${iOctave}(${template})`;
//             // ex A4(minor)
//             scaleTable[key] = scaleNoteNameLookup(scale3); // 'C4' for example

//             for (const [modIndex, mod] of noteModifiers.entries()) {
//                const scale4 = new Scale({
//                   key: noteTones[index] + noteModValues[modIndex],
//                   template: ScaleTemplates[template],
//                   octave: iOctave,
//                });
//                const key = `${noteLabel}${mod}${iOctave}(${template})`;
//                // ex A#4(minor)
//                scaleTable[key] = scaleNoteNameLookup(scale4); // 'C#4' for example
//             }
//          }
//       }
//    }

//    return scaleTable;
// };

//**********************************************************
/**
 * creates the lookup table as soon as the module is loaded
 */
//**********************************************************
const notesLookup: { [key: string]: string[] } = createTable();
// console.log(scaleLookup);

export default scaleNoteNameLookup;
