import CTonable from "./composables/Tonable";
import CIdentifiable from "./composables/Identifiable";
import COctivable from "./composables/Octivable";
import Halftone from "./Tone";
import getMidiKey from "./MidiKey";
import getFrequency from "./Frequency";

interface INote {
  id?(id?: string): string;
  octave(octave?: number): number;
  tone(tone?: Halftone): Halftone;
}

interface INoteInitializer {
  tone?: Halftone;
  octave?: number;
}

@CIdentifiable()
@COctivable()
@CTonable()
class Note implements INote {
  // must set defaults for interface props
  id(id?: string): string {
    return "";
  }
  octave(octave?: number): number {
    return 0;
  }
  tone(tone?: Halftone): Halftone {
    return Halftone.C;
  }

  constructor(values: INoteInitializer) {
    this.octave(values?.octave ?? 4);
    this.tone(values?.tone ?? 4);
  }

  public midiKey(): number {
    return getMidiKey(this.octave(), this.tone());
  }

  public frequency(): number {
    return getFrequency(this.octave(), this.tone());
  }
}

export default Note;
// @ts-expecct-error - ts doesn't recognize the prototype changes made by the decorators
