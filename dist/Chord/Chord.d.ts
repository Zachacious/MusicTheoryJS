import Entity from "../Entity";
import { Semitone } from "..";
import ChordInitializer from "./ChordInitializer";
import Note from "../Note/Note";
import ChordInterval from "./ChordInterval";
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
    get template(): ChordInterval[];
    set template(value: ChordInterval[]);
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
export default Chord;
