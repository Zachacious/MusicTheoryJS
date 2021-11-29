import Tuning from "./Tuning";
import Note from "../Note/Note";
// import Identifiable from "../composables/Identifiable";
import { uid } from "uid";

//**********************************************************
/**
 * Instrument class - used to represent an instrument
 * used to encapsulate the tuning and retrieving midi keys
 * and frequencies for notes
 */
//**********************************************************
// @Identifiable() // generates a unique id for each instance - use id() to get it
class Instrument {
   tuning: Tuning;

   //**********************************************************
   /**
    * creates a new instance of an instrument with the given tuning or 440hz
    */
   //**********************************************************
   constructor(a4Freq: number = 440) {
      this.tuning = new Tuning(a4Freq);
   }

   //**********************************************************
   /**
    * unique id for this instance
    */
   //**********************************************************
   id: string = uid();

   //**********************************************************
   /**
    * returns the frequency of the given note
    */
   //**********************************************************
   getFrequency(note: Note): number {
      return this.tuning.freqLookup(note.octave, note.semitone);
   }

   //**********************************************************
   /**
    * returns the midi key of the given note
    */
   //**********************************************************
   getMidiKey(note: Note): number {
      return this.tuning.midiKeyLookup(note.octave, note.semitone);
   }

   //**********************************************************
   /**
    * returns the tuning as a string
    */
   //**********************************************************
   public toString(): string {
      return `Instrument Tuning(${this.tuning.a4})`;
   }
}

export default Instrument;
