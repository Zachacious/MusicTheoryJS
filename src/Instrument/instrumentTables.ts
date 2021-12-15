//**********************************************************
/**
 * Constants
 */
//**********************************************************
const MIDIKEY_START = 12;
const NUM_OCTAVES = 10;
const NUM_SEMITONES = 12;

//**********************************************************
/**
 * Calculates the midi key for a given octave and semitone.
 */
//**********************************************************
const calcMidiKey = (octave: number, semitone: number): number =>
   MIDIKEY_START + octave * NUM_SEMITONES + semitone;

//**********************************************************
/**
 * Calculates the frequency for a given octave and semitone given
 * a tuning for a4.
 */
//**********************************************************
const calcFrequency = (midiKey: number, a4Tuning: number): number =>
   2 ** ((midiKey - 69) / 12) * a4Tuning;

//**********************************************************
/**
 * Tables - return type for create tables
 */
//**********************************************************
type Tables = {
   freqLookup: { [key: string]: number };
   midiLookup: { [key: string]: number };
};

//**********************************************************
/**
 * Creates and return lookup tables for midikey and frequency.
 */
//**********************************************************
const createTables = (a4Tuning: number = 440): Tables => {
   //**********************************************************
   /**
    * Maps octave and semitone to note frequency(hertz).
    * requires a key in the form of `<octave>-<semitone>`
    */
   //**********************************************************
   const freqTable: { [key: string]: number } = {};

   //**********************************************************
   /**
    * Maps octave and semitone to midi key.
    * requires a key in the form of `<octave>-<semitone>`
    */
   //**********************************************************
   const midiTable: { [key: string]: number } = {};

   let iOctave: number = 0;
   let iSemitone: number = 0;

   for (iOctave = 0; iOctave < NUM_OCTAVES; ++iOctave) {
      for (iSemitone = 0; iSemitone < NUM_SEMITONES; ++iSemitone) {
         const key = `${iOctave}-${iSemitone}`;
         const mkey = calcMidiKey(iOctave, iSemitone);
         const freq = calcFrequency(mkey, a4Tuning);
         midiTable[key] = mkey;
         freqTable[key] = freq;
      }
   }

   return {
      freqLookup: freqTable,
      midiLookup: midiTable,
   };
};

export { createTables };
