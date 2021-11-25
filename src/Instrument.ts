import Tuning from "./Tuning";
import Note from "./Note";
import Identifiable from "./composables/Identifiable";

@Identifiable()
class Instrument {
  tuning: Tuning;

  constructor(a4Freq: number = 440) {
    this.tuning = new Tuning(a4Freq);
  }

  getFrequency(note: Note): number {
    return this.tuning.freqLookup(note.octave, note.semitone);
  }

  getMidiKey(note: Note): number {
    return this.tuning.midiKeyLookup(note.octave, note.semitone);
  }
}

export default Instrument;
