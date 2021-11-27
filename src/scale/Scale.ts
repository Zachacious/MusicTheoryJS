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
import Modes from "./modes";
import Note from "../Note/Note";
import Identifiable from "../composables/Identifiable";
import ScaleTemplates from "./ScaleTemplates";

@Identifiable()
class Scale {
   constructor(values?: ScaleInitializer) {
      if (values) {
         this.template = values.template || DEFAULT_SCALE_TEMPLATE;
         this.key = values.key || DEFAULT_SEMITONE;
         this.octave = values.octave || DEFAULT_OCTAVE;
      } else {
         this.template = DEFAULT_SCALE_TEMPLATE;
         this.key = DEFAULT_SEMITONE;
         this.octave = DEFAULT_OCTAVE;
      }

      this.generateNotes();
   }

   //**********************************************************
   /**
    * This is overridden by the Identifiable decorator
    * is here so that typescript will recognize that it exist
    */
   //**********************************************************
   public id(id?: string): string {
      return "";
   }

   //**********************************************************
   /**
    * Returns true if this scale is equal to the given scale
    */
   //**********************************************************
   public equals(scale: Scale): boolean {
      return (
         this._key === scale._key &&
         this.octave === scale.octave &&
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

   private _octave: number = DEFAULT_OCTAVE;

   public get octave(): number {
      return this._octave;
   }

   public set octave(value: number) {
      this._octave = clamp(value, OCTAVE_MIN, OCTAVE_MAX);
      this.generateNotes();
   }

   private _template: Array<number> = [];
   public get template(): Array<number> {
      return this._template;
   }

   public set template(value: Array<number>) {
      this._template = value;
      this._shiftedInterval = 0;
      this.generateNotes();
   }

   private _notes: Array<Note> = [];
   public get notes(): Array<Note> {
      return this._notes;
   }

   protected generateNotes(): void {
      // use the template unshifted for simplicity
      const unshiftedTemplate = this.unshifted().template;
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

   public relativeMajor(): Scale {
      const major = new Scale({
         template: ScaleTemplates.major,
         key: this.degree(3).semitone,
         octave: this.octave,
      });
      return major;
   }

   public relativeMinor(): Scale {
      const minor = new Scale({
         template: ScaleTemplates.minor,
         key: this.degree(6).semitone,
         octave: this.octave,
      });
      return minor;
   }

   _shiftedInterval: number = 0;
   public shift(degrees: number = 1): Scale {
      if (degrees > 0) {
         const temp: number[] = this._template.splice(
            this._template.length - (degrees + 1),
            Infinity
         );

         this._template.unshift(...temp);
      }

      if (degrees < 0) {
         const temp: number[] = this._template.splice(0, degrees);
         this._template.push(...temp);
      }

      this._shiftedInterval += degrees;
      this.generateNotes();

      return this;
   }

   public shifted(degrees: number = 1): Scale {
      const scale = this.copy();
      scale.shift(degrees);
      return scale;
   }

   public unshift(): Scale {
      if (this._shiftedInterval !== 0) {
         this.shift(this._shiftedInterval * -1);
         this._shiftedInterval = 0;
         this.generateNotes();
      }

      return this;
   }

   public unshifted(): Scale {
      const scale = this.copy();
      scale.unshift();
      return scale;
   }

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
}

export default Scale;
export type { ScaleInitializer };
