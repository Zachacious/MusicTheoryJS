import { midiLookup } from "./Tables";

const getMidiKey: Function = (octave: number, halftone: number): number => {
  const key = `${octave}-${halftone}`; // -1 because list of halftones is not zero indexed
  const midiKey = midiLookup[key];
  if (midiKey === undefined) {
    throw new Error(`Invalid midi key: ${key}`);
  }
  return midiKey;
};

export default getMidiKey;
