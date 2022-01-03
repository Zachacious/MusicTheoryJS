import Tuning from "./Tuning";
import Note from "../Note/Note";
import Entity from "../Entity";
/**
 * Instrument are used to encapsulate the tuning and retrieving of midi keys
 * and frequencies for notes
 *
 * @example
 * ```javascript
 * import { Instrument } from "musictheoryjs";
 */
declare class Instrument implements Entity {
    tuning: Tuning;
    /**
     * @param tuning A4 frequency - defaults to 440
     * @example
     * ```javascript
     * const instrument = new Instrument(); // default 440 tuning
     * ```
     */
    constructor(a4Freq?: number);
    /**
     * @returns a unique id for this instance
     * @example
     * ```javascript
     * const instrument = new Instrument();
     * instrument.id; // returns a unique id
     * ```
     */
    id: string;
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
    copy(): Instrument;
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
    equals(other: Instrument): boolean;
    /**
     * @returns the frequency of the given note
     * @example
     * ```javascript
     * const instrument = new Instrument();
     * instrument.getFrequency(new Note("C4")); // returns 261.6255653005986
     * ```
     */
    getFrequency(note: Note): number;
    /**
     * @returns the midi key of the given note
     * @example
     * ```javascript
     * const instrument = new Instrument();
     * instrument.getMidiKey(new Note("C4")); // returns 60
     * ```
     */
    getMidiKey(note: Note): number;
    /**
     * @returns the tuning as a string
     * @example
     * ```javascript
     * const instrument = new Instrument();
     * console.log(instrument.toString()); // returns "Instrument Tuning(440)"
     * ```
     */
    toString(): string;
}
export default Instrument;
