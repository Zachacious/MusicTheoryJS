/**
 * Phase 4 acceptance (REDESIGN.md §9):
 * 1. meantone yields G# ≠ Ab with reference cent values (great diesis ~41.06¢)
 * 2. registerTuning affects frequency (audit defect #9 regression)
 * 3. the old docs' retune example produces the documented answer (defect #10)
 */

import { describe, expect, it } from "vitest";

import { MusicTheoryError, pitch } from "../../src/core";
import { addCents } from "../../src/micro";
import {
  edoTuning,
  equalTemperament,
  fifthsIndex,
  frequency,
  getTuning,
  justTuning,
  meantoneTuning,
  pitchBend,
  pythagoreanTuning,
  registerTuning,
  resolveTuning,
  tuningNames,
} from "../../src/tuning";

describe("fifthsIndex()", () => {
  it("places spelled pitch classes on the chain of fifths", () => {
    expect(fifthsIndex("C")).toBe(0);
    expect(fifthsIndex("G")).toBe(1);
    expect(fifthsIndex("F")).toBe(-1);
    expect(fifthsIndex("A")).toBe(3);
    expect(fifthsIndex("G#")).toBe(8);
    expect(fifthsIndex("Ab")).toBe(-4);
    expect(fifthsIndex("F##")).toBe(13);
    expect(fifthsIndex("Fb")).toBe(-8);
  });
});

describe("acceptance 1: meantone distinguishes G# from Ab", () => {
  const mt = meantoneTuning();

  it("separates them by the great diesis (~41.06¢ = 128/125)", () => {
    const diesis = mt.offset("Ab") - mt.offset("G#");
    expect(diesis).toBeCloseTo(41.059, 3);
  });

  it("makes major thirds pure 5/4 (386.314¢) — the point of quarter-comma", () => {
    expect(400 + mt.offset("E") - mt.offset("C")).toBeCloseTo(386.3137, 3);
    expect(400 + mt.offset("F#") - mt.offset("D")).toBeCloseTo(386.3137, 3);
  });

  it("Pythagorean separates them by the Pythagorean comma (~23.46¢)", () => {
    const py = pythagoreanTuning();
    expect(py.offset("G#") - py.offset("Ab")).toBeCloseTo(23.46, 2);
    // And its major third is the wide Pythagorean 81/64 (407.82¢).
    expect(400 + py.offset("E") - py.offset("C")).toBeCloseTo(407.82, 2);
  });

  it("equal temperament collapses all spellings to zero offset", () => {
    const eq = equalTemperament();
    for (const n of ["C", "G#", "Ab", "B#", "Fbb"]) {
      expect(eq.offset(n)).toBe(0);
    }
  });

  it("19- and 31-EDO give sharp and flat spellings different steps", () => {
    // In 19-EDO, Ab sits one 19-EDO step (63.16¢) above G#.
    const t19 = edoTuning(19);
    expect(t19.offset("Ab") - t19.offset("G#")).toBeCloseTo(1200 / 19, 3);
    const t31 = edoTuning(31);
    expect(t31.offset("Ab") - t31.offset("G#")).toBeCloseTo(1200 / 31, 3);
    // 12-EDO is just the default: identical to equal temperament.
    expect(edoTuning(12).offset("G#")).toBe(0);
  });
});

describe("acceptance 2: registerTuning affects frequency (defect #9)", () => {
  it("a registered tuning is consulted by frequency() and pitchBend()", () => {
    expect(() => frequency("A4", "half-sharp")).toThrow(MusicTheoryError);
    registerTuning({
      name: "half-sharp",
      description: "everything +50 cents",
      a4: 440,
      offset: () => 50,
    });
    expect(frequency("A4", "half-sharp")).toBeCloseTo(440 * Math.pow(2, 50 / 1200), 6);
    expect(pitchBend("A4", "half-sharp")).toBe(8192 + 2048);
    expect(tuningNames()).toContain("half-sharp");
    expect(getTuning("half-sharp")?.a4).toBe(440);
  });

  it("rejects invalid tunings loudly (no console-and-return)", () => {
    expect(() => registerTuning({ name: "", description: "", a4: 440, offset: () => 0 })).toThrow(
      MusicTheoryError
    );
    expect(() =>
      registerTuning({ name: "bad-a4", description: "", a4: -3, offset: () => 0 })
    ).toThrow(MusicTheoryError);
  });

  it("suggests near-miss names", () => {
    expect(() => frequency("A4", "meanton")).toThrow('did you mean "meantone"?');
  });

  it("re-registering the 'equal' name never changes the no-argument default", () => {
    registerTuning({
      name: "equal",
      description: "hijack attempt",
      a4: 432,
      offset: () => 0,
    });
    try {
      expect(frequency("A4")).toBe(440); // default is a module constant
      expect(frequency("A4", "equal")).toBe(432); // the *name* did change
    } finally {
      registerTuning({
        name: "equal",
        description: "12-tone equal temperament",
        a4: 440,
        offset: () => 0,
      });
    }
  });
});

describe("acceptance 3: the retune example produces the documented answer (defect #10)", () => {
  it("C4 retuned to A4=432 is ~256.87 Hz, and the reference is stored", () => {
    const t = equalTemperament({ a4: 432 });
    expect(t.a4).toBe(432); // the stored reference pitch
    expect(frequency("C4", t)).toBeCloseTo(256.87, 2); // the documented answer
    expect(frequency("A4", t)).toBe(432); // not re-derived against 440
  });
});

describe("frequency()", () => {
  it("defaults to equal temperament at A4=440", () => {
    expect(frequency("A4")).toBe(440);
    expect(frequency("C4")).toBeCloseTo(261.626, 3);
    expect(frequency("C")).toBeNull(); // pitch classes have no frequency
  });

  it("includes the note's own cents deviation", () => {
    expect(frequency(pitch(5, 0, 4, 20))).toBeCloseTo(440 * Math.pow(2, 20 / 1200), 9);
    expect(frequency(addCents("A4", 100))).toBeCloseTo(466.164, 3); // folded to A#4
  });

  it("realizes pure ratios under just intonation", () => {
    const e = frequency("E4", "just")!;
    const c = frequency("C4", "just")!;
    const g = frequency("G4", "just")!;
    expect(e / c).toBeCloseTo(5 / 4, 12);
    expect(g / c).toBeCloseTo(3 / 2, 12);
  });

  it("keeps A4 fixed at the reference across systems (offset(A) === 0)", () => {
    for (const name of ["equal", "pythagorean", "meantone", "just", "19-EDO", "31-EDO"]) {
      expect(frequency("A4", name), name).toBe(440);
    }
  });
});

describe("pitchBend()", () => {
  // addCents() would fold ±100¢ into the spelling (that's its job), so bend
  // tests build pitches with an explicit stored cents deviation instead.
  const aPlus = (cents: number) => pitch(5, 0, 4, cents);

  it("centers at 8192 and scales by the bend range", () => {
    expect(pitchBend("A4")).toBe(8192);
    expect(pitchBend(aPlus(100))).toBe(8192 + 4096);
    // Full-scale positive clamps to the 14-bit max (+8191, MIDI asymmetry).
    expect(pitchBend(aPlus(100), undefined, { range: 1 })).toBe(16383);
    expect(pitchBend(aPlus(-100))).toBe(8192 - 4096);
  });

  it("clamps to the 14-bit range and validates options", () => {
    expect(pitchBend(aPlus(50000))).toBe(16383);
    expect(() => pitchBend("A4", undefined, { range: 0 })).toThrow(MusicTheoryError);
  });

  it("works for pitch classes (offsets are octave-free)", () => {
    expect(pitchBend("G#", "meantone")).toBe(8192 + Math.round((-17.108 / 200) * 8192));
  });
});

describe("resolveTuning()", () => {
  it("passes objects through, resolves names, defaults to equal", () => {
    const custom = meantoneTuning({ a4: 415 });
    expect(resolveTuning(custom)).toBe(custom);
    expect(resolveTuning("pythagorean").name).toBe("pythagorean");
    expect(resolveTuning().name).toBe("equal");
  });

  it("justTuning throws for spellings with no defined ratio", () => {
    expect(() => justTuning().offset("F##")).toThrow(MusicTheoryError);
  });
});
