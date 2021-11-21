const midiLookup: { [key: string]: number } = {};

const midikeyStart = 21;

const createMidiLookup: Function = (): void => {
  let i: number = 0;
  let octaves = 12;
  let halftones = 12;
  for (i = 0; i < octaves; ++i) {
    for (let j = 0; j < halftones; ++j) {
      const key = `${i}-${j}`;
      midiLookup[key] = midikeyStart + i * halftones + j;
    }
  }
};

// Lets go ahead and create the lookup table
createMidiLookup();

const getMidiKey: Function = (octave: number, halftone: number): number => {
  const key = `${octave}-${halftone}`;
  const midiKey = midiLookup[key];
  if (midiKey === undefined) {
    throw new Error(`Invalid midi key: ${key}`);
  }
  return midiKey;
};

export default getMidiKey;
