import Semitone from "../Semitone";
import ScaleInitializer from "./ScaleInitializer";
import Note from "../Note/Note";
import Entity from "../Entity";
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
}
export default Scale;
export type { ScaleInitializer };
