import CIdentifiable from "./composables/Identifiable";
import Semitone from "./Semitone";
import wrap from "./utils/wrap";
import clamp from "./utils/clamp";

//**********************************************************
// Constants
//**********************************************************
const MODIFIED_SEMITONES = [1, 3, 4, 6, 8, 10];
const TONES_MAX = 11;
const TONES_MIN = 0;
const OCTAVE_MAX = 9;
const OCTAVE_MIN = 0;
const DEFAULT_OCTAVE = 4;
const DEFAULT_SEMITONE = 0;

//**********************************************************
/**
 * Describes the fields expected by the Note constrtuctor.
 */
//**********************************************************
type NoteInitializer = {
   semitone?: Semitone;
   octave?: number;
};

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
   constructor(values: NoteInitializer) {
      // important that octave is set first so that
      // setting the semitone can change the octave
      this.octave = values?.octave ?? DEFAULT_OCTAVE;
      this.semitone = values?.semitone ?? DEFAULT_SEMITONE;
      this._prevSemitone = this._tone;
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
         semitone: this.semitone + 1,
         octave: this.octave,
      });
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
      if (this.semitone + 1 === this._prevSemitone) return false; //is flat

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
         semitone: this.semitone - 1,
         octave: this.octave,
      });
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
      if (this.semitone - 1 === this._prevSemitone) return false; //is sharp

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

   static B(octave: number): Note {
      return new Note({
         semitone: Semitone.B,
         octave,
      });
   }

   static C(octave: number): Note {
      return new Note({
         semitone: Semitone.C,
         octave,
      });
   }

   static D(octave: number): Note {
      return new Note({
         semitone: Semitone.D,
         octave,
      });
   }

   static E(octave: number): Note {
      return new Note({
         semitone: Semitone.E,
         octave,
      });
   }

   static F(octave: number): Note {
      return new Note({
         semitone: Semitone.F,
         octave,
      });
   }

   static G(octave: number): Note {
      return new Note({
         semitone: Semitone.G,
         octave,
      });
   }
}

export default Note;
export { TONES_MAX, TONES_MIN, OCTAVE_MAX, OCTAVE_MIN };
export type { NoteInitializer };
