import Tuning from "./Tuning";
import Note from "../Note/Note";
import { uid } from "uid";
import Entity from "../Entity";

/**
 * Instrument are used to encapsulate the tuning and retrieving of midi keys
 * and frequencies for notes
 *
 * @example
 * ```javascript
 * import { Instrument } from "musictheoryjs";
 */
class Instrument implements Entity {
   tuning: Tuning;

   /**
    * @param tuning A4 frequency - defaults to 440
    * @example
    * ```javascript
    * const instrument = new Instrument(); // default 440 tuning
    * ```
    */
   constructor(a4Freq: number = 440) {
      this.tuning = new Tuning(a4Freq);
   }

   /**
    * @returns a unique id for this instance
    * @example
    * ```javascript
    * const instrument = new Instrument();
    * instrument.id; // returns a unique id
    * ```
    */
   id: string = uid();

   /**
    * @chainable
    * @returns a copy of this instance
    * @example
    * ```javascript
    * const instrument = new Instrument();
    * const copy = instrument.copy();
    * console.log(instrument.equals(copy)); // true
    * ```
    */
   public copy(): Instrument {
      return new Instrument(this.tuning.a4);
   }

   /**
    * @param other the other object to compare
    * @returns  true if the other object is equal to this one
    * @example
    * ```javascript
    * const instrument = new Instrument();
    * const copy = instrument.copy();
    * console.log(instrument.equals(copy)); // true
    * ```
    */
   public equals(other: Instrument): boolean {
      return this.tuning.equals(other.tuning);
   }

   /**
    * @returns the frequency of the given note
    * @example
    * ```javascript
    * const instrument = new Instrument();
    * instrument.getFrequency(new Note("C4")); // returns 261.6255653005986
    * ```
    */
   public getFrequency(note: Note): number {
      return this.tuning.freqLookup(note.octave, note.semitone);
   }

   /**
    * @returns the midi key of the given note
    * @example
    * ```javascript
    * const instrument = new Instrument();
    * instrument.getMidiKey(new Note("C4")); // returns 60
    * ```
    */
   public getMidiKey(note: Note): number {
      return this.tuning.midiKeyLookup(note.octave, note.semitone);
   }

   /**
    * @returns the tuning as a string
    * @example
    * ```javascript
    * const instrument = new Instrument();
    * console.log(instrument.toString()); // returns "Instrument Tuning(440)"
    * ```
    */
   public toString(): string {
      return `Instrument Tuning(${this.tuning.a4})`;
   }
}

export default Instrument;
