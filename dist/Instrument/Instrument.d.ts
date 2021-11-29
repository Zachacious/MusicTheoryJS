import Tuning from "./Tuning";
import Note from "../Note/Note";
/**
 * Instrument class - used to represent an instrument
 * used to encapsulate the tuning and retrieving midi keys
 * and frequencies for notes
 */
declare class Instrument {
    tuning: Tuning;
    /**
     * creates a new instance of an instrument with the given tuning or 440hz
     */
    constructor(a4Freq?: number);
    /**
     * unique id for this instance
     */
    id: string;
    /**
     * returns the frequency of the given note
     */
    getFrequency(note: Note): number;
    /**
     * returns the midi key of the given note
     */
    getMidiKey(note: Note): number;
}
export default Instrument;
