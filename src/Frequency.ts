const freqLookup: { [key: string]: number } = {};

const createFreqLookup: Function = (): void => {
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
createFreqLookup();

const getFrequency: Function = (octave: number, halftone: number): number => {
  const key = `${octave}-${halftone - 1}`; // -1 because list of halftones is not zero indexed
  const midiKey = midiLookup[key];
  if (midiKey === undefined) {
    throw new Error(`Invalid midi key: ${key}`);
  }
  return midiKey;
};

export default getFrequency;
