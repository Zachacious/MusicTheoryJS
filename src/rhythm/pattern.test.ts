import { describe, expect, test } from "bun:test";
import {
  euclideanRhythm,
  randomRhythm,
  rhythmFromHex,
  rhythmFromOnsets,
  rhythmPattern,
  rhythmToHex,
  rhythmToOnsets,
  rotateRhythm,
  weightedRhythm,
} from "./pattern";

describe("euclideanRhythm", () => {
  test("produces the canonical world rhythms", () => {
    // Tresillo.
    expect(euclideanRhythm(8, 3)).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);
    // Cinquillo.
    expect(euclideanRhythm(8, 5)).toEqual([1, 0, 1, 0, 1, 1, 0, 1]);
    // Bossa Nova clave.
    expect(euclideanRhythm(16, 5).join("")).toBe("1000100100100100");
    expect(euclideanRhythm(4, 2)).toEqual([1, 0, 1, 0]);
  });

  test("saturates and empties at the edges", () => {
    expect(euclideanRhythm(4, 4)).toEqual([1, 1, 1, 1]);
    expect(euclideanRhythm(4, 9)).toEqual([1, 1, 1, 1]);
    expect(euclideanRhythm(4, 0)).toEqual([0, 0, 0, 0]);
    expect(euclideanRhythm(0, 0)).toEqual([]);
  });

  test("distributes onsets as evenly as the grid allows", () => {
    for (const [steps, pulses] of [
      [16, 5],
      [12, 7],
      [9, 4],
      [13, 6],
    ] as const) {
      const onsets = rhythmToOnsets(euclideanRhythm(steps, pulses));
      expect(onsets).toHaveLength(pulses);
      // Gaps between successive onsets differ by at most one step — the
      // defining property of a Euclidean distribution.
      const gaps = onsets.map((onset, i) =>
        i === 0
          ? onset + steps - (onsets[onsets.length - 1] as number)
          : onset - (onsets[i - 1] as number)
      );
      expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
    }
  });

  test("rejects negative or fractional arguments", () => {
    expect(() => euclideanRhythm(-1, 2)).toThrow(RangeError);
    expect(() => euclideanRhythm(8, 1.5)).toThrow(RangeError);
  });
});

describe("rotateRhythm", () => {
  test("rotates left for positive counts, preserving onset count", () => {
    expect(rotateRhythm([1, 0, 0, 1], 1)).toEqual([0, 0, 1, 1]);
    expect(rotateRhythm([1, 0, 0, 1], -1)).toEqual([1, 1, 0, 0]);
    expect(rotateRhythm([1, 0, 0, 1], 0)).toEqual([1, 0, 0, 1]);
    expect(rotateRhythm([1, 0, 0, 1], 4)).toEqual([1, 0, 0, 1]);
  });
});

describe("onsets and grids", () => {
  test("round-trips gaps to a grid and back", () => {
    expect(rhythmFromOnsets(1, 2, 1)).toEqual([1, 0, 1, 0, 0, 1, 0]);
    expect(rhythmToOnsets(rhythmFromOnsets(1, 2, 1))).toEqual([0, 2, 5]);
    expect(rhythmToOnsets([1, 0, 0, 1, 0])).toEqual([0, 3]);
    expect(rhythmToOnsets([0, 0])).toEqual([]);
  });

  test("normalises loose values", () => {
    expect(rhythmPattern(1, 0, 1, 1)).toEqual([1, 0, 1, 1]);
    expect(rhythmPattern(true, false, true)).toEqual([1, 0, 1]);
  });

  test("rejects negative gaps", () => {
    expect(() => rhythmFromOnsets(1, -2)).toThrow(RangeError);
  });
});

describe("hex shorthand", () => {
  test("decodes four steps per digit, most significant first", () => {
    expect(rhythmFromHex("8f")).toEqual([1, 0, 0, 0, 1, 1, 1, 1]);
    expect(rhythmFromHex("a")).toEqual([1, 0, 1, 0]);
    expect(rhythmFromHex("0")).toEqual([0, 0, 0, 0]);
  });

  test("round-trips", () => {
    for (const hex of ["8f", "a4", "f0", "1234"]) {
      expect(rhythmToHex(rhythmFromHex(hex))).toBe(hex);
    }
  });

  test("pads a partial group with rests", () => {
    expect(rhythmToHex([1, 0])).toBe("8");
  });

  test("rejects a non-hex digit", () => {
    expect(() => rhythmFromHex("8z")).toThrow(SyntaxError);
  });
});

describe("random patterns", () => {
  test("density of 1 and 0 are certainties", () => {
    expect(randomRhythm(4, 1)).toEqual([1, 1, 1, 1]);
    expect(randomRhythm(4, 0)).toEqual([0, 0, 0, 0]);
    expect(randomRhythm(0, 0.5)).toEqual([]);
  });

  test("a supplied generator makes it deterministic", () => {
    expect(randomRhythm(8, 0.5, () => 0.4)).toEqual(
      randomRhythm(8, 0.5, () => 0.4)
    );
  });

  test("weights of 1 and 0 are honoured exactly", () => {
    expect(weightedRhythm([1, 0, 1, 0])).toEqual([1, 0, 1, 0]);
    expect(weightedRhythm([1, 0, 0.5, 1], () => 0.4)).toEqual([1, 0, 1, 1]);
  });
});
