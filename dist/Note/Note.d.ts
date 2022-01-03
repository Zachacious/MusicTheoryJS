import Semitone from "../Semitone";
import NoteInitializer from "./NoteInitializer";
import { TONES_MAX, TONES_MIN, OCTAVE_MAX, OCTAVE_MIN } from "./noteConstants";
import Entity from "../Entity";
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
export default Note;
export { TONES_MAX, TONES_MIN, OCTAVE_MAX, OCTAVE_MIN };
export type { NoteInitializer };
