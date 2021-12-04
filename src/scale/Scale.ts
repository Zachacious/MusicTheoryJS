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
// import Copyable from "../composables/Copyable";
import Entity from "../Entity";
import parseScale from "./scaleParser";
import shift from "../utils/shift";

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
         this.template = values.template || DEFAULT_SCALE_TEMPLATE;
         this.key = values.key || DEFAULT_SEMITONE;
         this.octave = values.octave || DEFAULT_OCTAVE;
      } else {
         // important that octave is set first so that
         // setting the semitone can change the octave
         this.template = values.template || DEFAULT_SCALE_TEMPLATE;
         this.key = values.key || DEFAULT_SEMITONE;
         this.octave = values.octave || DEFAULT_OCTAVE;
      }

      this.generateNotes();
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
         this._template === scale._template
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
         template: this.template,
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
      this.generateNotes();
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
      this.generateNotes();
   }

   //**********************************************************
   /**
    * template
    */
   //**********************************************************
   private _template: Array<number> = [];
   public get template(): Array<number> {
      return this._template;
   }

   public set template(value: Array<number>) {
      this._template = value;
      this._shiftedInterval = 0;
      this.generateNotes();
   }

   //**********************************************************
   /**
    * notes
    * notes are generated and cached as needed
    */
   //**********************************************************
   private _notes: Array<Note> = [];
   public get notes(): Array<Note> {
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
      const unshiftedTemplate = shift(this._template, -this._shiftedInterval);

      const notes = [];
      let accumulator = this.key;
      for (const interval of unshiftedTemplate) {
         const note = new Note({
            semitone: (accumulator += interval),
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

   //**********************************************************
   /**
    * degree
    * returns a note that represents the given degree
    */
   //**********************************************************
   public degree(degree: number): Note {
      const wrapped = wrap(
         degree + 1 /* zero indexed */,
         0,
         this.notes.length - 1
      );
      const note = this.notes[wrapped.value];
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
   _shiftedInterval: number = 0;
   public shift(degrees: number = 1): Scale {
      this._template = shift(this._template, degrees);
      this._shiftedInterval += degrees;
      this.generateNotes();

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
         this.shift(this._shiftedInterval * -1);
         this._shiftedInterval = 0;
         this.generateNotes();
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
      scale.unshift();
      return scale;
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
      let scaleName = "Unknown Scale";
      const scaleIndex = Object.values(ScaleTemplates).findIndex(
         (template) => template === this.template
      );
      if (scaleIndex !== -1) {
         scaleName = Object.keys(ScaleTemplates)[scaleIndex];
      }
      return `${Semitone[this._key]} ${scaleName} ${this.octave}`;
   }
}

export default Scale;
export type { ScaleInitializer };
