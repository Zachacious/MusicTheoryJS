import { freqLookup } from "./Tables";

const getFrequency: Function = (octave: number, halftone: number): number => {
  const key = `${octave}-${halftone}`; // -1 because list of halftones is not zero indexed
  const freq = freqLookup[key];
  if (freq === undefined) {
    throw new Error(`Invalid frequency key: ${key}`);
  }
  return freq;
};

export default getFrequency;
