import tuning from "./Tuning";

const freqLookup: { [key: string]: number } = {};

const midiLookup: { [key: string]: number } = {};

const midikeyStart = 12;
const octaves = 12;
const semitones = 12;

const calcMidiKey = (octave: number, semitone: number): number =>
  midikeyStart + octave * semitones + semitone;

const calcFrequency = (midiKey: number): number =>
  2 ** ((midiKey - 69) / 12) * tuning().a4;

const createTables: Function = (): void => {
  let iOctave: number = 0;
  let iSemitone: number = 0;

  for (iOctave = 0; iOctave < octaves; ++iOctave) {
    for (iSemitone = 0; iSemitone < semitones; ++iSemitone) {
      const key = `${iOctave}-${iSemitone}`;
      const mkey = calcMidiKey(iOctave, iSemitone);
      const freq = calcFrequency(mkey);
      midiLookup[key] = mkey;
      freqLookup[key] = freq;
    }
  }
};

createTables();

console.log("lookup", freqLookup);

export { freqLookup, midiLookup };
