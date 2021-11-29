import Semitone from "../Semitone";
import ScaleInitializer from "./ScaleInitializer";
import Note from "../Note/Note";
import Entity from "../Entity";
declare class Scale implements Entity {
    constructor(values?: ScaleInitializer);
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
    private _key;
    get key(): Semitone;
    set key(value: Semitone);
    private _octave;
    get octave(): number;
    set octave(value: number);
    private _template;
    get template(): Array<number>;
    set template(value: Array<number>);
    private _notes;
    get notes(): Array<Note>;
    protected generateNotes(): void;
    degree(degree: number): Note;
    relativeMajor(): Scale;
    relativeMinor(): Scale;
    _shiftedInterval: number;
    shift(degrees?: number): Scale;
    shifted(degrees?: number): Scale;
    unshift(): Scale;
    unshifted(): Scale;
    ionian(): Scale;
    dorian(): Scale;
    phrygian(): Scale;
    lydian(): Scale;
    mixolydian(): Scale;
    aeolian(): Scale;
    locrian(): Scale;
}
export default Scale;
export type { ScaleInitializer };
