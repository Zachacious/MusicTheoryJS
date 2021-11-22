import tuning from "./Tuning";

const freqLookup: { [key: string]: number } = {};

const midiLookup: { [key: string]: number } = {};

const midikeyStart = 12;

const createTables: Function = (): void => {
  let iOctave: number = 0;
  let iSemitone: number = 0;
  let octaves = 12;
  let halftones = 12;
  for (iOctave = 0; iOctave < octaves; ++iOctave) {
    for (iSemitone = 0; iSemitone < halftones; ++iSemitone) {
      const key = `${iOctave}-${iSemitone}`;
      const mkey = midikeyStart + iOctave * halftones + iSemitone;
      const freq = 2 ** ((mkey - 69) / 12) * tuning().a4;
      midiLookup[key] = mkey;
      freqLookup[key] = freq;
    }
  }
};

createTables();

console.log("lookup", freqLookup);

export { freqLookup, midiLookup };
