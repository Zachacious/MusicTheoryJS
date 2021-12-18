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

interface Entity {
    id: string;
    copy: () => Entity;
    equals: (entity: Entity) => boolean;
    toString: () => string;
}

/**
 * A musical note.
 * The primary fields are the semitone and octave.
 * The octave is clamped to the range [0, 9].
 * Setting the semitone to a value outside of the range [0, 11] will
 * wrap the semitone to the range [0, 11] and change the octave depending
 * on how many times the semitone has been wrapped.
 */
declare class Note implements Entity {
    /**
     * Creates a new Note instance.
     */
    constructor(values?: NoteInitializer | string);
    /**
     * unique id for this instance
     */
    id: string;
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
     * Returns a string version of this note
     */
    toString(): string;
    /**
     * Static methods to create whole notes easily.
     * the default octave is 4
     */
    static A(octave?: number): Note;
    static B(octave?: number): Note;
    static C(octave?: number): Note;
    static D(octave?: number): Note;
    static E(octave?: number): Note;
    static F(octave?: number): Note;
    static G(octave?: number): Note;
}

declare enum Modifier {
    FLAT = -1,
    NATURAL = 0,
    SHARP = 1
}

/**
 * Tuning component used by Instrument class
 * - containes the a4 tuning - default is 440Hz
 * - builds lookup tables for midi key and frequency
 * - based on the tuning
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

/**
 * Instrument class - used to represent an instrument
 * used to encapsulate the tuning and retrieving midi keys
 * and frequencies for notes
 */
declare class Instrument implements Entity {
    tuning: Tuning;
    /**
     * creates a new instance of an instrument with the given tuning or 440hz
     */
    constructor(a4Freq?: number);
    /**
     * unique id for this instance
     */
    id: string;
    copy(): Instrument;
    equals(other: Instrument): boolean;
    /**
     * returns the frequency of the given note
     */
    getFrequency(note: Note): number;
    /**
     * returns the midi key of the given note
     */
    getMidiKey(note: Note): number;
    /**
     * returns the tuning as a string
     */
    toString(): string;
}

declare type ScaleInitializer = {
    template?: Array<number>;
    key?: Semitone;
    octave?: number;
};

/**
 * A musical scale.
 * The primary fields are the semitone and octave.
 * The octave is clamped to the range [0, 9].
 * Setting the semitone to a value outside of the range [0, 11] will
 * wrap the semitone to the range [0, 11] and change the octave depending
 * on how many times the semitone has been wrapped.
 */
declare class Scale implements Entity {
    constructor(values?: ScaleInitializer | string);
    /**
     *  unique id for this scale
     */
    id: string;
    /**
     * Returns true if this scale is equal to the given scale
     */
    equals(scale: Scale): boolean;
    /**
     * Returns a copy of this Scale
     */
    copy(): Scale;
    /**
     * key
     */
    private _key;
    get key(): Semitone;
    set key(value: Semitone);
    /**
     * octave
     */
    private _octave;
    get octave(): number;
    set octave(value: number);
    /**
     * template
     */
    private _template;
    get template(): Array<number>;
    set template(value: Array<number>);
    /**
     * notes
     * notes are generated and cached as needed
     */
    private _notes;
    get notes(): Array<Note>;
    /**
     * generate notes(internal)
     * generates the notes for this scale
     */
    protected generateNotes(): void;
    /**
     * returns the names of the notes in the scale
     */
    getNoteNames(preferSharpKey?: boolean): string[];
    /**
     * degree
     * returns a note that represents the given degree
     */
    degree(degree: number): Note;
    /**
     * relative major
     * returns a new scale that is the relative major of this scale
     */
    relativeMajor(): Scale;
    /**
     * relative minor
     * returns a new scale that is the relative minor of this scale
     */
    relativeMinor(): Scale;
    /**
     * shift
     * shifts the scale by the given number of degrees
     */
    private _shiftedInterval;
    private _originalTemplate;
    shift(degrees?: number): Scale;
    /**
     * shifted
     * returns a copy of this scale shifted by the given number of degrees
     */
    shifted(degrees?: number): Scale;
    /**
     * unshift
     * shifts the original root back to the root position
     */
    unshift(): Scale;
    /**
     * unshifted
     * returns a copy of this scale with the tonic shifted back
     * to the root position
     */
    unshifted(): Scale;
    /**
     * returns the amount that the scale has shifted
     * (0 if not shifted)
     */
    shiftedInterval(): number;
    /**
     * Scale modes
     */
    ionian(): Scale;
    dorian(): Scale;
    phrygian(): Scale;
    lydian(): Scale;
    mixolydian(): Scale;
    aeolian(): Scale;
    locrian(): Scale;
    /**
     * returns string version of the scale
     */
    toString(): string;
    /**
     * attempts to lookup the note name for a scale efficiently
     */
    private static scaleNoteNameLookup;
    /**
     * creates a lookup table for all notes formatted as [A-G][#|b|s][0-9]
     */
    private static createNotesLookupTable;
    /**
     * creates the lookup table as soon as the module is loaded
     */
    private static _notesLookup;
    /**
     * used to initialize the lookup table
     */
    static init(): Promise<void>;
}

declare const ScaleTemplates: {
    [key: string]: number[];
};

declare type ChordInitializer = {
    root?: Semitone;
    octave?: number;
};

declare class Chord implements Entity {
    constructor(values?: ChordInitializer);
    /**
     * unique id for this instance
     */
    id: string;
    _root: Semitone;
    get root(): Semitone;
    set root(value: Semitone);
    _octave: number;
    get octave(): number;
    set octave(value: number);
    private _template;
    get template(): Array<number>;
    set template(value: Array<number>);
    /**
     * notes
     * notes are generated and cached as needed
     */
    private _notes;
    get notes(): Array<Note>;
    generateNotes(): void;
    copy(): Chord;
    equals(other: Chord): boolean;
}

declare const init: (initCB: () => (void | Promise<void>) | undefined) => void;
declare const initAsync: (initCB: () => (void | Promise<void>) | undefined) => Promise<void>;

export { Chord, Instrument, Modifier, Note, Scale, ScaleTemplates, Semitone, init, initAsync };
