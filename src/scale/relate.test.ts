import { describe, expect, test } from "bun:test";
import { intervalName } from "../interval/interval";
import { scaleSubsets, scaleSupersets } from "./detection";
import { modeDistance, relativeTonic } from "./modes";
import { tokenizeScaleName } from "./templates";

describe("modeDistance", () => {
  test("measures between modes of one parent", () => {
    expect(intervalName(modeDistance("major", "dorian"))).toBe("M2");
    expect(intervalName(modeDistance("major", "phrygian"))).toBe("M3");
    expect(intervalName(modeDistance("major", "lydian"))).toBe("P4");
    expect(intervalName(modeDistance("major", "major"))).toBe("P1");
  });

  test("reports the nearer direction, as musicians name it", () => {
    // Down a whole step, not up a minor seventh.
    expect(intervalName(modeDistance("dorian", "major"))).toBe("-M2");
    // C major to A minor is down a minor third.
    expect(intervalName(modeDistance("major", "minor"))).toBe("-m3");
  });

  test("rejects scales that are not modes of one another", () => {
    expect(() => modeDistance("major", "harmonicMinor")).toThrow(RangeError);
    expect(() => modeDistance("major", "majorPentatonic")).toThrow(RangeError);
  });
});

describe("relativeTonic", () => {
  test("re-roots a mode onto the tonic that shares the notes", () => {
    const name = (n: { toString: (o: object) => string }) =>
      n.toString({ octave: false });
    expect(name(relativeTonic("major", "dorian", "C4"))).toBe("D");
    expect(name(relativeTonic("dorian", "major", "D4"))).toBe("C");
    expect(name(relativeTonic("major", "minor", "C4"))).toBe("A");
    expect(name(relativeTonic("minor", "major", "A4"))).toBe("C");
    expect(name(relativeTonic("major", "mixolydian", "C4"))).toBe("G");
  });

  test("round-trips", () => {
    const there = relativeTonic("major", "lydian", "C4");
    const back = relativeTonic("lydian", "major", there);
    expect(back.toString({ octave: false })).toBe("C");
  });

  test("rejects unrelated scales", () => {
    expect(() => relativeTonic("major", "harmonicMinor", "C4")).toThrow(
      RangeError
    );
  });
});

describe("scaleSupersets and scaleSubsets", () => {
  test("major widens into the bebop scales and chromatic", () => {
    const wider = scaleSupersets("major");
    expect(wider).toContain("bebopDominant");
    expect(wider).toContain("chromatic");
    expect(wider).not.toContain("major");
    expect(wider).not.toContain("minor");
  });

  test("major narrows to its pentatonics, smallest first", () => {
    const narrower = scaleSubsets("major");
    expect(narrower).toContain("majorPentatonic");
    expect(narrower).not.toContain("major");
    expect(narrower).not.toContain("chromatic");
  });

  test("the two are inverses of each other", () => {
    for (const sub of scaleSubsets("major")) {
      expect(scaleSupersets(sub)).toContain("major");
    }
  });

  test("chromatic contains everything and is contained by nothing", () => {
    expect(scaleSupersets("chromatic")).toEqual([]);
    expect(scaleSubsets("chromatic").length).toBeGreaterThan(50);
  });

  test("rejects an unknown template", () => {
    expect(() => scaleSupersets("notAScale")).toThrow(RangeError);
  });
});

describe("tokenizeScaleName", () => {
  test("splits a tonic from a multi-word template", () => {
    expect(tokenizeScaleName("C major")).toEqual(["C", "major"]);
    expect(tokenizeScaleName("C4 melodic minor")).toEqual([
      "C4",
      "melodic minor",
    ]);
    expect(tokenizeScaleName("Bb lydian")).toEqual(["Bb", "lydian"]);
    expect(tokenizeScaleName("F# harmonic minor")).toEqual([
      "F#",
      "harmonic minor",
    ]);
  });

  test("a bare template name keeps an empty tonic", () => {
    expect(tokenizeScaleName("dorian")).toEqual(["", "dorian"]);
    // "E" alone reads as a template name, not a tonic with no scale.
    expect(tokenizeScaleName("E")).toEqual(["", "E"]);
  });

  test("tolerates empty and whitespace input", () => {
    expect(tokenizeScaleName("")).toEqual(["", ""]);
    expect(tokenizeScaleName("   ")).toEqual(["", ""]);
    expect(tokenizeScaleName("  C   major  ")).toEqual(["C", "major"]);
  });
});
