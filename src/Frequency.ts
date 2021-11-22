import { freqLookup } from "./Tables";

const getFrequency: Function = (octave: number, semitone: number): number => {
  const key = `${octave}-${semitone}`; // -1 because list of semitones is not zero indexed
  const freq = freqLookup[key];
  if (freq === undefined) {
    throw new Error(`Invalid frequency key: ${key}`);
  }
  return freq;
};

export default getFrequency;
