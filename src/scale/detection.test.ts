import { describe, expect, test } from "bun:test";
import { detectScales, scalesContaining } from "./detection";

describe("detectScales", () => {
  test("the white keys match C major (and its modes)", () => {
    const matches = detectScales(["C4", "D4", "E4", "F4", "G4", "A4", "B4"]);
    const byName = matches.map((m) => `${m.tonic.letter}:${m.name}`);
    expect(byName).toContain("C:major");
    expect(byName).toContain("A:minor");
    expect(byName).toContain("D:dorian");
  });

  test("only scales with the same note count are considered", () => {
    const matches = detectScales(["C4", "D4", "E4", "G4", "A4"]);
    // pentatonic set: 5 notes
    expect(matches.some((m) => m.name === "majorPentatonic")).toBe(true);
    expect(matches.every((m) => m.name !== "major")).toBe(true);
  });

  test("no match for an unknown set", () => {
    expect(detectScales(["C4", "C#4", "D4"])).toEqual([]);
  });

  test("empty input yields no matches", () => {
    expect(detectScales([])).toEqual([]);
  });
});

describe("detectScales with subset matching", () => {
  const keyOf = (m: {
    tonic: { toString(o?: object): string };
    name: string;
  }) => `${m.tonic.toString({ octave: false })} ${m.name}`;

  test("finds scales whose tonic is not among the input notes", () => {
    const matches = detectScales(["D4", "F4", "G4"], { match: "subset" });
    const keys = matches.map(keyOf);
    // D F G sits inside C major even though no C was played.
    expect(keys).toContain("C major");
    expect(keys).toContain("D minor");
    expect(keys).toContain("F major");
  });

  test("orders tighter fits before larger scales", () => {
    const matches = detectScales(["C4", "D4", "E4", "G4", "A4"], {
      match: "subset",
    });
    const first = matches[0];
    expect(first && keyOf(first)).toBe("C majorPentatonic");
    // The chromatic scale contains everything, so it must come last-ish.
    const sizeOf = (name: string) => matches.findIndex((m) => m.name === name);
    expect(sizeOf("chromatic")).toBeGreaterThan(sizeOf("majorPentatonic"));
  });

  test("reuses the input spelling for tonics the input contains", () => {
    const matches = detectScales(["Db4", "F4", "Ab4"], { match: "subset" });
    const db = matches.find((m) => m.name === "major");
    expect(db?.tonic.toString()).toBe("Db4");
  });

  test("spells synthesized tonics per the prefer option", () => {
    const sharp = detectScales(["C4", "E4", "B4"], { match: "subset" });
    const flat = detectScales(["C4", "E4", "B4"], {
      match: "subset",
      prefer: "flat",
    });
    const tonics = (ms: typeof sharp) =>
      new Set(ms.map((m) => m.tonic.toString({ octave: false })));
    expect(tonics(sharp).has("F#") || tonics(sharp).has("C#")).toBe(true);
    expect([...tonics(flat)].every((t) => !t.includes("#"))).toBe(true);
  });

  test("scalesContaining is the subset shorthand", () => {
    const viaOptions = detectScales(["C4", "Eb4"], { match: "subset" });
    const viaShorthand = scalesContaining(["C4", "Eb4"]);
    expect(viaShorthand.map(keyOf)).toEqual(viaOptions.map(keyOf));
  });

  test("exact matching stays the default", () => {
    expect(detectScales(["C4", "E4", "B4"])).toEqual([]);
  });
});
