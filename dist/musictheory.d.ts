/**
 * Notes starting at C0 - zero index - 12 total
 */
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

/**
 * Describes the fields expected by the Note constrtuctor.
 */
declare type NoteInitializer = {
    semitone?: Semitone;
    octave?: number;
};

declare type CompositionObject = Record<string, unknown>;
declare const Note: (initializer?: string | NoteInitializer | undefined) => CompositionObject;

declare enum Modifier {
    FLAT = -1,
    NATURAL = 0,
    SHARP = 1
}

declare type wrappedNumber = {
    value: number;
    numWraps: number;
};
declare const wrap: (value: number, lower: number, upper: number) => wrappedNumber;

export { Modifier, Note, Semitone, wrap };
