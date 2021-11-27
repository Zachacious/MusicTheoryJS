import Semitone from "../Semitone";
import wrap from "../utils/wrap";
import clamp from "../utils/clamp";
import { TONES_MAX, TONES_MIN, OCTAVE_MAX, OCTAVE_MIN, DEFAULT_OCTAVE, DEFAULT_SEMITONE } from "../Note/noteConstants";
import { DEFAULT_SCALE_TEMPLATE } from "./scaleConstants";
import ScaleInitializer from "./ScaleInitializer";
import Modes from "./modes";
import Note from "../Note/Note";
import Identifiable from "../composables/Identifiable";

@Identifiable()
class Scale {
   constructor(values?: ScaleInitializer) {
      if (values) {
         this.template = values.template || DEFAULT_SCALE_TEMPLATE;
         this.tonic = values.tonic || DEFAULT_SEMITONE;
         this.octave = values.octave || DEFAULT_OCTAVE;
      } else {
         this.template = DEFAULT_SCALE_TEMPLATE;
         this.tonic = DEFAULT_SEMITONE;
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
      return this._tonic === scale._tonic && this.octave === scale.octave && this._template === scale._template;
   }

   //**********************************************************
   /**
    * Returns a copy of this Scale
    */
   //**********************************************************
   public copy(): Scale {
      return new Scale({
         tonic: this.tonic,
         octave: this.octave,
         template: this.template,
      });
   }

   private _tonic: Semitone = 0;
   public get tonic(): Semitone {
      return this._tonic;
   }

   public set tonic(value: Semitone) {
      const wrapped = wrap(value, TONES_MIN, TONES_MAX);
      this.octave = this.octave + wrapped.numWraps;
      this._tonic = wrapped.value;
      this.generateNotes();
   }

   private _octave: number = 4;
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
      this.generateNotes();
   }

   private _notes: Array<Note> = [];
   public get notes(): Array<Note> {
      return this._notes;
   }

   private generateNotes(): void {
      const notes = [];
      let accumulator = this.tonic;
      for (const interval of this.template) {
         const note = new Note({
            semitone: (accumulator += interval),
            octave: this.octave,
         });
         notes.push(note);
      }

      this._notes = notes;
   }

   public degree(degree: number): Note {
      const wrapped = wrap(degree + 1 /* zero indexed */, 0, this.notes.length - 1);
      const note = this.notes[wrapped.value];
      note.octave = this.octave + wrapped.numWraps;
      return note;
   }

   public relativeMajor(): Scale {
      const major = new Scale({
         template: DEFAULT_SCALE_TEMPLATE,
         tonic: this.degree(3).semitone,
         octave: this.octave,
      });
      return major;
   }

   // TODO:
   // public relativeMinor(): Scale {
   //    const minor = new Scale({
   //       template: Modes.minor,
   //       tonic: this.degree(3).semitone,
   //       octave: this.octave,
   //    });
   //    return minor;
   // }
}

export default Scale;
export type { ScaleInitializer };
