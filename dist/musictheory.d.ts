declare enum Semitone {
    A = 9,
    As = 10,
    Bb = 10,
    B = 11,
    Bs = 0,
    Cb = 11,
    C = 0,
    Cs = 1,
    Db = 1,
    D = 2,
    Ds = 3,
    Eb = 3,
    E = 4,
    Es = 5,
    Fb = 4,
    F = 5,
    Fs = 6,
    Gb = 6,
    G = 7,
    Gs = 8,
    Ab = 8
}

interface INote {
    id?(id?: string): string;
    octave(octave?: number): number;
    tone(tone?: Semitone): Semitone;
}
declare type INoteInitializer = {
    tone?: Semitone;
    octave?: number;
};
declare class Note implements INote {
    id(id?: string): string;
    octave(octave?: number): number;
    tone(tone?: Semitone): Semitone;
    constructor(values: INoteInitializer);
    midiKey(): number;
    frequency(): number;
}

declare enum Modifier {
    NATURAL = 0,
    SHARP = 1,
    FLAT = 2
}

/**************************************************
 * Return type for wrap.
 *
 * @typedef {Object} wrappedNumber
 * @property {number} value - The wrapped value.
 * @property {number} numWraps - The number of times the value wrapped.
 */
declare type wrappedNumber = {
    value: number;
    numWraps: number;
};
/**************************************************
 * Wraps a number between a min and max value.
 *
 * @param value - The value to wrap.
 * @param lower - The lower bound of the range.
 * @param upper - The upper bound of the range.
 * @returns - The wrapped value.
 */
declare const wrap: (value: number, lower: number, upper: number) => wrappedNumber;

export { Modifier, Note, Semitone, wrap };
