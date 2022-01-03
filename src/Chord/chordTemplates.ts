import ChordInterval from "./ChordInterval";

/**
 * Shortcut for modifiers
 * @internal
 */
const flat = -1;
const flat_flat = -2;
const sharp = 1;

/**
 * Chord templates
 * @internal
 */
const ChordTemplates: { [key: string]: ChordInterval[] } = {
   maj: [1, 3, 5],
   maj4: [1, 3, 4, 5],
   maj6: [1, 3, 5, 6],
   maj69: [1, 3, 5, 6, 9],
   maj7: [1, 3, 5, 7],
   maj9: [1, 3, 5, 7, 9],
   maj11: [1, 3, 5, 7, 9, 11],
   maj13: [1, 3, 5, 7, 9, 11, 12],
   maj7s11: [1, 3, 5, 7, [11, sharp]],
   majb5: [1, 3, [5, flat]],

   min: [1, [3, flat], 5],
   min4: [1, [3, flat], 4, 5],
   min6: [1, [3, flat], 5, 6],
   min7: [1, [3, flat], 5, [7, flat]],
   minAdd9: [1, [3, flat], 5, 9],
   min69: [1, [3, flat], 5, 6, 9],
   min9: [1, [3, flat], 5, [7, flat], 9],
   min11: [1, [3, flat], 5, [7, flat], 9, 11],
   min13: [1, [3, flat], 5, [7, flat], 9, 11, 13],
   min7b5: [1, [3, flat], [5, flat], [7, flat]],

   dom7: [1, 3, 5, [7, flat]],
   dom9: [1, 3, 5, [7, flat], 9],
   dom11: [1, 3, 5, [7, flat], 9, 11],
   dom13: [1, 3, 5, [7, flat], 9, 11, 13],
   dom7s5: [1, 3, [5, sharp], [7, flat]],
   dom7b5: [1, 3, [5, flat], [7, flat]],
   dom7b9: [1, 3, 5, [7, flat], [9, flat]],
   dom7s9: [1, 3, 5, [7, flat], [9, sharp]],
   dom9s5: [1, 3, [5, sharp], [7, flat], 9],
   dom9b5: [1, 3, [5, flat], [7, flat], 9],
   dom7s5s9: [1, 3, [5, sharp], [7, flat], [9, sharp]],
   dom7s5b9: [1, 3, [5, sharp], [7, flat], [9, flat]],
   dom7s11: [1, 3, 5, [7, flat], [11, sharp]],

   dim: [1, [3, flat], [5, flat]],
   dim7: [1, [3, flat], [5, flat], [7, flat_flat]],
   aug: [1, 3, [5, sharp]],

   sus2: [1, 2, 5],
   sus4: [1, [4, flat], 5],
   fifth: [1, 5],
   b5: [1, [5, flat]],
   s11: [1, 5, [11, sharp]],
};

Object.keys(ChordTemplates).forEach((element) =>
   Object.freeze(ChordTemplates[element])
);

export default ChordTemplates;
