import CIdentifiable from "../composables/Identifiable";
import Semitone from "../Semitone";
import wrap from "../utils/wrap";
import clamp from "../utils/clamp";
import parseNote from "./noteParser";
import NoteInitializer from "./NoteInitializer";
import {
   MODIFIED_SEMITONES,
   TONES_MAX,
   TONES_MIN,
   OCTAVE_MAX,
   OCTAVE_MIN,
   DEFAULT_OCTAVE,
   DEFAULT_SEMITONE,
} from "./noteConstants";
import noteStringLookup from "./stringTable";

//**********************************************************
/**
 * A musical note.
 * The primary fields are the semitone and octave.
 * The octave is clamped to the range [0, 9].
 * Setting the semitone to a value outside of the range [0, 11] will
 * wrap the semitone to the range [0, 11] and change the octave depending
 * on how many times the semitone has been wrapped.
 */
//**********************************************************
@CIdentifiable() // generates a unique id for each instance - retrieve with id()
class Note {
   //**********************************************************
   /**
    * Creates a new Note instance.
    */
   //**********************************************************
   constructor(values?: NoteInitializer | string) {
      if (!values) {
         this.octave = DEFAULT_OCTAVE;
         this.semitone = DEFAULT_SEMITONE;
      } else if (typeof values === "string") {
         values = parseNote(values);
         this.octave = values?.octave ?? DEFAULT_OCTAVE;
         this.semitone = values?.semitone ?? DEFAULT_SEMITONE;
         this._prevSemitone = this._tone;
      } else {
         // important that octave is set first so that
         // setting the semitone can change the octave
         this.octave = values?.octave ?? DEFAULT_OCTAVE;
         this.semitone = values?.semitone ?? DEFAULT_SEMITONE;
         this._prevSemitone = this._tone;
      }
   }

   //**********************************************************
   /**
    * This is overridden by the Identifiable decorator
    * is here so that typescript will recognize that it exist
    */
   //**********************************************************
   public id(): string {
      return "";
   }

   //**********************************************************
   /**
    * semitone
    */
   //**********************************************************
   private _tone: Semitone = DEFAULT_SEMITONE;
   private _prevSemitone: Semitone = DEFAULT_SEMITONE;

   get semitone(): Semitone {
      return this._tone;
   }

   //**********************************************************
   /**
    * setting the semitone with a number outside the
    * range of 0-11 will wrap the value around and
    * change the octave accordingly
    */
   //**********************************************************
   set semitone(semitone: Semitone) {
      const wrapped = wrap(semitone, TONES_MIN, TONES_MAX);
      this._prevSemitone = this._tone;
      this._tone = wrapped.value;
      this._octave = this._octave + wrapped.numWraps;
   }

   //**********************************************************
   /**
    * octave
    */
   //**********************************************************
   private _octave: number = DEFAULT_OCTAVE;

   get octave(): number {
      return this._octave;
   }

   //**********************************************************
   /**
    * The octave is clamped to the range [0, 9].
    */
   //**********************************************************
   set octave(octave: number) {
      this._octave = clamp(octave, OCTAVE_MIN, OCTAVE_MAX);
   }

   //**********************************************************
   /**
    * Returns a new note that is a sharpened version of this note.
    * This is chainable - A().sharp().flat()
    */
   //**********************************************************
   public sharp(): Note {
      return new Note({
         semitone: this.semitone,
         octave: this.octave,
      }).sharpen();
   }

   //**********************************************************
   /**
    * Sharpens the note in place.
    * Returns itself for chaining - A().sharpen().sharp()
    */
   //**********************************************************
   public sharpen(): Note {
      this.semitone = this.semitone + 1;
      return this;
   }

   //**********************************************************
   /**
    *  attempts to determine if the note is sharp
    */
   //**********************************************************
   public isSharp(): boolean {
      // if note is whole, it can't be sharp
      const modified = MODIFIED_SEMITONES.includes(this.semitone);
      if (!modified) return false;

      // if note is flat, it can't be sharp
      if (wrap(this.semitone + 1, TONES_MIN, TONES_MAX).value === this._prevSemitone) return false; //is flat

      // Doesn't neccecarily mean it's sharp, but it's a good guess at this point
      return true;
   }

   //**********************************************************
   /**
    * Returns a new note that is a flattened version of this note.
    * This is chainable - A().flat().flat()
    */
   //**********************************************************
   public flat(): Note {
      return new Note({
         semitone: this.semitone,
         octave: this.octave,
      }).flatten();
   }

   //**********************************************************
   /**
    * Flattens the note in place.
    * Returns itself for chaining - A().flatten().flat()
    */
   //**********************************************************
   public flatten(): Note {
      this.semitone = this.semitone - 1;
      return this;
   }

   //**********************************************************
   /**
    *  attempts to determine if the note is flat
    */
   //**********************************************************
   public isFlat(): boolean {
      // if note is whole, it can't be sharp
      const modified = MODIFIED_SEMITONES.includes(this.semitone);
      if (!modified) return false;

      // if note is sharp, it can't be flat
      if (wrap(this.semitone - 1, TONES_MIN, TONES_MAX).value === this._prevSemitone) return false; //is sharp

      // Doesn't neccecarily mean it's flat, but it's a good guess at this point
      return true;
   }

   //**********************************************************
   /**
    * Returns true if this note is equal to the given note
    */
   //**********************************************************
   public equals(note: Note): boolean {
      return this.semitone === note.semitone && this.octave === note.octave;
   }

   //**********************************************************
   /**
    * Returns a copy of this note
    */
   //**********************************************************
   public copy(): Note {
      return new Note({
         semitone: this.semitone,
         octave: this.octave,
      });
   }

   //**********************************************************
   /**
    * Returns a string version of this note
    */
   //**********************************************************
   public toString(): string {
      return noteStringLookup[`${this._tone}-${this._prevSemitone}`] + `${this._octave}`;
   }

   //**********************************************************
   /**
    * Static methods to create whole notes easily.
    * the default octave is 4
    */
   //**********************************************************
   static A(octave: number = 4): Note {
      return new Note({
         semitone: Semitone.A,
         octave,
      });
   }

   static B(octave: number = 4): Note {
      return new Note({
         semitone: Semitone.B,
         octave,
      });
   }

   static C(octave: number = 4): Note {
      return new Note({
         semitone: Semitone.C,
         octave,
      });
   }

   static D(octave: number = 4): Note {
      return new Note({
         semitone: Semitone.D,
         octave,
      });
   }

   static E(octave: number = 4): Note {
      return new Note({
         semitone: Semitone.E,
         octave,
      });
   }

   static F(octave: number = 4): Note {
      return new Note({
         semitone: Semitone.F,
         octave,
      });
   }

   static G(octave: number = 4): Note {
      return new Note({
         semitone: Semitone.G,
         octave,
      });
   }
}

export default Note;
export { TONES_MAX, TONES_MIN, OCTAVE_MAX, OCTAVE_MIN };
export type { NoteInitializer };
