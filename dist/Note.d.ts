import Halftone from "./Tone";
interface INote {
    id?(id?: string): string;
    octave(octave?: number): number;
    tone(tone?: Halftone): Halftone;
}
interface INoteInitializer {
    tone?: Halftone;
    octave?: number;
}
declare class Note implements INote {
    id(id?: string): string;
    octave(octave?: number): number;
    tone(tone?: Halftone): Halftone;
    constructor(values: INoteInitializer);
    midiKey(): number;
    frequency(): number;
}
export default Note;
