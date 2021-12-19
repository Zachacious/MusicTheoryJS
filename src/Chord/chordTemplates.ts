import ChordInterval from "./ChordInterval";

const flat = -1;
const sharp = 1;

const ChordTemplates: { [key: string]: ChordInterval[] } = {
   major: [1, 3, 5],
   minor: [1, [3, flat], 5],
};

Object.keys(ChordTemplates).forEach((element) =>
   Object.freeze(ChordTemplates[element])
);

export default ChordTemplates;
