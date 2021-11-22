declare enum Halftone {
    A = 1,
    A$ = 2,
    Bb = 2,
    B = 3,
    B$ = 4,
    Cb = 3,
    C = 4,
    C$ = 5,
    Db = 5,
    D = 6,
    D$ = 7,
    Eb = 7,
    E = 8,
    E$ = 9,
    Fb = 8,
    F = 9,
    F$ = 10,
    Gb = 10,
    G = 11,
    G$ = 12,
    Ab = 12
}

interface INote {
    id?(id?: string): string;
    octave(octave?: number): number;
    tone(tone?: Halftone): Halftone;
}
interface INoteInitializer {
    tone?: Halftone;
    octave?: number;
}
declare class Note implements INote {
    id(id?: string): string;
    octave(octave?: number): number;
    tone(tone?: Halftone): Halftone;
    constructor(values: INoteInitializer);
    getMidiKey(): number;
}

declare enum Modifier {
    NATURAL = 0,
    SHARP = 1,
    FLAT = 2
}

declare const wrap: (value: number, lower: number, upper: number) => object;

export { Halftone, Modifier, Note, wrap };
