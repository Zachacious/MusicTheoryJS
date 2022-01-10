import ScaleInitializer from "./ScaleInitializer";
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
import ScaleTemplates from "./ScaleTemplates";
import table from "./noteLookup.json";

/**
 * Regex for matching note name, modifier, and octave
 */
const nameRegex = /([A-G])(?![^(]*\))/g;
const modifierRegex = /(#|s|b)(?![^(]*\))/g;
const octaveRegex = /([0-9]+)(?![^(]*\))/g;
const scaleNameRegex = /(\([a-zA-Z]{2,}\))/g;

/**
 * attempts to parse a note from a string
 * @param scale - the string to parse
 * @param supressWarning - supress the warning for ineffeciency if true
 * @internal
 */
const parseScale = (
   scale: string,
   supressWarning: boolean = false
): ScaleInitializer => {
   try {
      const result: ScaleInitializer = scaleLookup(scale);
      if (result) {
         return result;
      }

      if (!supressWarning)
         console.warn(
            `Ineffecient scale string formatting - ${scale}. Get a performanc increase by using a valid format`
         );
   } catch (err) {
      if (!supressWarning)
         console.warn(
            `Ineffecient scale string formatting - ${scale}. Get a performanc increase by using a valid format`
         );
   }

   let noteIdenifier: string = "";
   let noteModifier: number = 0;
   let noteOctave: string = "";
   let scaleName: string = "";

   const nameMatch = scale.match(nameRegex)?.join("").split("");
   const modifierMatch = scale.match(modifierRegex)?.join("").split("");
   const octaveMatch = scale.match(octaveRegex)?.join("").split("");
   const scaleNameMatch = scale.match(scaleNameRegex)?.join("").split("");

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

   if (scaleNameMatch) {
      const sName = scaleNameMatch.join("");

      // console.log(sName);
      scaleName = sName;
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

      let templateIndex: number = 1; // default major scale

      if (scaleName) {
         templateIndex = Object.keys(ScaleTemplates).findIndex((template) =>
            template
               .toLowerCase()
               .includes(scaleName.toLowerCase().replace(/\(|\)/g, ""))
         );
      }
      // console.log(Object.keys(ScaleTemplates)[templateIndex]);

      if (templateIndex === -1) {
         console.log("UNKNOWN TEMPLATE", scaleName);
         throw new Error(`Unable to find template for scale ${scaleName}`);
      }

      const template =
         ScaleTemplates[Object.keys(ScaleTemplates)[templateIndex]];

      return {
         key: semitone,
         octave: octave,
         template: template,
      };
   }

   throw new Error(`Invalid Scale: ${scale}`);
};

/**
 * creates a lookup table for all notes formatted as [A-G][#|b|s][0-9]
 * @internal
 */
const createTable = (): { [key: string]: ScaleInitializer } => {
   const scaleTable: { [key: string]: ScaleInitializer } = {};

   const noteLetters = ["A", "B", "C", "D", "E", "F", "G"];
   const noteModifiers = ["b", "#", "s"];
   const templates = Object.keys(ScaleTemplates);

   for (const template of templates) {
      for (const noteLabel of noteLetters) {
         //ex A(minor)
         scaleTable[`${noteLabel}(${template})`] = parseScale(noteLabel, true); // 'C' for example

         for (const mod of noteModifiers) {
            const key = `${noteLabel}${mod}(${template})`;
            // ex A#(minor)
            scaleTable[key] = parseScale(key, true); // 'C#' for example
         }
         for (let iOctave = OCTAVE_MIN; iOctave < OCTAVE_MAX; ++iOctave) {
            const key = `${noteLabel}${iOctave}(${template})`;
            // ex A4(minor)
            scaleTable[key] = parseScale(key, true); // 'C4' for example

            for (const mod of noteModifiers) {
               const key = `${noteLabel}${mod}${iOctave}(${template})`;
               // ex A#4(minor)
               scaleTable[key] = parseScale(key, true); // 'C#4' for example
            }
         }
      }
   }

   return scaleTable;
};

/**
 * creates the lookup table as soon as the module is loaded
 * @internal
 */
let _scaleLookup: { [key: string]: ScaleInitializer } = {};

const scaleLookup = (key: string): ScaleInitializer => {
   if (!_scaleLookup) {
      _scaleLookup = createTable();
   }

   return _scaleLookup[key];
};

// if (table && Object.keys(table).length > 0) {
//    _scaleLookup = table as { [key: string]: ScaleInitializer };
// } else {
//    _scaleLookup = createTable();
// }

const buildScaleTable = (): { [key: string]: ScaleInitializer } =>
   (_scaleLookup = createTable());

// save the lookup table to file

// import("fs")
//    .then((fs) => {
//       if (process?.env?.GENTABLES ?? false) {
//          try {
//             if (!_scaleLookup) _scaleLookup = createTable();
//             fs.writeFileSync(
//                "./src/Scale/noteStringLookup.json",
//                JSON.stringify(_scaleLookup)
//             );
//          } catch (err) {
//             console.warn(err);
//          }
//       }
//    })
//    .catch(() => {
//       console.log("Not running from NODE - This is fine");
//    });

export default parseScale;
export { buildScaleTable };
