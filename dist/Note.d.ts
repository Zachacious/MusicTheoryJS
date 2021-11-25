import Semitone from "./Tone";
declare type NoteInitializer = {
    tone?: Semitone;
    octave?: number;
};
declare class Note {
    id(id?: string): string;
    octave(octave?: number): number;
    tone(tone?: Semitone): Semitone;
    constructor(values: NoteInitializer);
    midiKey(): number;
    frequency(): number;
}
export default Note;
