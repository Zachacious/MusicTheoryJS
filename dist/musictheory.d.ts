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
/**
 * A musical note.
 * The primary fields are the semitone and octave.
 * The octave is clamped to the range [0, 9].
 * Setting the semitone to a value outside of the range [0, 11] will
 * wrap the semitone to the range [0, 11] and change the octave depending
 * on how many times the semitone has been wrapped.
 */
declare class Note {
    /**
     * Creates a new Note instance.
     */
    constructor(values: NoteInitializer);
    /**
     * semitone
     */
    private _tone;
    private _prevSemitone;
    get semitone(): Semitone;
    /**
     * setting the semitone with a number outside the
     * range of 0-11 will wrap the value around and
     * change the octave accordingly
     */
    set semitone(semitone: Semitone);
    /**
     * octave
     */
    private _octave;
    get octave(): number;
    /**
     * The octave is clamped to the range [0, 9].
     */
    set octave(octave: number);
    /**
     * Returns a new note that is a sharpened version of this note.
     * This is chainable - A().sharp().flat()
     */
    sharp(): Note;
    /**
     * Sharpens the note in place.
     * Returns itself for chaining - A().sharpen().sharp()
     */
    sharpen(): Note;
    /**
     *  attempts to determine if the note is sharp
     */
    isSharp(): boolean;
    /**
     * Returns a new note that is a flattened version of this note.
     * This is chainable - A().flat().flat()
     */
    flat(): Note;
    /**
     * Flattens the note in place.
     * Returns itself for chaining - A().flatten().flat()
     */
    flatten(): Note;
    /**
     *  attempts to determine if the note is flat
     */
    isFlat(): boolean;
    /**
     * Returns true if this note is equal to the given note
     */
    equals(note: Note): boolean;
    /**
     * Returns a copy of this note
     */
    copy(): Note;
    /**
     * Static methods to create whole notes easily.
     * the default octave is 4
     */
    static A(octave?: number): Note;
    static B(octave: number): Note;
    static C(octave: number): Note;
    static D(octave: number): Note;
    static E(octave: number): Note;
    static F(octave: number): Note;
    static G(octave: number): Note;
}

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

/**
 * attempts to parse a note from a string
 */
declare const noteParser: (note: string, supressWarning?: boolean) => NoteInitializer;

export { Modifier, Note, Semitone, noteParser, wrap };
