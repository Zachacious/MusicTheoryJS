import Semitone from "../Semitone";
import wrap from "../utils/wrap";
import clamp from "../utils/clamp";
import {
   TONES_MAX,
   TONES_MIN,
   OCTAVE_MAX,
   OCTAVE_MIN,
   DEFAULT_OCTAVE,
   DEFAULT_SEMITONE,
} from "../Note/noteConstants";
import { DEFAULT_SCALE_TEMPLATE } from "./scaleConstants";
import ScaleInitializer from "./ScaleInitializer";
import Note from "../Note/Note";
import ScaleTemplates from "./ScaleTemplates";
import { uid } from "uid";

import Entity from "../Entity";
import parseScale from "./scaleParser";
import shift from "../utils/shift";
import clone from "../utils/clone";
import isEqual from "../utils/isEqual";
import scaleNameLookup from "./scaleNameLookup";
import table from "./noteLookup.json";

/**
 * Scales consist of a key(tonic or root) and a template(array of integers) that
 * <br> represents the interval of steps between each note.
 * <br><br>Scale intervals are represented by an integer
 * <br>that is the number of semitones between each note.
 * <br>0 = key - will always represent the tonic
 * <br>1 = half step
 * <br>2 = whole step
 * <br>3 = one and one half steps
 * <br>4 = double step
 * <br>[0, 2, 2, 1, 2, 2, 2] represents the major scale
 * <br><br> Scale templates may have arbitray lengths
 *
 * The following Pre-defined templates are available:
 * <table>
 * <tr>
 * <td>major</td>
 * <td>minor</td>
 * <td>ionian</td>
 * <td>dorian</td>
 * </tr><tr>
 * <td>phrygian</td>
 * <td>lydian</td>
 * <td>mixolydian</td>
 * <td>aeolian</td>
 * </tr><tr>
 * <td>locrian</td>
 * <td>enigmaticMajor</td>
 * <td>enigmaticMinor</td>
 * <td>minor7b5</td>
 * </tr><tr>
 * <td>major7s4s5</td>
 * <td>harmonicMajor</td>
 * <td>harmonicMinor</td>
 * <td>doubleHarmonic</td>
 * </tr><tr>
 * <td>melodicMinorAscending</td>
 * <td>melodicMinorDescending</td>
 * <td>majorPentatonic</td>
 * <td>majorPentatonicBlues</td>
 * </tr><tr>
 * <td>minorPentatonic</td>
 * <td>minorPentatonicBlues</td>
 * <td>b5Pentatonic</td>
 * <td>minor6Pentatonic</td>
 * </tr><tr>
 * <td>dim8Tone</td>
 * <td>dom8Tone</td>
 * <td>neopolitanMajor</td>
 * <td>neopolitanMinor</td>
 * </tr><tr>
 * <td>hungarianMajor</td>
 * <td>hungarianMinor</td>
 * <td>hungarianGypsy</td>
 * <td>spanish</td>
 * </tr><tr>
 * <td>spanish8Tone</td>
 * <td>spanishGypsy</td>
 * <td>augmented</td>
 * <td>dominantSuspended</td>
 * </tr><tr>
 * <td>bebopMajor</td>
 * <td>bebopDominant</td>
 * <td>mystic</td>
 * <td>overtone</td>
 * </tr><tr>
 * <td>leadingTone</td>
 * <td>hirojoshi</td>
 * <td>japaneseA</td>
 * <td>japaneseB</td>
 * </tr><tr>
 * <td>oriental</td>
 * <td>arabian</td>
 * <td>persian</td>
 * <td>balinese</td>
 * </tr><tr>
 * <td>kumoi</td>
 * <td>pelog</td>
 * <td>algerian</td>
 * <td>chinese</td>
 * </tr><tr>
 * <td>mongolian</td>
 * <td>egyptian</td>
 * <td>hindu</td>
 * <td>romanian</td>
 * </tr><tr>
 * <td>hindu</td>
 * <td>insen</td>
 * <td>iwato</td>
 * <td>scottish</td>
 * </tr><tr>
 * <td>yo</td>
 * <td>istrian</td>
 * <td>ukranianDorian</td>
 * <td>petrushka</td>
 * </tr><tr>
 * <td>ahavaraba</td>
 * <td>halfDiminished</td>
 * <td>jewish</td>
 * <td>byzantine</td>
 * </tr><tr>
 * <td>acoustic</td>
 * </table>
 *
 * @example
 * ```javascript
 * import {Scale} from 'musictheoryjs';
 * import {ScaleTemplates} from 'musictheoryjs';
 * import {ScaleInitializer} from 'musictheoryjs'; // TypeScript only if needed
 * ```
 */
class Scale implements Entity {
   /**
    * @example
    * ```javascript
    * import {Scale, ScaleTemplates} from 'musictheoryjs';
    *
    * // creates a scale with the default template, key 0f 0(C) and an octave of 4
    * const scale = new Scale();
    *
    * // creates a scale with the template [0, 2, 2, 1, 2, 2, 2] and key 4(E) and octave 5
    * const scale2 = new Scale({key: 4, octave: 5, template: ScaleTemplates.major});
    *
    *
    * // String parsing should follow the format: note-name[alteration][octave][(scale-name)]
    * // creates a scale with the minor template, key Gb and an octave of 7
    * const scale3 = new Scale('Gb7(minor)');
    * ```
    */
   constructor(values?: ScaleInitializer | string) {
      if (!values) {
         this.template = DEFAULT_SCALE_TEMPLATE;
         this.key = DEFAULT_SEMITONE;
         this.octave = DEFAULT_OCTAVE;
      } else if (typeof values === "string") {
         values = parseScale(values);
         this.template = [...(values?.template ?? DEFAULT_SCALE_TEMPLATE)];
         this.key = values.key || DEFAULT_SEMITONE;
         this.octave = values.octave || DEFAULT_OCTAVE;
      } else {
         // important that octave is set first so that
         // setting the semitone can change the octave
         this.template = [...(values?.template ?? DEFAULT_SCALE_TEMPLATE)];
         this.key = values.key || DEFAULT_SEMITONE;
         this.octave = values.octave || DEFAULT_OCTAVE;
      }

      this._notesDirty = true;
   }

   /**
    *  unique id for this scale(auto generated)
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.id); // dhlkj5j322
    * ```
    */
   id: string = uid();

   /**
    * Returns true if this scale is equal to the given scale
    * @param scale - the scale to compare to
    * @returns true if the scales are equal
    * @example
    * ```javascript
    * const scale = new Scale();
    * const scale2 = new Scale();
    * console.log(scale.equals(scale2)); // true
    * ```
    */
   public equals(scale: Scale): boolean {
      return (
         this._key === scale._key &&
         this._octave === scale._octave &&
         isEqual(this._template, scale._template)
      );
   }

   /**
    * Returns a copy of this Scale
    * @chainable
    * @returns a copy of this Scale
    * @example
    * ```javascript
    * const scale = new Scale();
    * const scale2 = scale.copy();
    * console.log(scale.equals(scale2)); // true
    * ```
    */
   public copy(): Scale {
      const scale: Scale = new Scale({
         key: this.key,
         octave: this.octave,
         template: clone(this.template),
      });
      if (this._shiftedInterval !== 0) scale.shift(this._shiftedInterval);
      return scale;
   }

   /**
    * key
    */
   protected _key: Semitone = 0;
   /**
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.key); // 0(semitone)
    * ```
    */
   public get key(): Semitone {
      return this._key;
   }

   /**
    * Setting the semitone to a value outside of the range [0, 11](semitone) will<br/>
    * wrap the semitone to the range [0, 11] and change the octave depending<br/>
    * on how many times the semitone has been wrapped.
    * @example
    * ```javascript
    * const scale = new Scale();
    * scale.key = 4;
    * console.log(scale.key); // 4
    * ```
    */
   public set key(value: Semitone) {
      const wrapped = wrap(value, TONES_MIN, TONES_MAX);
      this.octave = this.octave + wrapped.numWraps;
      this._key = wrapped.value;
      this._notesDirty = true;
   }

   /**
    * octave
    */
   protected _octave: number = DEFAULT_OCTAVE;
   /**
    * The octave is clamped to the range [0, 9].
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.octave); // 4
    * ```
    */
   public get octave(): number {
      return this._octave;
   }

   /**
    * @example
    * ```javascript
    * const scale = new Scale();
    * scale.octave = 5;
    * console.log(scale.octave); // 5
    * ```
    */
   public set octave(value: number) {
      this._octave = clamp(value, OCTAVE_MIN, OCTAVE_MAX);
      this._notesDirty = true;
   }

   /**
    * template
    */
   protected _template: Array<number> = [];
   /**
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.template); // [0, 2, 2, 1, 2, 2, 2]
    * ```
    */
   public get template(): Array<number> {
      return clone(this._template);
   }

   /**
    * The following Pre-defined templates are available:
    * <table>
    * <tr>
    * <td>major</td>
    * <td>minor</td>
    * <td>ionian</td>
    * <td>dorian</td>
    * </tr><tr>
    * <td>phrygian</td>
    * <td>lydian</td>
    * <td>mixolydian</td>
    * <td>aeolian</td>
    * </tr><tr>
    * <td>locrian</td>
    * <td>enigmaticMajor</td>
    * <td>enigmaticMinor</td>
    * <td>minor7b5</td>
    * </tr><tr>
    * <td>major7s4s5</td>
    * <td>harmonicMajor</td>
    * <td>harmonicMinor</td>
    * <td>doubleHarmonic</td>
    * </tr><tr>
    * <td>melodicMinorAscending</td>
    * <td>melodicMinorDescending</td>
    * <td>majorPentatonic</td>
    * <td>majorPentatonicBlues</td>
    * </tr><tr>
    * <td>minorPentatonic</td>
    * <td>minorPentatonicBlues</td>
    * <td>b5Pentatonic</td>
    * <td>minor6Pentatonic</td>
    * </tr><tr>
    * <td>dim8Tone</td>
    * <td>dom8Tone</td>
    * <td>neopolitanMajor</td>
    * <td>neopolitanMinor</td>
    * </tr><tr>
    * <td>hungarianMajor</td>
    * <td>hungarianMinor</td>
    * <td>hungarianGypsy</td>
    * <td>spanish</td>
    * </tr><tr>
    * <td>spanish8Tone</td>
    * <td>spanishGypsy</td>
    * <td>augmented</td>
    * <td>dominantSuspended</td>
    * </tr><tr>
    * <td>bebopMajor</td>
    * <td>bebopDominant</td>
    * <td>mystic</td>
    * <td>overtone</td>
    * </tr><tr>
    * <td>leadingTone</td>
    * <td>hirojoshi</td>
    * <td>japaneseA</td>
    * <td>japaneseB</td>
    * </tr><tr>
    * <td>oriental</td>
    * <td>arabian</td>
    * <td>persian</td>
    * <td>balinese</td>
    * </tr><tr>
    * <td>kumoi</td>
    * <td>pelog</td>
    * <td>algerian</td>
    * <td>chinese</td>
    * </tr><tr>
    * <td>mongolian</td>
    * <td>egyptian</td>
    * <td>hindu</td>
    * <td>romanian</td>
    * </tr><tr>
    * <td>hindu</td>
    * <td>insen</td>
    * <td>iwato</td>
    * <td>scottish</td>
    * </tr><tr>
    * <td>yo</td>
    * <td>istrian</td>
    * <td>ukranianDorian</td>
    * <td>petrushka</td>
    * </tr><tr>
    * <td>ahavaraba</td>
    * <td>halfDiminished</td>
    * <td>jewish</td>
    * <td>byzantine</td>
    * </tr><tr>
    * <td>acoustic</td>
    * </table>
    * @example
    * ```javascript
    * const scale = new Scale();
    * scale.template = [0, 2, 2, 1, 2, 2, 2];
    * console.log(scale.template); // [0, 2, 2, 1, 2, 2, 2]
    * ```
    */
   public set template(value: Array<number>) {
      this._template = clone(value);
      this._shiftedInterval = 0;
      this._notesDirty = true;
   }

   /**
    * notes
    * notes are generated and cached as needed
    */
   protected _notes: Array<Note> = [];
   protected _notesDirty: boolean = true;

   /**
    * will generate the notes if needed or return the cached notes
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.notes); // List of notes
    * ```
    */
   public get notes(): Array<Note> {
      if (this._notesDirty) {
         this.generateNotes();
         this._notesDirty = false;
      }
      return this._notes;
   }

   /**
    * generate notes(internal)
    * generates the notes for this scale
    */
   protected generateNotes(): void {
      // use the template unshifted for simplicity
      const unshiftedTemplate = shift(
         this._template as number[],
         -this._shiftedInterval
      );

      // if allowing this to change the octave is undesirable
      // then may need to pre wrap the tone and use
      // the final value
      const notes: Note[] = [];
      let accumulator: number = this.key;
      for (const interval of unshiftedTemplate) {
         const tone =
            interval === 0
               ? (accumulator = this.key)
               : (accumulator += interval);

         const note = new Note({
            semitone: tone,
            octave: this.octave,
         });
         notes.push(note);
      }

      // shift notes back to original position
      if (this._shiftedInterval > 0) {
         const temp: Note[] = notes.splice(
            notes.length - (this._shiftedInterval + 1),
            Infinity
         );

         notes.unshift(...temp);
      }

      if (this._shiftedInterval < 0) {
         const temp: Note[] = notes.splice(0, this._shiftedInterval);
         notes.push(...temp);
      }

      this._notes = notes;
   }

   /**
    * returns the names of the notes in the scale
    * @param preferSharpKeys - if true then sharps will be preferred over flats when semitones could be either - ex: Bb/A#
    * @returns the names of the notes in the scale
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.names); // ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']
    * ```
    */
   public getNoteNames(preferSharpKey = true): string[] {
      const names: string[] = scaleNoteNameLookup(this, preferSharpKey);
      return names;
   }

   /**
    * degree
    * returns a note that represents the given degree
    * @param degree - the degree to return
    * @returns a note that represents the given degree
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.degree(0)); // C4(Note)
    * console.log(scale.degree(1)); // D4(Note) etc
    * ```
    */
   public degree(degree: number): Note {
      const wrapped = wrap(
         degree - 1 /*zero index */,
         0,
         this.notes.length - 1
      );
      const note = this.notes[wrapped.value].copy();
      note.octave = this.octave + wrapped.numWraps;
      return note;
   }

   /**
    * relative major
    * returns a new scale that is the relative major of this scale - takes the 3rd degree as it's key
    * @chainable
    * @returns a new scale that is the relative major of this scale
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.relativeMajor()); // Scale
    * ```
    */
   public relativeMajor(): Scale {
      const major = new Scale({
         template: ScaleTemplates.major,
         key: this.degree(3).semitone,
         octave: this.octave,
      });
      return major;
   }

   /**
    * relative minor
    * returns a new scale that is the relative minor of this scale - takes the 6th degree as it's key
    * @chainable
    * @returns a new scale that is the relative minor of this scale
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.relativeMinor()); // Scale
    * ```
    */
   public relativeMinor(): Scale {
      const minor = new Scale({
         template: ScaleTemplates.minor,
         key: this.degree(6).semitone,
         octave: this.octave,
      });
      return minor;
   }

   /**
    * shift
    */
   protected _shiftedInterval: number = 0;
   protected _originalTemplate: Array<number> = [];
   /**
    * shift
    * shifts the scale by the given number of degrees
    * @chainable
    * @param shift - the number of degrees to shift the scale
    * @returns a new scale that is the shifted scale
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.shift(1)); // Scale
    * ```
    */
   public shift(degrees: number = 1): Scale {
      if (this._shiftedInterval === 0) {
         this._originalTemplate = clone(this._template);
      }

      this._template = shift(this._template, degrees);
      this._shiftedInterval += degrees;
      this._notesDirty = true;

      return this;
   }

   /**
    * shifted
    * returns a copy of this scale shifted by the given number of degrees
    * @chainable
    * @param degrees - the number of degrees to shift the scale
    * @returns a copy of this scale shifted by the given number of degrees
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.shifted(1)); // Scale(copy)
    * ```
    */
   public shifted(degrees: number = 1): Scale {
      const scale = this.copy();
      scale.shift(degrees);
      return scale;
   }

   /**
    * unshift
    * shifts the original root back to the root position
    * @chainable
    * @returns this scale after unshifting it back to the original root position
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.shift(1));
    * console.log(scale.unshift());
    * ```
    */
   public unshift(): Scale {
      if (this._shiftedInterval !== 0) {
         if (this._originalTemplate.length > 0) {
            this._template = this._originalTemplate;
         }
         // this.shift(this._shiftedInterval * -1);
         this._shiftedInterval = 0;
         this._originalTemplate = [];
         this._notesDirty = true;
      }

      return this;
   }

   /**
    * unshifted
    * returns a copy of this scale with the tonic shifted back
    * to the root position
    * @chainable
    * @returns a copy of this scale with the tonic shifted back
    * to the root position
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.shift(1));
    * console.log(scale.unshifted()); // Scale(copy)
    * ```
    */
   public unshifted(): Scale {
      const scale = this.copy();
      if (this._originalTemplate.length)
         scale.template = this._originalTemplate;
      scale.unshift();
      return scale;
   }

   /**
    * returns the amount that the scale has shifted
    * (0 if not shifted)
    * @returns the amount that the scale has shifted
    * (0 if not shifted)
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.shift(1));
    * console.log(scale.shifted()); // 1
    * ```
    */
   public shiftedInterval(): number {
      return this._shiftedInterval;
   }

   /**
    * Scale modes
    */

   /**
    * @chainable
    * @returns a copy of this scale in the Ionian(major) mode
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.ionian()); // Scale(copy)
    * ```
    */
   public ionian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.ionian;
      return scale;
   }

   /**
    * @chainable
    * @returns a copy of this scale in the Dorian mode
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.dorian()); // Scale(copy)
    * ```
    */
   public dorian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.dorian;
      return scale;
   }

   /**
    * @chainable
    * @returns a copy of this scale in the Phrygian mode
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.phrygian()); // Scale(copy)
    * ```
    */
   public phrygian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.phrygian;
      return scale;
   }

   /**
    * @chainable
    * @returns a copy of this scale in the Lydian mode
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.lydian()); // Scale(copy)
    * ```
    */
   public lydian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.lydian;
      return scale;
   }

   /**
    * @chainable
    * @returns a copy of this scale in the Mixolydian mode
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.mixolydian()); // Scale(copy)
    * ```
    */
   public mixolydian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.mixolydian;
      return scale;
   }

   /**
    * @chainable
    * @returns a copy of this scale in the Aeolian(minor) mode
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.aeolian()); // Scale(copy)
    * ```
    */
   public aeolian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.aeolian;
      return scale;
   }

   /**
    * @chainable
    * @returns a copy of this scale in the Locrian mode
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.locrian()); // Scale(copy)
    * ```
    */
   public locrian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.locrian;
      return scale;
   }

   /**
    * returns string version of the scale
    * @returns string version of the scale
    * @example
    * ```javascript
    * const scale = new Scale();
    * console.log(scale.toString()); // 'C'
    * ```
    */
   public toString(): string {
      let scaleNames: string = scaleNameLookup(this._template);
      if (!scaleNames) scaleNames = this.getNoteNames().join(", ");
      return `${Semitone[this._key]}${this._octave}(${scaleNames})`;
   }

   // /**
   //  * used to initialize the lookup table
   //  * @internal
   //  */
   // public static async init() {
   // if (table && Object.keys(table).length > 0) {
   //    Scale._notesLookup = table;
   // } else {
   //    Scale._notesLookup = Scale.createNotesLookupTable();
   // }

   // save the lookup table to file

   //    import("fs")
   //       .then((fs) => {
   //          if (process?.env?.GENTABLES ?? false) {
   //             try {
   //                if (!Scale._notesLookup)
   //                   Scale._notesLookup = Scale.createNotesLookupTable();
   //                fs.writeFileSync(
   //                   "./src/Scale/noteLookup.json",
   //                   JSON.stringify(Scale._notesLookup)
   //                );
   //             } catch (err) {
   //                console.warn(err);
   //             }
   //          }
   //       })
   //       .catch(() => {
   //          console.log("Not running from NODE - This is fine");
   //       });
   // }
}

/**
 * attempts to lookup the note name for a scale efficiently
 * @param scale - the scale to lookup
 * @param preferSharpKey - if true, will prefer sharp keys over flat keys
 * @returns the note names for the scale
 * @internal
 */
const scaleNoteNameLookup = (scale: Scale, preferSharpKey: boolean = true) => {
   try {
      const key = `${scale.key}-${scale.octave}-${JSON.stringify(
         scale.template
      )}`;
      const notes = _notesLookup[key];
      if (notes) {
         return notes;
      }
   } catch (e) {
      // do nothing
   }

   let notes = [...scale.notes];
   notes = shift(notes, -scale.shiftedInterval()); //unshift back to key = 0 index
   const notesParts: string[][] = notes.map((note) =>
      note.toString().split("/")
   );

   const octaves = notes.map((note) => note.octave);

   const removables = ["B#", "Bs", "Cb", "E#", "Es", "Fb"];

   const noteNames: Array<string> = [];

   for (const [i, noteParts] of notesParts.entries()) {
      //remove Cb B# etc
      for (const part of noteParts) {
         // remove any numbers from the note name(octave)
         // part.replace(/\d/g, "");

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

      const lastWholeNote = noteNames[noteNames.length - 1][0];
      const lastIndex = wholeNotes.indexOf(lastWholeNote);
      const nextNote = wholeNotes[lastIndex + 1];

      if (noteParts[0].includes(nextNote)) {
         const hasOctave = noteParts[0].match(/\d/g);
         noteNames.push(noteParts[0] + (hasOctave ? "" : octaves[i]));
         continue;
      }

      const hasOctave = noteParts[noteParts.length - 1].match(/\d/g);
      noteNames.push(
         noteParts[noteParts.length - 1] + (hasOctave ? "" : octaves[i])
      );
   }

   const shiftedNoteNames: string[] = shift(noteNames, scale.shiftedInterval());

   return shiftedNoteNames;
};

/**
 * creates a lookup table for all notes formatted as [A-G][#|b|s][0-9]
 */
const createNotesLookupTable = (): { [key: string]: string[] } => {
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

/**
 * creates the lookup table as soon as the module is loaded
 */
let _notesLookup: { [key: string]: string[] } = {};

// Scale.init();

const buildScaleNoteTable = (): { [key: string]: string[] } =>
   (_notesLookup = createNotesLookupTable());

export default Scale;
export { buildScaleNoteTable };
