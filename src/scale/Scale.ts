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
// import Modes from "./modes";
import Note from "../Note/Note";
import ScaleTemplates from "./ScaleTemplates";
import { uid } from "uid";
// import * as uid from 'uid';
// import Copyable from "../composables/Copyable";
import Entity from "../Entity";
import parseScale from "./scaleParser";
import shift from "../utils/shift";
import clone from "../utils/clone";
import isEqual from "../utils/isEqual";
import scaleNameLookup from "./scaleNameLookup";
import { registerInitializer } from "../Initializer/Initializer";
// import scaleNoteNameLookup from "./scaleNoteNameLookup";

//**********************************************************
/**
 * A musical scale.
 * The primary fields are the semitone and octave.
 * The octave is clamped to the range [0, 9].
 * Setting the semitone to a value outside of the range [0, 11] will
 * wrap the semitone to the range [0, 11] and change the octave depending
 * on how many times the semitone has been wrapped.
 */
//**********************************************************
class Scale implements Entity {
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

   //**********************************************************
   /**
    *  unique id for this scale
    */
   //**********************************************************
   id: string = uid();

   //**********************************************************
   /**
    * Returns true if this scale is equal to the given scale
    */
   //**********************************************************
   public equals(scale: Scale): boolean {
      return (
         this._key === scale._key &&
         this._octave === scale._octave &&
         isEqual(this._template, scale._template)
      );
   }

   //**********************************************************
   /**
    * Returns a copy of this Scale
    */
   //**********************************************************
   public copy(): Scale {
      const scale: Scale = new Scale({
         key: this.key,
         octave: this.octave,
         template: clone(this.template),
      });
      if (this._shiftedInterval !== 0) scale.shift(this._shiftedInterval);
      return scale;
   }

   //**********************************************************
   /**
    * key
    */
   //**********************************************************
   private _key: Semitone = 0;
   public get key(): Semitone {
      return this._key;
   }

   public set key(value: Semitone) {
      const wrapped = wrap(value, TONES_MIN, TONES_MAX);
      this.octave = this.octave + wrapped.numWraps;
      this._key = wrapped.value;
      this._notesDirty = true;
   }

   //**********************************************************
   /**
    * octave
    */
   //**********************************************************
   private _octave: number = DEFAULT_OCTAVE;
   public get octave(): number {
      return this._octave;
   }

   public set octave(value: number) {
      this._octave = clamp(value, OCTAVE_MIN, OCTAVE_MAX);
      this._notesDirty = true;
   }

   //**********************************************************
   /**
    * template
    */
   //**********************************************************
   private _template: Array<number> = [];
   public get template(): Array<number> {
      return clone(this._template);
   }

   public set template(value: Array<number>) {
      this._template = clone(value);
      this._shiftedInterval = 0;
      this._notesDirty = true;
   }

   //**********************************************************
   /**
    * notes
    * notes are generated and cached as needed
    */
   //**********************************************************
   private _notes: Array<Note> = [];
   private _notesDirty: boolean = true;
   public get notes(): Array<Note> {
      if (this._notesDirty) {
         this.generateNotes();
         this._notesDirty = false;
      }
      return this._notes;
   }

   //**********************************************************
   /**
    * generate notes(internal)
    * generates the notes for this scale
    */
   //**********************************************************
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

      // this._notes = shift(notes, this._shiftedInterval + 1);

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

   //**********************************************************
   /**
    * returns the names of the notes in the scale
    */
   //**********************************************************
   public getNoteNames(preferSharpKey = true): string[] {
      const names: string[] = Scale.scaleNoteNameLookup(this, preferSharpKey);
      return names;
   }

   //**********************************************************
   /**
    * degree
    * returns a note that represents the given degree
    */
   //**********************************************************
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

   //**********************************************************
   /**
    * relative major
    * returns a new scale that is the relative major of this scale
    */
   //**********************************************************
   public relativeMajor(): Scale {
      const major = new Scale({
         template: ScaleTemplates.major,
         key: this.degree(3).semitone,
         octave: this.octave,
      });
      return major;
   }

   //**********************************************************
   /**
    * relative minor
    * returns a new scale that is the relative minor of this scale
    */
   //**********************************************************
   public relativeMinor(): Scale {
      const minor = new Scale({
         template: ScaleTemplates.minor,
         key: this.degree(6).semitone,
         octave: this.octave,
      });
      return minor;
   }

   //**********************************************************
   /**
    * shift
    * shifts the scale by the given number of degrees
    */
   //**********************************************************
   private _shiftedInterval: number = 0;
   private _originalTemplate: Array<number> = [];
   public shift(degrees: number = 1): Scale {
      if (this._shiftedInterval === 0) {
         this._originalTemplate = clone(this._template);
      }

      this._template = shift(this._template, degrees);
      this._shiftedInterval += degrees;
      this._notesDirty = true;

      return this;
   }

   //**********************************************************
   /**
    * shifted
    * returns a copy of this scale shifted by the given number of degrees
    */
   //**********************************************************
   public shifted(degrees: number = 1): Scale {
      const scale = this.copy();
      scale.shift(degrees);
      return scale;
   }

   //**********************************************************
   /**
    * unshift
    * shifts the original root back to the root position
    */
   //**********************************************************
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

   //**********************************************************
   /**
    * unshifted
    * returns a copy of this scale with the tonic shifted back
    * to the root position
    */
   //**********************************************************
   public unshifted(): Scale {
      const scale = this.copy();
      if (this._originalTemplate.length)
         scale.template = this._originalTemplate;
      scale.unshift();
      return scale;
   }

   //**********************************************************
   /**
    * returns the amount that the scale has shifted
    * (0 if not shifted)
    */
   //**********************************************************
   public shiftedInterval(): number {
      return this._shiftedInterval;
   }

   //**********************************************************
   /**
    * Scale modes
    */
   //**********************************************************
   public ionian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.ionian;
      return scale;
   }

   public dorian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.dorian;
      return scale;
   }

   public phrygian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.phrygian;
      return scale;
   }

   public lydian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.lydian;
      return scale;
   }

   public mixolydian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.mixolydian;
      return scale;
   }

   public aeolian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.aeolian;
      return scale;
   }

   public locrian(): Scale {
      const scale = this.copy();
      scale.template = ScaleTemplates.locrian;
      return scale;
   }

   //**********************************************************
   /**
    * returns string version of the scale
    */
   //**********************************************************
   public toString(): string {
      let scaleNames: string = scaleNameLookup(this._template);
      if (!scaleNames) scaleNames = this.getNoteNames().join(", ");
      return `${Semitone[this._key]}${this._octave}(${scaleNames})`;
   }

   //**********************************************************
   /**
    * attempts to lookup the note name for a scale efficiently
    */
   //**********************************************************
   private static scaleNoteNameLookup(
      scale: Scale,
      preferSharpKey: boolean = true
   ) {
      try {
         const key = `${scale.key}-${scale.octave}-${JSON.stringify(
            scale.template
         )}`;
         const notes = this._notesLookup[key];
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

      const shiftedNoteNames: string[] = shift(
         noteNames,
         scale.shiftedInterval()
      );

      return shiftedNoteNames;
   }
   //**********************************************************
   /**
    * creates a lookup table for all notes formatted as [A-G][#|b|s][0-9]
    */
   //**********************************************************
   private static createNotesLookupTable(): { [key: string]: string[] } {
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
                  Scale.scaleNoteNameLookup(scale);
            }
         }
      }

      return scaleTable;
   }

   //**********************************************************
   /**
    * creates the lookup table as soon as the module is loaded
    */
   //**********************************************************
   private static _notesLookup: { [key: string]: string[] } = {};
   // this.createNotesLookupTable();

   //**********************************************************
   /**
    * used to initialize the lookup table
    */
   //**********************************************************
   public static async init() {
      Scale._notesLookup = Scale.createNotesLookupTable();
   }
}

registerInitializer(Scale.init);

export default Scale;
export type { ScaleInitializer };

// look at order of initialized - not working correctly
