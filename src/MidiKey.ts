import { midiLookup } from "./Tables";

const getMidiKey: Function = (octave: number, semitone: number): number => {
  const key = `${octave}-${semitone}`; // -1 because list of semitones is not zero indexed
  const midiKey = midiLookup[key];
  if (midiKey === undefined) {
    throw new Error(`Invalid midi key: ${key}`);
  }
  return midiKey;
};

export default getMidiKey;
