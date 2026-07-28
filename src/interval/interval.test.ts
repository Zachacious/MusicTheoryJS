import { describe, expect, test } from "bun:test";
import { formatNote } from "../pitch/format";
import { spelled } from "../pitch/spelled";
import {
  addIntervals,
  interval,
  intervalBetween,
  intervalName,
  intervalNumber,
  intervalQuality,
  negateInterval,
  transpose,
} from "./interval";

describe("interval construction", () => {
  test("perfect fifth is 4 steps, 7 semitones", () => {
    expect(interval(5, "P")).toEqual({ steps: 4, semitones: 7 });
  });

  test("major third and minor third", () => {
    expect(interval(3, "M")).toEqual({ steps: 2, semitones: 4 });
    expect(interval(3, "m")).toEqual({ steps: 2, semitones: 3 });
  });

  test("augmented fourth vs diminished fifth (tritone) differ in spelling", () => {
    expect(interval(4, "A")).toEqual({ steps: 3, semitones: 6 });
    expect(interval(5, "d")).toEqual({ steps: 4, semitones: 6 });
  });

  test("compound: major ninth", () => {
    expect(interval(9, "M")).toEqual({ steps: 8, semitones: 14 });
  });

  test("rejects invalid quality for interval class", () => {
    expect(() => interval(5, "M")).toThrow();
    expect(() => interval(3, "P")).toThrow();
  });
});

describe("naming", () => {
  test("intervalNumber and quality", () => {
    expect(intervalNumber(interval(5, "P"))).toBe(5);
    expect(intervalQuality(interval(4, "A"))).toEqual({
      quality: "A",
      count: 1,
    });
    expect(intervalQuality(interval(7, "d"))).toEqual({
      quality: "d",
      count: 1,
    });
  });

  test("intervalName round-trips common intervals", () => {
    expect(intervalName(interval(5, "P"))).toBe("P5");
    expect(intervalName(interval(3, "m"))).toBe("m3");
    expect(intervalName(interval(4, "A"))).toBe("A4");
    expect(intervalName(interval(1, "P"))).toBe("P1");
  });

  test("doubly augmented stacks the symbol", () => {
    expect(intervalName(interval(5, "A", 2))).toBe("AA5");
  });
});

describe("intervalBetween", () => {
  test("C4 to G4 is a perfect fifth", () => {
    const iv = intervalBetween(spelled(0, 0, 4), spelled(4, 0, 4));
    expect(intervalName(iv)).toBe("P5");
  });

  test("C4 to Fb4 is a diminished fourth (spelling matters)", () => {
    const iv = intervalBetween(spelled(0, 0, 4), spelled(3, -1, 4));
    expect(intervalName(iv)).toBe("d4");
  });

  test("C4 to E4 is a major third", () => {
    expect(
      intervalName(intervalBetween(spelled(0, 0, 4), spelled(2, 0, 4)))
    ).toBe("M3");
  });
});

describe("transpose preserves spelling", () => {
  test("C4 up a perfect fifth is G4", () => {
    expect(formatNote(transpose(spelled(0, 0, 4), interval(5, "P")))).toBe(
      "G4"
    );
  });

  test("C4 up a major third is E4", () => {
    expect(formatNote(transpose(spelled(0, 0, 4), interval(3, "M")))).toBe(
      "E4"
    );
  });

  test("C4 up a diminished fourth is Fb4, not E4", () => {
    expect(formatNote(transpose(spelled(0, 0, 4), interval(4, "d")))).toBe(
      "Fb4"
    );
  });

  test("B4 up a minor second is C5 (octave carry)", () => {
    expect(formatNote(transpose(spelled(6, 0, 4), interval(2, "m")))).toBe(
      "C5"
    );
  });

  test("transposing down via negateInterval", () => {
    const down5 = negateInterval(interval(5, "P"));
    expect(formatNote(transpose(spelled(0, 0, 4), down5))).toBe("F3");
  });
});

describe("addIntervals", () => {
  test("M3 + m3 = P5", () => {
    const sum = addIntervals(interval(3, "M"), interval(3, "m"));
    expect(intervalName(sum)).toBe("P5");
  });
});
