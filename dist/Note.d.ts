import Tone from "./Tone";
interface INote {
    id?(id: number): number;
    octave?(octave: number): number;
    tone: Tone;
}
declare class Note implements INote {
    tone: Tone;
    constructor(tone?: Tone, octave?: number, id?: number);
}
export default Note;
