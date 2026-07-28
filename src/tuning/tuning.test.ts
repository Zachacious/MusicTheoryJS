import { describe, expect, test } from "bun:test";
import { spelled } from "../pitch/spelled";
import { centsTuning, ratioTuning, scalaTuning } from "./custom";
import {
  justIntonation,
  pythagorean,
  quarterCommaMeantone,
} from "./historical";
import {
  TET12,
  degreeCents,
  edo,
  equalTemperament,
  frequencyOfDegree,
  frequencyOfNote,
} from "./tuning";

const C4 = spelled(0, 0, 4);
const A4 = spelled(5, 0, 4);

describe("12-TET (default)", () => {
  test("A4 = 440 Hz", () => {
    expect(frequencyOfNote(A4)).toBeCloseTo(440, 6);
  });

  test("C4 = 261.626 Hz", () => {
    expect(frequencyOfNote(C4)).toBeCloseTo(261.6256, 3);
  });

  test("A5 is one octave above A4", () => {
    expect(frequencyOfNote(spelled(5, 0, 5))).toBeCloseTo(880, 6);
  });

  test("custom anchor (A4 = 432)", () => {
    expect(frequencyOfNote(A4, TET12, { frequency: 432 })).toBeCloseTo(432, 6);
  });
});

describe("EDO by degree", () => {
  test("24-EDO step is 50 cents", () => {
    const edo24 = equalTemperament(24);
    expect(edo24.centsForDegree(1)).toBeCloseTo(50, 9);
    expect(degreeCents(edo24, 3)).toBeCloseTo(150, 9);
  });

  test("24-EDO wraps octaves", () => {
    const edo24 = edo(24);
    expect(degreeCents(edo24, 24)).toBeCloseTo(1200, 9);
    expect(degreeCents(edo24, 25)).toBeCloseTo(1250, 9);
  });

  test("19-EDO divides the octave into 19 equal steps", () => {
    const edo19 = equalTemperament(19);
    expect(edo19.centsForDegree(0)).toBeCloseTo(0, 9);
    expect(degreeCents(edo19, 19)).toBeCloseTo(1200, 9);
    expect(edo19.centsForDegree(1)).toBeCloseTo(1200 / 19, 6);
  });

  test("frequency of a degree anchored to a root", () => {
    const edo12 = equalTemperament(12);
    // degree 12 = one octave above the 220 Hz root
    expect(frequencyOfDegree(edo12, 12, { frequency: 220 })).toBeCloseTo(
      440,
      6
    );
  });

  test("rejects invalid divisions", () => {
    expect(() => equalTemperament(0)).toThrow();
    expect(() => equalTemperament(2.5)).toThrow();
  });
});

describe("historical tunings differ from 12-TET where expected", () => {
  test("Pythagorean fifth is pure (~701.955 cents), wider than 12-TET's 700", () => {
    const pyth = pythagorean();
    expect(pyth.centsForDegree(7)).toBeCloseTo(701.955, 3); // G
  });

  test("Pythagorean A4 deviates slightly from 12-TET 440", () => {
    const pyth = pythagorean();
    // A is 3 fifths up; sounds a touch sharp of 440 when C is held constant,
    // but with A4 as the anchor it stays 440 and *C* moves instead.
    const cPyth = frequencyOfNote(C4, pyth);
    const c12 = frequencyOfNote(C4, TET12);
    expect(cPyth).not.toBeCloseTo(c12, 2);
  });

  test("quarter-comma meantone major third is pure (386.31 cents)", () => {
    const mean = quarterCommaMeantone();
    expect(mean.centsForDegree(4)).toBeCloseTo(386.314, 2); // E
  });

  test("Just Intonation perfect fifth is exactly 3/2", () => {
    const ji = justIntonation();
    expect(ji.centsForDegree(7)).toBeCloseTo(701.955, 3);
    expect(ji.centsForDegree(4)).toBeCloseTo(386.314, 2); // pure major third
  });

  test("justIntonation rejects wrong-length ratio lists", () => {
    expect(() => justIntonation([1, 2, 3])).toThrow();
  });
});

describe("custom tunings (non-Western)", () => {
  test("centsTuning builds arbitrary scales", () => {
    const rast = centsTuning([0, 204, 355, 498, 702, 906, 1057], {
      name: "Rast",
    });
    expect(rast.size).toBe(7);
    expect(rast.name).toBe("Rast");
    expect(rast.centsForDegree(2)).toBe(355); // neutral third
    expect(degreeCents(rast, 7)).toBe(1200); // period up
  });

  test("ratioTuning converts ratios to cents", () => {
    const t = ratioTuning(["1/1", "9/8", "5/4", "4/3", "3/2", "5/3", "15/8"]);
    expect(t.size).toBe(7);
    expect(t.centsForDegree(4)).toBeCloseTo(701.955, 3); // 3/2
  });

  test("a non-octave period is honoured", () => {
    // Bohlen-Pierce-like: period is a 3/1 "tritave" (~1902 cents)
    const bp = centsTuning([0, 500, 1000], { period: 1901.955 });
    expect(degreeCents(bp, 3)).toBeCloseTo(1901.955, 3);
  });
});

describe("Scala import", () => {
  test("parses a simple .scl file", () => {
    const scl = [
      "! example.scl",
      "!",
      "Example just major scale",
      " 7",
      "!",
      " 9/8",
      " 5/4",
      " 4/3",
      " 3/2",
      " 5/3",
      " 15/8",
      " 2/1",
    ].join("\n");
    const t = scalaTuning(scl);
    expect(t.name).toBe("Example just major scale");
    expect(t.size).toBe(7);
    expect(t.period).toBeCloseTo(1200, 6); // 2/1
    expect(t.centsForDegree(0)).toBe(0); // implied tonic
    expect(t.centsForDegree(4)).toBeCloseTo(701.955, 3); // 3/2
  });

  test("accepts cents values (with a decimal point)", () => {
    const scl = ["Quarter tones", "2", "50.0", "1200.0"].join("\n");
    const t = scalaTuning(scl);
    expect(t.size).toBe(2);
    expect(t.centsForDegree(1)).toBeCloseTo(50, 6);
    expect(t.period).toBeCloseTo(1200, 6);
  });

  test("rejects malformed files", () => {
    expect(() => scalaTuning("only one line")).toThrow();
  });
});
