import Semitone from "../Semitone";
import NoteInitializer from "./NoteInitializer";
import { TONES_MAX, TONES_MIN, OCTAVE_MAX, OCTAVE_MIN } from "./noteConstants";
import Entity from "../Entity";
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
export default Note;
export { TONES_MAX, TONES_MIN, OCTAVE_MAX, OCTAVE_MIN };
export type { NoteInitializer };
