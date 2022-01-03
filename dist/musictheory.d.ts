/**
 * Notes starting at C0 - zero index - 12 total
 * Maps note names to semitone values starting at C=0
 * @enum
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
 * Defines an interface that all entities must implement.
 * Includes common functionality for all entities.
 * @internal
 */
interface Entity {
    id: string;
    copy: () => Entity;
    equals: (entity: Entity) => boolean;
    toString: () => string;
}

/**
 * A note consist of a semitone and an octave.<br>
 *
 * @example
 * ```javascript
 * import { Note } from "musictheoryjs";
 * import { NoteInitializer } from "musictheoryjs"; // typescript only if needed
 * ```
 */
declare class Note implements Entity {
    /**
     * @example
     * ```javascript
     * import { Note } from "musictheoryjs";
     *
     * // creates a new note with default values semitone 0(C) and octave 4
     * const note = new Note();
     *
     * // creates a new note using an initializer object
     * const note = new Note({semitone: 4, octave: 5});
     *
     * // String parsing should follow the format: note-name[modifier][octave]
     * // creates a new note using a string
     * const note = new Note("C5");
     * ```
     */
    constructor(values?: NoteInitializer | string);
    /**
     *  unique id for this note(auto generated)
     * @example
     * ```javascript
     * const note = new Note();
     * console.log(note.id); // s2898snloj
     * ```
     */
    id: string;
    /**
     * semitone
     */
    protected _tone: Semitone;
    protected _prevSemitone: Semitone;
    /**
     * @example
     * ```javascript
     * const note = new Note();
     * console.log(note.semitone); // 0
     * ```
     */
    get semitone(): Semitone;
    /**
     * setting the semitone with a number outside the
     * range of 0-11 will wrap the value around and
     * change the octave accordingly
     * @example
     * ```javascript
     * const note = new Note();
     * note.semitone = 4;// E
     * console.log(note.semitone); // 4(E)
     * ```
     */
    set semitone(semitone: Semitone);
    /**
     * octave
     */
    protected _octave: number;
    /**
     * @example
     * ```javascript
     * const note = new Note();
     * console.log(note.octave); // 4
     * ```
     */
    get octave(): number;
    /**
     * The octave is clamped to the range [0, 9].
     * @example
     * ```javascript
     * const note = new Note();
     * note.octave = 10;
     * console.log(note.octave); // 9(because of clamping)
     * ```
     */
    set octave(octave: number);
    /**
     * @chainable
     * @returns a new note that is a sharpened version of this note.
     * @example
     * ```javascript
     * const note = new Note(); // default semitone is 0(C)
     * const note2 = note.sharp();
     * console.log(note2.semitone); // 1(C#)
     * ```
     */
    sharp(): Note;
    /**
     * Sharpens the note in place.
     * @chainable
     * @example
     * ```javascript
     * const note = new Note(); // default semitone is 0(C)
     * note.sharpen();
     * console.log(note.semitone); // 1(C#)
     */
    sharpen(): Note;
    /**
     *  attempts to determine if the note is sharp
     * @returns true if the note is sharp
     * @example
     * ```javascript
     * const note = new Note(); // default semitone is 0(C)
     * console.log(note.isSharp()); // false
     * note.sharpen();
     * console.log(note.isSharp()); // true
     * ```
     */
    isSharp(): boolean;
    /**
     * Returns a new note that is a flattened version of this note.
     * @chainable
     * @returns a new note that is a flattened version of this note.
     * @example
     * ```javascript
     * const note = new Note(); // default semitone is 0(C)
     * const note2 = note.flat();
     * console.log(note2.semitone); // 3(Eb)
     * ```
     */
    flat(): Note;
    /**
     * Flattens the note in place.
     * @chainable
     * @example
     * ```javascript
     * const note = new Note({semitone: 4}); //  semitone is 4(E)
     * note.flatten();
     * console.log(note.semitone); // 3(Eb)
     * ```
     */
    flatten(): Note;
    /**
     *  attempts to determine if the note is flat
     * @returns true if the note is flat
     * @example
     * ```javascript
     * const note = new Note(); // default semitone is 0(C)
     * console.log(note.isFlat()); // false
     * note.flatten();
     * console.log(note.isFlat()); // true
     * ```
     */
    isFlat(): boolean;
    /**
     * @returns true if this note is equal to the given note
     * @example
     * ```javascript
     * const note = new Note();
     * const note2 = new Note();
     * console.log(note.equals(note2)); // true
     * ```
     */
    equals(note: Note): boolean;
    /**
     * @returns a copy of this note
     * @example
     * ```javascript
     * const note = new Note(); // default semitone is 0(C)
     * const note2 = note.copy();
     * console.log(note.equals(note2)); // true
     * ```
     */
    copy(): Note;
    /**
     * Returns a string version of this note
     * @example
     * ```javascript
     * const note = new Note(); // default semitone is 0(C)
     * console.log(note.toString()); // C4
     * ```
     *
     */
    toString(): string;
    /**
     * Static methods to create whole notes easily.
     * the default octave is 4
     */
    /**
     * @static
     * @param octave
     * @returns note set to A[octave]
     * @example
     * ```javascript
     * const note = Note.A();
     * console.log(note.toString()); // A4
     * ```
     */
    static A(octave?: number): Note;
    /**
     *
     * @static
     * @param octave
     * @returns note set to B[octave]
     * @example
     * ```javascript
     * const note = Note.B();
     * console.log(note.toString()); // B4
     * ```
     */
    static B(octave?: number): Note;
    /**
     *
     * @static
     * @param octave
     * @returns note set to C[octave]
     * @example
     * ```javascript
     * const note = Note.C();
     * console.log(note.toString()); // C4
     * ```
     */
    static C(octave?: number): Note;
    /**
     *
     * @static
     * @param octave
     * @returns note set to D[octave]
     * @example
     * ```javascript
     * const note = Note.D();
     * console.log(note.toString()); // D4
     * ```
     */
    static D(octave?: number): Note;
    /**
     *
     * @static
     * @param octave
     * @returns note set to E[octave]
     * @example
     * ```javascript
     * const note = Note.E();
     * console.log(note.toString()); // E4
     * ```
     */
    static E(octave?: number): Note;
    /**
     *
     * @static
     * @param octave
     * @returns note set to F[octave]
     * @example
     * ```javascript
     * const note = Note.F();
     * console.log(note.toString()); // F4
     * ```
     */
    static F(octave?: number): Note;
    /**
     *
     * @static
     * @param octave
     * @returns note set to G[octave]
     * @example
     * ```javascript
     * const note = Note.G();
     * console.log(note.toString()); // G4
     * ```
     */
    static G(octave?: number): Note;
}

/**
 * Maps note alterations to  their relative mathmatical value
 *@enum
 */
declare enum Modifier {
    FLAT = -1,
    NATURAL = 0,
    SHARP = 1
}

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

/**
 * The type used to initialize a scale
 */
declare type ScaleInitializer = {
    template?: Array<number>;
    key?: Semitone;
    octave?: number;
};

/**
 * Scales consist of a key(tonic or root) and a template(array of integers) that
 * <br> represents the interval of steps between each note.
 * <br><br>Scale intervals are represented by an integer
 * <br>that is the number of semitones between each note.
 * <br>0 = key - will always represent the tonic
 * <br>1 = half step
 * <br>2 = whole step
 * <br>3 = one and one half steps
 * <br>4 = double step
 * <br>[0, 2, 2, 1, 2, 2, 2] represents the major scale
 * <br><br> Scale templates may have arbitray lengths
 *
 * The following Pre-defined templates are available:
 * <table>
 * <tr>
 * <td>major</td>
 * <td>minor</td>
 * <td>ionian</td>
 * <td>dorian</td>
 * </tr><tr>
 * <td>phrygian</td>
 * <td>lydian</td>
 * <td>mixolydian</td>
 * <td>aeolian</td>
 * </tr><tr>
 * <td>locrian</td>
 * <td>enigmaticMajor</td>
 * <td>enigmaticMinor</td>
 * <td>minor7b5</td>
 * </tr><tr>
 * <td>major7s4s5</td>
 * <td>harmonicMajor</td>
 * <td>harmonicMinor</td>
 * <td>doubleHarmonic</td>
 * </tr><tr>
 * <td>melodicMinorAscending</td>
 * <td>melodicMinorDescending</td>
 * <td>majorPentatonic</td>
 * <td>majorPentatonicBlues</td>
 * </tr><tr>
 * <td>minorPentatonic</td>
 * <td>minorPentatonicBlues</td>
 * <td>b5Pentatonic</td>
 * <td>minor6Pentatonic</td>
 * </tr><tr>
 * <td>dim8Tone</td>
 * <td>dom8Tone</td>
 * <td>neopolitanMajor</td>
 * <td>neopolitanMinor</td>
 * </tr><tr>
 * <td>hungarianMajor</td>
 * <td>hungarianMinor</td>
 * <td>hungarianGypsy</td>
 * <td>spanish</td>
 * </tr><tr>
 * <td>spanish8Tone</td>
 * <td>spanishGypsy</td>
 * <td>augmented</td>
 * <td>dominantSuspended</td>
 * </tr><tr>
 * <td>bebopMajor</td>
 * <td>bebopDominant</td>
 * <td>mystic</td>
 * <td>overtone</td>
 * </tr><tr>
 * <td>leadingTone</td>
 * <td>hirojoshi</td>
 * <td>japaneseA</td>
 * <td>japaneseB</td>
 * </tr><tr>
 * <td>oriental</td>
 * <td>arabian</td>
 * <td>persian</td>
 * <td>balinese</td>
 * </tr><tr>
 * <td>kumoi</td>
 * <td>pelog</td>
 * <td>algerian</td>
 * <td>chinese</td>
 * </tr><tr>
 * <td>mongolian</td>
 * <td>egyptian</td>
 * <td>hindu</td>
 * <td>romanian</td>
 * </tr><tr>
 * <td>hindu</td>
 * <td>insen</td>
 * <td>iwato</td>
 * <td>scottish</td>
 * </tr><tr>
 * <td>yo</td>
 * <td>istrian</td>
 * <td>ukranianDorian</td>
 * <td>petrushka</td>
 * </tr><tr>
 * <td>ahavaraba</td>
 * <td>halfDiminished</td>
 * <td>jewish</td>
 * <td>byzantine</td>
 * </tr><tr>
 * <td>acoustic</td>
 * </table>
 *
 * @example
 * ```javascript
 * import {Scale} from 'musictheoryjs';
 * import {ScaleTemplates} from 'musictheoryjs';
 * import {ScaleInitializer} from 'musictheoryjs'; // TypeScript only if needed
 * ```
 */
declare class Scale implements Entity {
    /**
     * @example
     * ```javascript
     * import {Scale, ScaleTemplates} from 'musictheoryjs';
     *
     * // creates a scale with the default template, key 0f 0(C) and an octave of 4
     * const scale = new Scale();
     *
     * // creates a scale with the template [0, 2, 2, 1, 2, 2, 2] and key 4(E) and octave 5
     * const scale2 = new Scale({key: 4, octave: 5, template: ScaleTemplates.major});
     *
     *
     * // String parsing should follow the format: note-name[alteration][octave][(scale-name)]
     * // creates a scale with the minor template, key Gb and an octave of 7
     * const scale3 = new Scale('Gb7(minor)');
     * ```
     */
    constructor(values?: ScaleInitializer | string);
    /**
     *  unique id for this scale(auto generated)
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.id); // dhlkj5j322
     * ```
     */
    id: string;
    /**
     * Returns true if this scale is equal to the given scale
     * @param scale - the scale to compare to
     * @returns true if the scales are equal
     * @example
     * ```javascript
     * const scale = new Scale();
     * const scale2 = new Scale();
     * console.log(scale.equals(scale2)); // true
     * ```
     */
    equals(scale: Scale): boolean;
    /**
     * Returns a copy of this Scale
     * @chainable
     * @returns a copy of this Scale
     * @example
     * ```javascript
     * const scale = new Scale();
     * const scale2 = scale.copy();
     * console.log(scale.equals(scale2)); // true
     * ```
     */
    copy(): Scale;
    /**
     * key
     */
    protected _key: Semitone;
    /**
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.key); // 0(semitone)
     * ```
     */
    get key(): Semitone;
    /**
     * Setting the semitone to a value outside of the range [0, 11](semitone) will<br/>
     * wrap the semitone to the range [0, 11] and change the octave depending<br/>
     * on how many times the semitone has been wrapped.
     * @example
     * ```javascript
     * const scale = new Scale();
     * scale.key = 4;
     * console.log(scale.key); // 4
     * ```
     */
    set key(value: Semitone);
    /**
     * octave
     */
    protected _octave: number;
    /**
     * The octave is clamped to the range [0, 9].
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.octave); // 4
     * ```
     */
    get octave(): number;
    /**
     * @example
     * ```javascript
     * const scale = new Scale();
     * scale.octave = 5;
     * console.log(scale.octave); // 5
     * ```
     */
    set octave(value: number);
    /**
     * template
     */
    protected _template: Array<number>;
    /**
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.template); // [0, 2, 2, 1, 2, 2, 2]
     * ```
     */
    get template(): Array<number>;
    /**
     * The following Pre-defined templates are available:
     * <table>
     * <tr>
     * <td>major</td>
     * <td>minor</td>
     * <td>ionian</td>
     * <td>dorian</td>
     * </tr><tr>
     * <td>phrygian</td>
     * <td>lydian</td>
     * <td>mixolydian</td>
     * <td>aeolian</td>
     * </tr><tr>
     * <td>locrian</td>
     * <td>enigmaticMajor</td>
     * <td>enigmaticMinor</td>
     * <td>minor7b5</td>
     * </tr><tr>
     * <td>major7s4s5</td>
     * <td>harmonicMajor</td>
     * <td>harmonicMinor</td>
     * <td>doubleHarmonic</td>
     * </tr><tr>
     * <td>melodicMinorAscending</td>
     * <td>melodicMinorDescending</td>
     * <td>majorPentatonic</td>
     * <td>majorPentatonicBlues</td>
     * </tr><tr>
     * <td>minorPentatonic</td>
     * <td>minorPentatonicBlues</td>
     * <td>b5Pentatonic</td>
     * <td>minor6Pentatonic</td>
     * </tr><tr>
     * <td>dim8Tone</td>
     * <td>dom8Tone</td>
     * <td>neopolitanMajor</td>
     * <td>neopolitanMinor</td>
     * </tr><tr>
     * <td>hungarianMajor</td>
     * <td>hungarianMinor</td>
     * <td>hungarianGypsy</td>
     * <td>spanish</td>
     * </tr><tr>
     * <td>spanish8Tone</td>
     * <td>spanishGypsy</td>
     * <td>augmented</td>
     * <td>dominantSuspended</td>
     * </tr><tr>
     * <td>bebopMajor</td>
     * <td>bebopDominant</td>
     * <td>mystic</td>
     * <td>overtone</td>
     * </tr><tr>
     * <td>leadingTone</td>
     * <td>hirojoshi</td>
     * <td>japaneseA</td>
     * <td>japaneseB</td>
     * </tr><tr>
     * <td>oriental</td>
     * <td>arabian</td>
     * <td>persian</td>
     * <td>balinese</td>
     * </tr><tr>
     * <td>kumoi</td>
     * <td>pelog</td>
     * <td>algerian</td>
     * <td>chinese</td>
     * </tr><tr>
     * <td>mongolian</td>
     * <td>egyptian</td>
     * <td>hindu</td>
     * <td>romanian</td>
     * </tr><tr>
     * <td>hindu</td>
     * <td>insen</td>
     * <td>iwato</td>
     * <td>scottish</td>
     * </tr><tr>
     * <td>yo</td>
     * <td>istrian</td>
     * <td>ukranianDorian</td>
     * <td>petrushka</td>
     * </tr><tr>
     * <td>ahavaraba</td>
     * <td>halfDiminished</td>
     * <td>jewish</td>
     * <td>byzantine</td>
     * </tr><tr>
     * <td>acoustic</td>
     * </table>
     * @example
     * ```javascript
     * const scale = new Scale();
     * scale.template = [0, 2, 2, 1, 2, 2, 2];
     * console.log(scale.template); // [0, 2, 2, 1, 2, 2, 2]
     * ```
     */
    set template(value: Array<number>);
    /**
     * notes
     * notes are generated and cached as needed
     */
    protected _notes: Array<Note>;
    protected _notesDirty: boolean;
    /**
     * will generate the notes if needed or return the cached notes
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.notes); // List of notes
     * ```
     */
    get notes(): Array<Note>;
    /**
     * generate notes(internal)
     * generates the notes for this scale
     */
    protected generateNotes(): void;
    /**
     * returns the names of the notes in the scale
     * @param preferSharpKeys - if true then sharps will be preferred over flats when semitones could be either - ex: Bb/A#
     * @returns the names of the notes in the scale
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.names); // ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']
     * ```
     */
    getNoteNames(preferSharpKey?: boolean): string[];
    /**
     * degree
     * returns a note that represents the given degree
     * @param degree - the degree to return
     * @returns a note that represents the given degree
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.degree(0)); // C4(Note)
     * console.log(scale.degree(1)); // D4(Note) etc
     * ```
     */
    degree(degree: number): Note;
    /**
     * relative major
     * returns a new scale that is the relative major of this scale - takes the 3rd degree as it's key
     * @chainable
     * @returns a new scale that is the relative major of this scale
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.relativeMajor()); // Scale
     * ```
     */
    relativeMajor(): Scale;
    /**
     * relative minor
     * returns a new scale that is the relative minor of this scale - takes the 6th degree as it's key
     * @chainable
     * @returns a new scale that is the relative minor of this scale
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.relativeMinor()); // Scale
     * ```
     */
    relativeMinor(): Scale;
    /**
     * shift
     */
    protected _shiftedInterval: number;
    protected _originalTemplate: Array<number>;
    /**
     * shift
     * shifts the scale by the given number of degrees
     * @chainable
     * @param shift - the number of degrees to shift the scale
     * @returns a new scale that is the shifted scale
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.shift(1)); // Scale
     * ```
     */
    shift(degrees?: number): Scale;
    /**
     * shifted
     * returns a copy of this scale shifted by the given number of degrees
     * @chainable
     * @param degrees - the number of degrees to shift the scale
     * @returns a copy of this scale shifted by the given number of degrees
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.shifted(1)); // Scale(copy)
     * ```
     */
    shifted(degrees?: number): Scale;
    /**
     * unshift
     * shifts the original root back to the root position
     * @chainable
     * @returns this scale after unshifting it back to the original root position
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.shift(1));
     * console.log(scale.unshift());
     * ```
     */
    unshift(): Scale;
    /**
     * unshifted
     * returns a copy of this scale with the tonic shifted back
     * to the root position
     * @chainable
     * @returns a copy of this scale with the tonic shifted back
     * to the root position
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.shift(1));
     * console.log(scale.unshifted()); // Scale(copy)
     * ```
     */
    unshifted(): Scale;
    /**
     * returns the amount that the scale has shifted
     * (0 if not shifted)
     * @returns the amount that the scale has shifted
     * (0 if not shifted)
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.shift(1));
     * console.log(scale.shifted()); // 1
     * ```
     */
    shiftedInterval(): number;
    /**
     * Scale modes
     */
    /**
     * @chainable
     * @returns a copy of this scale in the Ionian(major) mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.ionian()); // Scale(copy)
     * ```
     */
    ionian(): Scale;
    /**
     * @chainable
     * @returns a copy of this scale in the Dorian mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.dorian()); // Scale(copy)
     * ```
     */
    dorian(): Scale;
    /**
     * @chainable
     * @returns a copy of this scale in the Phrygian mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.phrygian()); // Scale(copy)
     * ```
     */
    phrygian(): Scale;
    /**
     * @chainable
     * @returns a copy of this scale in the Lydian mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.lydian()); // Scale(copy)
     * ```
     */
    lydian(): Scale;
    /**
     * @chainable
     * @returns a copy of this scale in the Mixolydian mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.mixolydian()); // Scale(copy)
     * ```
     */
    mixolydian(): Scale;
    /**
     * @chainable
     * @returns a copy of this scale in the Aeolian(minor) mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.aeolian()); // Scale(copy)
     * ```
     */
    aeolian(): Scale;
    /**
     * @chainable
     * @returns a copy of this scale in the Locrian mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.locrian()); // Scale(copy)
     * ```
     */
    locrian(): Scale;
    /**
     * returns string version of the scale
     * @returns string version of the scale
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.toString()); // 'C'
     * ```
     */
    toString(): string;
    /**
     * attempts to lookup the note name for a scale efficiently
     * @static
     * @param scale - the scale to lookup
     * @param preferSharpKey - if true, will prefer sharp keys over flat keys
     * @returns the note name for the scale
     * @internal
     */
    protected static scaleNoteNameLookup(scale: Scale, preferSharpKey?: boolean): string[];
    /**
     * creates a lookup table for all notes formatted as [A-G][#|b|s][0-9]
     */
    protected static createNotesLookupTable(): {
        [key: string]: string[];
    };
    /**
     * creates the lookup table as soon as the module is loaded
     */
    protected static _notesLookup: {
        [key: string]: string[];
    };
    /**
     * used to initialize the lookup table
     * @internal
     */
    static init(): Promise<void>;
}

/**
 * Maps predefined scales to their names.
 */
declare const ScaleTemplates: {
    [key: string]: number[];
};

/**
 * represents an array of intervals<br>
 * can have single integers like [0, 2, 4, 5, 7, 9, 11]<br>
 * or can have a neted array represent a modifier for the note<br>
 * like [1, [2, Modifier.flat], 4, 5, [7, Modifier.flat], 9, [11, Modifier.sharp]]
 * @type
 * [['Chord']]
 */
declare type ChordInterval = number | number[];

/**
 * Used to initialize a chord
 */
declare type ChordInitializer = {
    root?: Semitone;
    octave?: number;
    template?: ChordInterval[];
};

/**
 * Chords consist of a root note, octave, chord template, and a base scale.<br><br>
 * The chord template is an array of integers, each integer representing<br>
 *  a scale degree from the base scale(defaults to major).<br>
 * The default template is the I,III,V denoted as [1,3,5]<br>
 * ChordIntervals used in templates can also contain a modifier,<br>
 * for a particular scale degree, such as [1,3,[5, -1]]<br>
 * where -1 is flat, 0 is natural, and 1 is sharp.<br>
 * It could also be written as [1,3,[5, modifier.flat]]<br>
 * if you import modifier.
 *
 * The following predefined templates are available:<br>
 * <table>
 * <tr>
 * <td>maj</td>
 * <td>maj4</td>
 * <td>maj6</td>
 * <td>maj69</td>
 * </tr><tr>
 * <td>maj7</td>
 * <td>maj9</td>
 * <td>maj11</td>
 * <td>maj13</td>
 * </tr><tr>
 * <td>maj7s11</td>
 * <td>majb5</td>
 * <td>min</td>
 * <td>min4</td>
 * </tr><tr>
 * <td>min6</td>
 * <td>min7</td>
 * <td>minAdd9</td>
 * <td>min69</td>
 * </tr><tr>
 * <td>min9</td>
 * <td>min11</td>
 * <td>min13</td>
 * <td>min7b5</td>
 * </tr><tr>
 * <td>dom7</td>
 * <td>dom9</td>
 * <td>dom11</td>
 * <td>dom13</td>
 * </tr><tr>
 * <td>dom7s5</td>
 * <td>dom7b5</td>
 * <td>dom7s9</td>
 * <td>dom7b9</td>
 * </tr><tr>
 * <td>dom9b5</td>
 * <td>dom9s5</td>
 * <td>dom7s11</td>
 * <td>dom7s5s9</td>
 * </tr><tr>
 * <td>dom7s5b9</td>
 * <td>dim</td>
 * <td>dim7</td>
 * <td>aug</td>
 * </tr><tr>
 * <td>sus2</td>
 * <td>sus4</td>
 * <td>fifth</td>
 * <td>b5</td>
 * </tr><tr>
 * <td>s11</td>
 * </tr>
 * </table>
 *
 * @example
 * ```javascript
 * import { Chord } from "musictheoryjs";
 * import {ChordTemplate} from "musictheoryjs";
 * import {ChordInterval} from "musictheoryjs";
 * import {Modifier} from "musictheoryjs";
 * import {ChordInitializer} from "musictheoryjs";// Typescript only if needed
 * ```
 */
declare class Chord implements Entity {
    /**
     * @example
     * ```javascript
     * import { Chord, ChordTemplates, Modifier } from "musictheoryjs";
     *
     * //creates a chord with the default(1,3,5) template, root of C, in the 4th octave
     * const chord = new Chord();
     *
     * // creates a chord with the pre-defined diminished template, root of Eb, in the 5th octave
     * const chord = new Chord({root: 3, octave: 5, template: ChordTemplates.dim});
     *
     * // String parsing should follow the format: (root-note-name[s,#,b][octave])[chord-template-name|[chord-quality][modifiers]]
     * // creates a chord from a string
     * const chord = new Chord('(D4)min4');
     * ```
     */
    constructor(values?: ChordInitializer | string);
    /**
     * unique id for this instance
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.id); // hal8934hll
     * ```
     */
    id: string;
    /**
     * root
     */
    protected _root: Semitone;
    /**
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.root); // 0(semitone)
     * ```
     */
    get root(): Semitone;
    /**
     * Setting the root to a value outside of the range [0, 11](semitone) will<br/>
     * wrap the semitone to the range [0, 11] and change the octave depending<br/>
     * on how many times the semitone has been wrapped.
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.root = 4; // sets the root to 4th semitone(E)
     * console.log(chord.root); // 4(semitone)
     * ```
     */
    set root(value: Semitone);
    /**
     * base scale
     */
    protected _baseScale: Scale;
    /**
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.baseScale); // prints the default scale(major)
     * ```
     */
    get baseScale(): Scale;
    /**
     * Not a lot of good reasons to change this except for experimentation
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.baseScale = new Scale({ key: 3, octave: 5, template: [1, [3, Modifier.flat], 5] });
     * console.log(chord.baseScale); // prints the minor scale
     * ```
     */
    set baseScale(value: Scale);
    /**
     * octave
     */
    protected _octave: number;
    /**
     * The octave is clamped to the range [0, 9].
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.octave); // 4(octave)
     * ```
     */
    get octave(): number;
    /**
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.octave = 5; // sets the octave to 5th
     * console.log(chord.octave); // 5(octave)
     * ```
     */
    set octave(value: number);
    /**
     * template
     */
    protected _template: ChordInterval[];
    /**
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.template); // prints the default template
     * ```
     */
    get template(): ChordInterval[];
    /**
     * The following predefined templates are available:<br>
     * <table>
     * <tr>
     * <td>maj</td>
     * <td>maj4</td>
     * <td>maj6</td>
     * <td>maj69</td>
     * </tr><tr>
     * <td>maj7</td>
     * <td>maj9</td>
     * <td>maj11</td>
     * <td>maj13</td>
     * </tr><tr>
     * <td>maj7s11</td>
     * <td>majb5</td>
     * <td>min</td>
     * <td>min4</td>
     * </tr><tr>
     * <td>min6</td>
     * <td>min7</td>
     * <td>minAdd9</td>
     * <td>min69</td>
     * </tr><tr>
     * <td>min9</td>
     * <td>min11</td>
     * <td>min13</td>
     * <td>min7b5</td>
     * </tr><tr>
     * <td>dom7</td>
     * <td>dom9</td>
     * <td>dom11</td>
     * <td>dom13</td>
     * </tr><tr>
     * <td>dom7s5</td>
     * <td>dom7b5</td>
     * <td>dom7s9</td>
     * <td>dom7b9</td>
     * </tr><tr>
     * <td>dom9b5</td>
     * <td>dom9s5</td>
     * <td>dom7s11</td>
     * <td>dom7s5s9</td>
     * </tr><tr>
     * <td>dom7s5b9</td>
     * <td>dim</td>
     * <td>dim7</td>
     * <td>aug</td>
     * </tr><tr>
     * <td>sus2</td>
     * <td>sus4</td>
     * <td>fifth</td>
     * <td>b5</td>
     * </tr><tr>
     * <td>s11</td>
     * </tr>
     * </table>
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.template = [1, [3, Modifier.flat], 5]; // sets the template to a minor chord
     * console.log(chord.template); // prints the new template
     * ```
     */
    set template(value: ChordInterval[]);
    /**
     * notes
     * notes are generated and cached as needed
     */
    protected _notes: Array<Note>;
    protected _notesDirty: boolean;
    /**
     * will generate notes if needed or return the cached notes
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.notes); // prints the default notes
     * ```
     */
    get notes(): Array<Note>;
    /**
     * generate notes(internal)
     * generates the notes for this scale
     */
    protected generateNotes(): Note[];
    /**
     * @returns the note names -> ['C4', 'E4', 'G4']
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.getNoteNames()); // ['C4', 'E4', 'G4']
     * ```
     */
    getNoteNames(): string[];
    /**
     * @chainable
     * @returns a copy of the chord
     * @example
     * ```javascript
     * const chord = new Chord();
     * const copy = chord.copy();
     * console.log(chord.equals(copy)); // true
     * ```
     */
    copy(): Chord;
    /**
     * @param other the other chord to compare to
     * @returns true if the two chords are equal
     * @example
     * ```javascript
     * const chord = new Chord();
     * const copy = chord.copy();
     * console.log(chord.equals(copy)); // true
     * ```
     */
    equals(other: Chord): boolean;
    /**
     * mutates the chord in place
     * @chainable
     * @returns the chord with a natrual 3rd
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.minor();
     * chord.major();
     * console.log(chord.template); // [1,3,5]
     * ```
     */
    major(): Chord;
    /**
     * @chainable
     * @returns a copy of the chord with a natural 3rd
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.minor();
     * const copy = chord.majored();
     * console.log(copy.template); // [1,3,5]
     * ```
     */
    majored(): Chord;
    /**
     * @returns true if the chord has a natural 3rd
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.isMajor()); // true
     * ```
     */
    isMajor(): boolean;
    /**
     *  mutates the chord in place
     * @chainable
     * @returns the chord with a flat 3rd
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.minor();
     * console.log(chord.template); // [1,[3,-1],5]
     * ```
     */
    minor(): Chord;
    /**
     * @chainable
     * @returns a copy of the chord with a flat 3rd
     * @example
     * ```javascript
     * const chord = new Chord();
     * const copy = chord.minored();
     * console.log(copy.template); // [1,[3,-1],5]
     * ```
     */
    minored(): Chord;
    /**
     * @returns true if the chord has a flat 3rd
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.isMinor()); // false
     * chord.minor();
     * console.log(chord.isMinor()); // true
     * ```
     */
    isMinor(): boolean;
    /**
     * Mutates the chord in place
     * @chainable
     * @returns the chord with a sharp 5th
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.augment();
     * console.log(chord.template); // [1, 3, [5, Modifier.sharp]]
     * ```
     */
    augment(): Chord;
    /**
     * @chainable
     * @returns a copy of the chord with a sharp 5th
     * @example
     * ```javascript
     * const chord = new Chord();
     * const copy = chord.augmented();
     * console.log(copy.template); // [1, 3, [5, Modifier.sharp]]
     * ```
     */
    augmented(): Chord;
    /**
     * @returns true if the chord has a sharp 5th
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.isAugmented()); // false
     * chord.augment();
     * console.log(chord.isAugmented()); // true
     * ```
     */
    isAugmented(): boolean;
    /**
     * Mutates the chord in place
     * @chainable
     * @returns the chord with a flat 5th
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.diminish();
     * console.log(chord.template); // [1, 3, [5, Modifier.flat]]
     * ```
     */
    diminish(): Chord;
    /**
     * @chainable
     * @returns a copy of the chord with a flat 5th
     * @example
     * ```javascript
     * const chord = new Chord();
     * const copy = chord.diminished();
     * console.log(copy.template); // [1, 3, [5, Modifier.flat]]
     * ```
     */
    diminished(): Chord;
    /**
     * @returns true if the chord has a flat 5th
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.isDiminished()); // false
     * chord.diminish();
     * console.log(chord.isDiminished()); // true
     * ```
     */
    isDiminished(): boolean;
    /**
     * Mutates the chord in place
     * @chainable
     * @returns the chord with a flat 3,5, and 7th
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.halfDiminish();
     * console.log(chord.template); // [1, [3, Modifier.flat], [5, Modifier.flat], [7, Modifier.flat]]
     *
     */
    halfDiminish(): Chord;
    /**
     * @chainable
     * @returns a copy of the chord with a flat 3,5, and 7th
     * @example
     * ```javascript
     * const chord = new Chord();
     * const copy = chord.halfDiminished();
     * console.log(copy.template); // [1, 3, [5, Modifier.flat], [7, Modifier.flat]]
     */
    halfDiminished(): Chord;
    /**
     * @returns true if the chord has a flat 3,5, and 7th
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.isHalfDiminished()); // false
     * chord.halfDiminish();
     * console.log(chord.isHalfDiminished()); // true
     */
    isHalfDiminished(): boolean;
    /**
     * Mutates the chord in place
     * @chainable
     * @returns the chord with with the first note moved to the end up one octave
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.template); // [1,3,5]
     * console.log(chord.getNoteNames()); // ['C4', 'E4', 'G4']
     * chord.invert();
     * console.log(chord.template); // [3,5,1]
     * console.log(chord.getNoteNames()); // ['E4', 'G4', 'C5']
     * ```
     */
    invert(): Chord;
    /**
     * @chainable
     * @returns a copy of the chord with with the first note moved to the end up one octave
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.template); // [1,3,5]
     * console.log(chord.getNoteNames()); // ['C4', 'E4', 'G4']
     * const copy = chord.inverted();
     * console.log(copy.template); // [3,5,1]
     * console.log(copy.getNoteNames()); // ['E4', 'G4', 'C5']
     * ```
     */
    inverted(): Chord;
    /**
     * @returns the string form of the chord
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.toString()); // '(C4)maj'
     * ```
     */
    toString(): string;
}

/**
 * Chord templates
 * @internal
 */
declare const ChordTemplates: {
    [key: string]: ChordInterval[];
};

export { Chord, ChordInitializer, ChordInterval, ChordTemplates, Instrument, Modifier, Note, NoteInitializer, Scale, ScaleInitializer, ScaleTemplates, Semitone };
