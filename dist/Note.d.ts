import Semitone from "./Tone";
interface INote {
    id?(id?: string): string;
    octave(octave?: number): number;
    tone(tone?: Semitone): Semitone;
}
declare type INoteInitializer = {
    tone?: Semitone;
    octave?: number;
};
declare class Note implements INote {
    id(id?: string): string;
    octave(octave?: number): number;
    tone(tone?: Semitone): Semitone;
    constructor(values: INoteInitializer);
    midiKey(): number;
    frequency(): number;
}
export default Note;
