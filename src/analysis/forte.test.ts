/**
 * The Forte catalog is hand-entered reference data, so these tests lean on
 * structure: the set-class universe has known counts, disjoint prime forms,
 * contiguous numbering, and z-pairs that share interval vectors. A table
 * typo that survives all of that would have to swap two same-size,
 * non-z classes wholesale — which the spot checks of famous classes guard.
 */
import { describe, expect, test } from "bun:test";
import { forteName, fortePrimeForm, forteZMate } from "./forte";
import {
  pcsetComplement,
  pcsetIntervalVector,
  pcsetMask,
  pcsetPrimeForm,
} from "./pcset";

/** Every set-class name, by walking all 4096 masks through forteName. */
function allClasses(): Map<string, number> {
  const classes = new Map<string, number>();
  for (let mask = 0; mask <= 0xfff; mask++) {
    const name = forteName(mask);
    const prime = pcsetMask(pcsetPrimeForm(mask));
    const seen = classes.get(name);
    if (seen !== undefined) expect(seen).toBe(prime);
    classes.set(name, prime);
  }
  return classes;
}

describe("forte catalog structure", () => {
  const classes = allClasses();

  test("there are 224 set classes with the known counts per cardinality", () => {
    expect(classes.size).toBe(224);
    const counts = new Map<number, number>();
    for (const name of classes.keys()) {
      const cardinality = Number(name.split("-")[0]);
      counts.set(cardinality, (counts.get(cardinality) ?? 0) + 1);
    }
    const expected = [1, 1, 6, 12, 29, 38, 50, 38, 29, 12, 6, 1, 1];
    expected.forEach((n, cardinality) => {
      expect(counts.get(cardinality) ?? 0).toBe(n);
    });
  });

  test("ordinals are contiguous within each cardinality", () => {
    const ordinals = new Map<number, Set<number>>();
    for (const name of classes.keys()) {
      const match = /^(\d+)-z?(\d+)$/.exec(name) as RegExpExecArray;
      const cardinality = Number(match[1]);
      const set = ordinals.get(cardinality) ?? new Set<number>();
      expect(set.has(Number(match[2]))).toBe(false);
      set.add(Number(match[2]));
      ordinals.set(cardinality, set);
    }
    for (const [, set] of ordinals) {
      expect(Math.max(...set)).toBe(set.size);
    }
  });

  test("z-marked classes have exactly one same-vector mate; others none", () => {
    for (const [name, prime] of classes) {
      const vector = pcsetIntervalVector(prime).join(",");
      const size = name.split("-")[0];
      let mates = 0;
      for (const [otherName, otherPrime] of classes) {
        if (otherName === name || otherName.split("-")[0] !== size) continue;
        if (pcsetIntervalVector(otherPrime).join(",") === vector) mates++;
      }
      expect(`${name}:${mates}`).toBe(`${name}:${name.includes("z") ? 1 : 0}`);
      if (name.includes("z")) {
        expect(forteZMate(name)).toContain("z");
      }
    }
  });

  test("complementary classes share their ordinal, z mark included", () => {
    for (const [name, prime] of classes) {
      const complementName = forteName(pcsetComplement(prime));
      const [cardinality, ordinal] = name.split("-") as [string, string];
      // Hexachords may be self-complementary or z-paired; every other
      // cardinality mirrors exactly.
      if (cardinality !== "6") {
        expect(complementName).toBe(`${12 - Number(cardinality)}-${ordinal}`);
      }
    }
  });
});

describe("famous set classes", () => {
  test("names known to every theory classroom", () => {
    expect(forteName(pcsetMask([0, 4, 7]))).toBe("3-11"); // major/minor triad
    expect(forteName(pcsetMask([0, 3, 6, 9]))).toBe("4-28"); // dim7
    expect(forteName(pcsetMask([0, 4, 8]))).toBe("3-12"); // augmented
    expect(forteName(pcsetMask([0, 2, 4, 7, 9]))).toBe("5-35"); // pentatonic
    expect(forteName(pcsetMask([0, 2, 4, 5, 7, 9, 11]))).toBe("7-35"); // diatonic
    expect(forteName(pcsetMask([0, 2, 4, 6, 8, 10]))).toBe("6-35"); // whole tone
    expect(forteName(pcsetMask([0, 1, 3, 4, 6, 7, 9, 10]))).toBe("8-28"); // octatonic
    expect(forteName(pcsetMask([0, 1, 4, 5, 8, 9]))).toBe("6-20"); // hexatonic
    expect(forteName(pcsetMask([0, 1, 4, 6]))).toBe("4-z15"); // all-interval
    expect(forteName(pcsetMask([0, 1, 3, 7]))).toBe("4-z29"); // all-interval
    expect(forteName(pcsetMask([0, 2, 4, 5, 7, 9]))).toBe("6-32"); // diatonic hexachord
    expect(forteName(pcsetMask([0, 1, 3, 6, 7, 9]))).toBe("6-30"); // Petrushka
    expect(forteName(0)).toBe("0-1");
    expect(forteName(0xfff)).toBe("12-1");
  });

  test("interval vectors of the classics", () => {
    expect(pcsetIntervalVector(pcsetMask(fortePrimeForm("7-35")))).toEqual([
      2, 5, 4, 3, 6, 1,
    ]);
    expect(pcsetIntervalVector(pcsetMask(fortePrimeForm("4-z15")))).toEqual([
      1, 1, 1, 1, 1, 1,
    ]);
    expect(pcsetIntervalVector(pcsetMask(fortePrimeForm("6-35")))).toEqual([
      0, 6, 0, 6, 0, 3,
    ]);
  });

  test("fortePrimeForm parses loosely and round-trips", () => {
    expect(fortePrimeForm("4-Z15")).toEqual([0, 1, 4, 6]);
    expect(fortePrimeForm("4-15")).toEqual([0, 1, 4, 6]);
    for (const name of allClasses().keys()) {
      expect(forteName(pcsetMask(fortePrimeForm(name)))).toBe(name);
    }
    expect(() => fortePrimeForm("13-1")).toThrow(/unknown set class/);
  });
});
