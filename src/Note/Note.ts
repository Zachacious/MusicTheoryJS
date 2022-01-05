// import Identifiable from "../composables/Identifiable";
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
import { uid } from "uid";
import Entity from "../Entity";

/**
 * A note consist of a semitone and an octave.<br>
 *
 * @example
 * ```javascript
 * import { Note } from "musictheoryjs";
 * import { NoteInitializer } from "musictheoryjs"; // typescript only if needed
 * ```
 */
class Note implements Entity {
   /**
    * @example
    * ```javascript
    * import { Note } from "musictheoryjs";
    *
    * // creates a new note with default values semitone 0(C) and octave 4
    * const note = new Note();
    *
    * // creates a new note using an initializer object
    * const note = new Note({semitone: 4, octave: 5});
    *
    * // String parsing should follow the format: note-name[modifier][octave]
    * // creates a new note using a string
    * const note = new Note("C5");
    * ```
    */
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

   /**
    *  unique id for this note(auto generated)
    * @example
    * ```javascript
    * const note = new Note();
    * console.log(note.id); // s2898snloj
    * ```
    */
   id: string = uid();

   /**
    * semitone
    */
   protected _tone: Semitone = DEFAULT_SEMITONE;
   protected _prevSemitone: Semitone = DEFAULT_SEMITONE;

   /**
    * @example
    * ```javascript
    * const note = new Note();
    * console.log(note.semitone); // 0
    * ```
    */
   get semitone(): Semitone {
      return this._tone;
   }

   /**
    * setting the semitone with a number outside the
    * range of 0-11 will wrap the value around and
    * change the octave accordingly
    * @example
    * ```javascript
    * const note = new Note();
    * note.semitone = 4;// E
    * console.log(note.semitone); // 4(E)
    * ```
    */
   set semitone(semitone: Semitone) {
      const wrapped = wrap(semitone, TONES_MIN, TONES_MAX);
      this._prevSemitone = this._tone;
      this._tone = wrapped.value;
      this._octave = this._octave + wrapped.numWraps;
   }

   /**
    * octave
    */
   protected _octave: number = DEFAULT_OCTAVE;
   /**
    * @example
    * ```javascript
    * const note = new Note();
    * console.log(note.octave); // 4
    * ```
    */
   get octave(): number {
      return this._octave;
   }

   /**
    * The octave is clamped to the range [0, 9].
    * @example
    * ```javascript
    * const note = new Note();
    * note.octave = 10;
    * console.log(note.octave); // 9(because of clamping)
    * ```
    */
   set octave(octave: number) {
      this._octave = clamp(octave, OCTAVE_MIN, OCTAVE_MAX);
   }

   /**
    * @chainable
    * @returns a new note that is a sharpened version of this note.
    * @example
    * ```javascript
    * const note = new Note(); // default semitone is 0(C)
    * const note2 = note.sharp();
    * console.log(note2.semitone); // 1(C#)
    * ```
    */
   public sharp(): Note {
      return new Note({
         semitone: this.semitone,
         octave: this.octave,
      }).sharpen();
   }

   /**
    * Sharpens the note in place.
    * @chainable
    * @example
    * ```javascript
    * const note = new Note(); // default semitone is 0(C)
    * note.sharpen();
    * console.log(note.semitone); // 1(C#)
    */
   public sharpen(): Note {
      this.semitone = this.semitone + 1;
      return this;
   }

   /**
    *  attempts to determine if the note is sharp
    * @returns true if the note is sharp
    * @example
    * ```javascript
    * const note = new Note(); // default semitone is 0(C)
    * console.log(note.isSharp()); // false
    * note.sharpen();
    * console.log(note.isSharp()); // true
    * ```
    */
   public isSharp(): boolean {
      // if note is whole, it can't be sharp
      const modified = MODIFIED_SEMITONES.includes(this.semitone);
      if (!modified) return false;

      // if note is flat, it can't be sharp
      if (
         wrap(this.semitone + 1, TONES_MIN, TONES_MAX).value ===
         this._prevSemitone
      )
         return false; //is flat

      // Doesn't neccecarily mean it's sharp, but it's a good guess at this point
      return true;
   }

   /**
    * Returns a new note that is a flattened version of this note.
    * @chainable
    * @returns a new note that is a flattened version of this note.
    * @example
    * ```javascript
    * const note = new Note(); // default semitone is 0(C)
    * const note2 = note.flat();
    * console.log(note2.semitone); // 3(Eb)
    * ```
    */
   public flat(): Note {
      return new Note({
         semitone: this.semitone,
         octave: this.octave,
      }).flatten();
   }

   /**
    * Flattens the note in place.
    * @chainable
    * @example
    * ```javascript
    * const note = new Note({semitone: 4}); //  semitone is 4(E)
    * note.flatten();
    * console.log(note.semitone); // 3(Eb)
    * ```
    */
   public flatten(): Note {
      this.semitone = this.semitone - 1;
      return this;
   }

   /**
    *  attempts to determine if the note is flat
    * @returns true if the note is flat
    * @example
    * ```javascript
    * const note = new Note(); // default semitone is 0(C)
    * console.log(note.isFlat()); // false
    * note.flatten();
    * console.log(note.isFlat()); // true
    * ```
    */
   public isFlat(): boolean {
      // if note is whole, it can't be sharp
      const modified = MODIFIED_SEMITONES.includes(this.semitone);
      if (!modified) return false;

      // if note is sharp, it can't be flat
      if (
         wrap(this.semitone - 1, TONES_MIN, TONES_MAX).value ===
         this._prevSemitone
      )
         return false; //is sharp

      // Doesn't neccecarily mean it's flat, but it's a good guess at this point
      return true;
   }

   /**
    * @returns true if this note is equal to the given note
    * @example
    * ```javascript
    * const note = new Note();
    * const note2 = new Note();
    * console.log(note.equals(note2)); // true
    * ```
    */
   public equals(note: Note): boolean {
      return this.semitone === note.semitone && this.octave === note.octave;
   }

   /**
    * @returns a copy of this note
    * @example
    * ```javascript
    * const note = new Note(); // default semitone is 0(C)
    * const note2 = note.copy();
    * console.log(note.equals(note2)); // true
    * ```
    */
   public copy(): Note {
      return new Note({
         semitone: this.semitone,
         octave: this.octave,
      });
   }

   /**
    * Returns a string version of this note
    * @example
    * ```javascript
    * const note = new Note(); // default semitone is 0(C)
    * console.log(note.toString()); // C4
    * ```
    *
    */
   public toString(): string {
      // console.log(noteStringLookup);
      return (
         noteStringLookup(`${this._tone}-${this._prevSemitone}`) +
         `${this._octave}`
      );
   }

   /**
    * Static methods to create whole notes easily.
    * the default octave is 4
    */

   /**
    * @static
    * @param octave
    * @returns note set to A[octave]
    * @example
    * ```javascript
    * const note = Note.A();
    * console.log(note.toString()); // A4
    * ```
    */
   static A(octave: number = 4): Note {
      return new Note({
         semitone: Semitone.A,
         octave,
      });
   }

   /**
    *
    * @static
    * @param octave
    * @returns note set to B[octave]
    * @example
    * ```javascript
    * const note = Note.B();
    * console.log(note.toString()); // B4
    * ```
    */
   static B(octave: number = 4): Note {
      return new Note({
         semitone: Semitone.B,
         octave,
      });
   }

   /**
    *
    * @static
    * @param octave
    * @returns note set to C[octave]
    * @example
    * ```javascript
    * const note = Note.C();
    * console.log(note.toString()); // C4
    * ```
    */
   static C(octave: number = 4): Note {
      return new Note({
         semitone: Semitone.C,
         octave,
      });
   }

   /**
    *
    * @static
    * @param octave
    * @returns note set to D[octave]
    * @example
    * ```javascript
    * const note = Note.D();
    * console.log(note.toString()); // D4
    * ```
    */
   static D(octave: number = 4): Note {
      return new Note({
         semitone: Semitone.D,
         octave,
      });
   }

   /**
    *
    * @static
    * @param octave
    * @returns note set to E[octave]
    * @example
    * ```javascript
    * const note = Note.E();
    * console.log(note.toString()); // E4
    * ```
    */
   static E(octave: number = 4): Note {
      return new Note({
         semitone: Semitone.E,
         octave,
      });
   }

   /**
    *
    * @static
    * @param octave
    * @returns note set to F[octave]
    * @example
    * ```javascript
    * const note = Note.F();
    * console.log(note.toString()); // F4
    * ```
    */
   static F(octave: number = 4): Note {
      return new Note({
         semitone: Semitone.F,
         octave,
      });
   }

   /**
    *
    * @static
    * @param octave
    * @returns note set to G[octave]
    * @example
    * ```javascript
    * const note = Note.G();
    * console.log(note.toString()); // G4
    * ```
    */
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
