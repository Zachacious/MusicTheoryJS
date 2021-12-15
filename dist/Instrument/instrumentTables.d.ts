/**
 * Tables - return type for create tables
 */
declare type Tables = {
    freqLookup: {
        [key: string]: number;
    };
    midiLookup: {
        [key: string]: number;
    };
};
/**
 * Creates and return lookup tables for midikey and frequency.
 */
declare const createTables: (a4Tuning?: number) => Tables;
export { createTables };
