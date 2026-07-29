import { describe, expect, test } from "bun:test";
import { compareTunings, justDeviations } from "./compare";
import {
  justIntonation,
  pythagorean,
  quarterCommaMeantone,
} from "./historical";
import {
  MAQAM_NAMES,
  RAGA_NAMES,
  maqamTuning,
  pelog,
  ragaTuning,
  slendro,
} from "./presets";
import { TET12, degreeCents, frequencyOfDegree } from "./tuning";

describe("maqam presets", () => {
  test("every named maqam builds a 7-degree octave tuning", () => {
    for (const name of MAQAM_NAMES) {
      const t = maqamTuning(name);
      expect(t.size).toBe(7);
      expect(t.period).toBe(1200);
      expect(t.centsForDegree(0)).toBe(0);
    }
  });

  test("rast has its neutral third and seventh", () => {
    const rast = maqamTuning("rast");
    expect(rast.centsForDegree(2)).toBe(350);
    expect(rast.centsForDegree(6)).toBe(1050);
    expect(rast.name).toBe("Maqam Rast");
  });

  test("hijaz has the hallmark augmented-second gap", () => {
    const hijaz = maqamTuning("hijaz");
    expect(hijaz.centsForDegree(2) - hijaz.centsForDegree(1)).toBe(300);
  });

  test("degrees wrap across the octave", () => {
    expect(degreeCents(maqamTuning("rast"), 7)).toBe(1200);
    expect(
      frequencyOfDegree(maqamTuning("rast"), 7, { frequency: 220 })
    ).toBeCloseTo(440, 6);
  });

  test("unknown names throw", () => {
    expect(() => maqamTuning("phrygian" as never)).toThrow(RangeError);
  });
});

describe("raga presets", () => {
  test("every thaat builds a 7-degree just tuning", () => {
    for (const name of RAGA_NAMES) {
      const t = ragaTuning(name);
      expect(t.size).toBe(7);
      expect(t.centsForDegree(0)).toBe(0);
    }
    expect(RAGA_NAMES.length).toBe(10);
  });

  test("bilawal is the just major scale", () => {
    const t = ragaTuning("bilawal");
    expect(t.centsForDegree(2)).toBeCloseTo(386.31, 1); // 5/4
    expect(t.centsForDegree(4)).toBeCloseTo(701.96, 1); // 3/2
  });

  test("todi's komal re is 16/15", () => {
    expect(ragaTuning("todi").centsForDegree(1)).toBeCloseTo(111.73, 1);
  });

  test("unknown names throw", () => {
    expect(() => ragaTuning("ionian" as never)).toThrow(RangeError);
  });
});

describe("gamelan presets", () => {
  test("slendro: five near-equal steps", () => {
    const t = slendro();
    expect(t.size).toBe(5);
    const steps = [1, 2, 3, 4].map(
      (i) => t.centsForDegree(i) - t.centsForDegree(i - 1)
    );
    for (const s of steps) {
      expect(s).toBeGreaterThan(200);
      expect(s).toBeLessThan(260);
    }
  });

  test("pelog: seven unequal steps", () => {
    const t = pelog();
    expect(t.size).toBe(7);
    expect(t.centsForDegree(3) - t.centsForDegree(2)).toBe(270);
    expect(t.centsForDegree(1)).toBe(120);
  });
});

describe("tuning comparison", () => {
  test("12-TET against just intonation: the classic table", () => {
    const table = justDeviations();
    expect(table.length).toBe(12);
    expect(table[0]?.difference).toBe(0);
    expect(table[4]?.difference).toBeCloseTo(13.69, 1); // M3 sharp
    expect(table[7]?.difference).toBeCloseTo(-1.96, 1); // P5 barely flat
    expect(table[9]?.difference).toBeCloseTo(15.64, 1); // M6 sharp
  });

  test("pythagorean thirds carry the syntonic comma", () => {
    const table = compareTunings(pythagorean(), justIntonation());
    expect(table[4]?.difference).toBeCloseTo(21.51, 1);
  });

  test("meantone's major third is pure", () => {
    expect(justDeviations(quarterCommaMeantone())[4]?.difference).toBeCloseTo(
      0,
      6
    );
  });

  test("size mismatch throws", () => {
    expect(() => compareTunings(TET12, slendro())).toThrow(RangeError);
  });

  test("rows carry both sides of the comparison", () => {
    const row = justDeviations()[4];
    expect(row?.cents).toBe(400);
    expect(row?.referenceCents).toBeCloseTo(386.31, 1);
    expect(row?.degree).toBe(4);
  });
});
