import { describe, expect, test } from "bun:test";
import { detectScales } from "./detection";

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
