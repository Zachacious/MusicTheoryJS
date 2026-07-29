import { describe, expect, test } from "bun:test";
import { Key, harmonicFunctions, secondaryDominants } from "./key";

describe("harmonic functions", () => {
  test("major and minor tables", () => {
    expect(harmonicFunctions("C major")).toEqual([
      "T",
      "SD",
      "T",
      "SD",
      "D",
      "T",
      "D",
    ]);
    expect(harmonicFunctions("A minor")).toEqual([
      "T",
      "SD",
      "T",
      "SD",
      "D",
      "SD",
      "SD",
    ]);
    expect(harmonicFunctions("A minor", { variant: "melodic" })).toEqual([
      "T",
      "SD",
      "T",
      "SD",
      "D",
      "",
      "",
    ]);
  });

  test("variants are rejected for major keys", () => {
    expect(() =>
      Key.major("C").harmonicFunction(1, { variant: "harmonic" })
    ).toThrow(RangeError);
    expect(() => Key.major("C").variantScale("harmonic")).toThrow(RangeError);
  });
});

describe("secondary dominants and substitutes", () => {
  test("C major matches the standard table", () => {
    expect(
      secondaryDominants("C major").map((c) => c?.toString() ?? null)
    ).toEqual([null, "A7", "B7", "C7", "D7", "E7", null]);
  });

  test("related ii follows practice: m7 to major targets, m7b5 to minor", () => {
    const c = Key.major("C");
    expect(c.relatedTwo(5)?.toString()).toBe("Am7"); // target G major
    expect(c.relatedTwo(4)?.toString()).toBe("Gm7"); // target F major
    expect(c.relatedTwo(2)?.toString()).toBe("Em7b5"); // target D minor
    expect(c.relatedTwo(7)).toBeNull(); // diminished target
  });

  test("tritone substitutes exist even where the dominant is diatonic", () => {
    const c = Key.major("C");
    expect(c.secondaryDominant(1)).toBeNull();
    expect(c.tritoneSubstitute(1)?.toString()).toBe("Db7");
    expect(c.tritoneSubstitute(5)?.toString()).toBe("Ab7");
  });

  test("flat keys spell substitutes like charts, not double flats", () => {
    const gb = Key.major("Gb");
    expect(gb.tritoneSubstitute(1)?.toString()).toBe("G7");
    expect(gb.tritoneSubstitute(5)?.toString()).toBe("D7");
    // Single accidentals keep their theoretically exact spelling.
    expect(Key.major("Eb").tritoneSubstitute(1)?.toString()).toBe("Fb7");
    expect(Key.major("C").tritoneSubstitute(4)?.toString()).toBe("Gb7");
  });

  test("minor keys tonicize their own tonic", () => {
    const a = Key.minor("A");
    expect(a.secondaryDominant(1)?.toString()).toBe("E7");
    expect(a.secondaryDominant(3)).toBeNull(); // G7 is diatonic
    expect(a.relatedTwo(1)?.toString()).toBe("Bm7b5");
  });
});
