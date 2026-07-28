/**
 * Microtonal / non-Western example. Run with: `bun run examples/microtonal.ts`
 */

import {
  centsTuning,
  equalTemperament,
  justIntonation,
  ratioTuning,
  scalaTuning,
  scaleFromTuning,
} from "../src/index";

// 24-EDO quarter tones
const edo24 = scaleFromTuning(equalTemperament(24));
console.log(
  "24-EDO first steps (cents):",
  edo24
    .slice(0, 5)
    .map((d) => d.cents)
    .join(", ")
);

// Maqam Rast as a cents table, tonic anchored to 264 Hz
const rast = centsTuning([0, 204, 355, 498, 702, 906, 1057], { name: "Rast" });
const rastScale = scaleFromTuning(rast, { frequency: 264 }, true);
console.log(
  "Rast (cents):",
  rastScale.map((d) => Math.round(d.cents)).join(", ")
);
console.log(
  "Rast (Hz):",
  rastScale.map((d) => d.frequency.toFixed(1)).join(", ")
);

// Just-intonation major scale from ratios
const jiMajor = ratioTuning(["1/1", "9/8", "5/4", "4/3", "3/2", "5/3", "15/8"]);
console.log(
  "JI major (cents):",
  scaleFromTuning(jiMajor)
    .map((d) => d.cents.toFixed(1))
    .join(", ")
);

// A Scala .scl file loaded from text
const scl = ["Pure fifth then octave", "2", "3/2", "2/1"].join("\n");
const t = scalaTuning(scl);
console.log(`Scala "${t.name}" period:`, t.period, "cents, size:", t.size);

// The 12-note Just Intonation chromatic scale vs 12-TET
const ji = justIntonation();
console.log("JI major third (cents):", ji.centsForDegree(4).toFixed(3));
