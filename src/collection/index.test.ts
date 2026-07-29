import { describe, expect, test } from "bun:test";
import { compact, permutations, range, rotate, shuffle } from "./index";

describe("range", () => {
  test("ascends, descends, and handles a single value", () => {
    expect(range(1, 4)).toEqual([1, 2, 3, 4]);
    expect(range(4, 1)).toEqual([4, 3, 2, 1]);
    expect(range(3, 3)).toEqual([3]);
    expect(range(-2, 1)).toEqual([-2, -1, 0, 1]);
  });

  test("rejects non-integer bounds", () => {
    expect(() => range(1.5, 4)).toThrow(RangeError);
  });
});

describe("rotate", () => {
  test("rotates left for positive counts and wraps", () => {
    expect(rotate(1, ["a", "b", "c"])).toEqual(["b", "c", "a"]);
    expect(rotate(-1, ["a", "b", "c"])).toEqual(["c", "a", "b"]);
    expect(rotate(3, ["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(rotate(7, ["a", "b", "c"])).toEqual(["b", "c", "a"]);
    expect(rotate(-7, ["a", "b", "c"])).toEqual(["c", "a", "b"]);
  });

  test("leaves the input untouched and tolerates empty input", () => {
    const input = ["a", "b"];
    rotate(1, input);
    expect(input).toEqual(["a", "b"]);
    expect(rotate(2, [])).toEqual([]);
  });
});

describe("compact", () => {
  test("drops only null, undefined, and NaN", () => {
    expect(compact(["a", 1, 0, null, undefined, Number.NaN])).toEqual([
      "a",
      1,
      0,
    ]);
    // Falsy-but-real values survive.
    expect(compact([0, "", false])).toEqual([0, "", false]);
  });
});

describe("permutations", () => {
  test("enumerates every ordering", () => {
    expect(permutations(["a", "b"])).toEqual([
      ["a", "b"],
      ["b", "a"],
    ]);
    expect(permutations(["a", "b", "c"])).toHaveLength(6);
    expect(permutations([])).toEqual([[]]);
  });

  test("orderings are unique", () => {
    const all = permutations([1, 2, 3, 4]).map((p) => p.join(""));
    expect(new Set(all).size).toBe(24);
  });
});

describe("shuffle", () => {
  test("is a permutation of the input and leaves it untouched", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect([...out].sort()).toEqual([...input].sort());
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  test("a supplied generator makes it deterministic", () => {
    const seeded = () => 0;
    expect(shuffle(["a", "b", "c"], seeded)).toEqual(
      shuffle(["a", "b", "c"], seeded)
    );
  });
});
