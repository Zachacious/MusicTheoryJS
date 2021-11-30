import ScaleInitializer from "./ScaleInitializer";
import {
   TONES_MAX,
   TONES_MIN,
   OCTAVE_MAX,
   OCTAVE_MIN,
} from "../Note/noteConstants";
import { getWholeToneFromName } from "../Semitone";
import Modifier, { parseModifier } from "../Modifier";
import wrap from "../utils/wrap";
import clamp from "../utils/clamp";
import ScaleTemplates from "./ScaleTemplates";

//**********************************************************
/**
 * Regex for matching note name, modifier, and octave
 */
//**********************************************************
const nameRegex = /([A-G])/g;
const modifierRegex = /(#|s|b)/g;
const octaveRegex = /([0-9]*)/g;
const scaleNameRegex = /([A-Z|a-z]*)/g;

//**********************************************************
/**
 * attempts to parse a note from a string
 */
//**********************************************************
const parseScale = (
   scale: string,
   supressWarning: boolean = false
): ScaleInitializer => {
   try {
      const result: ScaleInitializer = scaleLookup[scale];
      if (result) {
         return result;
      }

      if (!supressWarning)
         console.warn(
            `Ineffecient note string formatting - ${scale}. Get a performanc increase by using the format [A-G][#|s|b][0-9]`
         );
   } catch (err) {
      if (!supressWarning)
         console.warn(
            `Ineffecient note string formatting - ${scale}. Get a performanc increase by using the format [A-G][#|s|b][0-9]`
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

   if (scaleNameMatch) {
      const [sName] = scaleNameMatch;
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
         octave = clamp(parseInt(noteOctave), OCTAVE_MIN, OCTAVE_MAX);

      const templateIndex = Object.keys(ScaleTemplates).findIndex((template) =>
         template.toLowerCase().includes(scaleName.toLowerCase())
      );

      if (templateIndex === -1) {
         throw new Error(`Unable to find template for scale ${scaleName}`);
      }

      const template = ScaleTemplates[templateIndex];

      return {
         key: semitone,
         octave: octave,
         template: template,
      };
   }

   throw new Error(`Invalid Scale: ${scale}`);
};

//**********************************************************
/**
 * creates a lookup table for all notes formatted as [A-G][#|b|s][0-9]
 */
//**********************************************************
const createTable = (): { [key: string]: ScaleInitializer } => {
   const scaleTable: { [key: string]: ScaleInitializer } = {};

   const noteLetters = ["A", "B", "C", "D", "E", "F", "G"];
   const noteModifiers = ["b", "#", "s"];
   const templates = Object.keys(ScaleTemplates);

   for (const template of templates) {
      for (const noteLabel of noteLetters) {
         scaleTable[noteLabel + template] = parseScale(noteLabel, true); // 'C' for example
         for (
            let iModifierOuter = 0;
            iModifierOuter < noteModifiers.length;
            ++iModifierOuter
         ) {
            const key = `${noteLabel}${noteModifiers[iModifierOuter]}${template}`;
            scaleTable[key] = parseScale(key, true); // 'C#' for example
         }
         for (let iOctave = OCTAVE_MIN; iOctave < OCTAVE_MAX; ++iOctave) {
            const key = `${noteLabel}${iOctave}${template}`;
            scaleTable[key] = parseScale(key, true); // 'C4' for example
            for (
               let iModifier = 0;
               iModifier < noteModifiers.length;
               ++iModifier
            ) {
               const key = `${noteLabel}${noteModifiers[iModifier]}${iOctave}${template}`;
               scaleTable[key] = parseScale(key, true); // 'C#4' for example
            }
         }
      }
   }

   return scaleTable;
};

//**********************************************************
/**
 * creates the lookup table as soon as the module is loaded
 */
//**********************************************************
const scaleLookup: { [key: string]: ScaleInitializer } = createTable();

export default parseScale;
