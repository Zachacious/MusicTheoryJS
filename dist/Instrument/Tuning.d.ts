import Entity from "../Entity";
/**
 * Tuning component used by Instrument class<br>
 * containes the a4 tuning - default is 440Hz<br>
 * builds lookup tables for midi key and frequency<br>
 * based on the tuning
 * @internal
 */
declare class Tuning implements Entity {
    /**
     * Creates the object and builds the lookup tables.
     */
    constructor(a4Freq?: number);
    /**
     * unique id for this instance
     */
    id: string;
    copy(): Tuning;
    equals(other: Tuning): boolean;
    /**
     * a4 Tuning
     */
    protected _a4: number;
    get a4(): number;
    /**
     * setting the tuning will rebuild the lookup tables
     */
    set a4(value: number);
    /**
     * lookup table for midi key
     */
    protected _midiKeyTable: {
        [key: string]: number;
    };
    midiKeyLookup(octave: number, semitone: number): number;
    /**
     * lookup table for frequency
     */
    protected _freqTable: {
        [key: string]: number;
    };
    freqLookup(octave: number, semitone: number): number;
    /**
     * Builds the lookup tables for midi key and frequency
     */
    protected buildTables(): void;
    /**
     * returns the tuning as a string
     */
    toString(): string;
}
export default Tuning;
