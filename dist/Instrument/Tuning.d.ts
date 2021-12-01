/**
 * Tuning component used by Instrument class
 * - containes the a4 tuning - default is 440Hz
 * - builds lookup tables for midi key and frequency
 * - based on the tuning
 */
declare class Tuning {
    /**
     * Creates the object and builds the lookup tables.
     */
    constructor(a4Freq?: number);
    /**
     * unique id for this instance
     */
    id: string;
    /**
     * a4 Tuning
     */
    private _a4;
    get a4(): number;
    /**
     * setting the tuning will rebuild the lookup tables
     */
    set a4(value: number);
    /**
     * lookup table for midi key
     */
    private _midiKeyTable;
    midiKeyLookup(octave: number, semitone: number): number;
    /**
     * lookup table for frequency
     */
    private _freqTable;
    freqLookup(octave: number, semitone: number): number;
    /**
     * Builds the lookup tables for midi key and frequency
     */
    private buildTables;
    /**
     * returns the tuning as a string
     */
    toString(): string;
}
export default Tuning;
