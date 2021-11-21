import Tone from "./Tone";
import CIdentifiable from "./Identifiable";
import COctivable from "./Octivable";
import halftone from "./Tone";

interface INote {
  id?(id: number): number;
  octave?(octave: number): number;
  tone: Tone;
}

@CIdentifiable()
@COctivable()
class Note implements INote {
  //   octave: number;
  tone: Tone;

  constructor(tone: Tone = halftone.A, octave: number = 4, id?: number) {
    this.tone = tone;
    // this.octave = octave;
    // this.id(id);
    // this.octave(octave);
  }
}

export default Note;
