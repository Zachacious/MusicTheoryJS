import Semitone from "../Semitone";
import NoteInitializer from "./NoteInitializer";
declare type Props = Record<string, unknown>;
declare type NoteSchema = {
    _semitone?: Semitone;
    _octave?: number;
    _prevSemitone?: Semitone;
    id?: string;
    octave?: (octave?: number) => number | Props;
    semitone?: (semitone?: Semitone) => Semitone | Props;
};
declare const Note: (initializer?: string | NoteInitializer | undefined) => NoteSchema;
export default Note;
