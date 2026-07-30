import { describe, expect, test } from "bun:test";
import { melody } from "../sequence/stream";
import { checkCounterpoint } from "./counterpoint";

describe("checkCounterpoint", () => {
  test("catches parallel fifths, compound and antiparallel included", () => {
    // Simple parallels.
    const simple = checkCounterpoint(
      melody(["C5", "D5"], "q"),
      melody(["F4", "G4"], "q")
    );
    expect(simple.map((i) => i.type)).toEqual(["parallel-fifths"]);
    expect(simple[0]?.time).toBe(1);
    // A twelfth into a fifth is still parallels.
    expect(
      checkCounterpoint(
        melody(["C6", "D5"], "q"),
        melody(["F4", "G4"], "q")
      ).map((i) => i.type)
    ).toContain("parallel-fifths");
  });

  test("catches parallel octaves and unisons", () => {
    expect(
      checkCounterpoint(melody(["C4", "D4"], "q"), melody(["C3", "D3"], "q"))[0]
        ?.type
    ).toBe("parallel-octaves");
    expect(
      checkCounterpoint(melody(["C4", "D4"], "q"), melody(["C4", "D4"], "q"))[0]
        ?.type
    ).toBe("parallel-octaves");
  });

  test("oblique motion into a fifth is not parallels", () => {
    // The lower voice holds; only the upper moves.
    expect(
      checkCounterpoint(melody(["E4", "D4"], "q"), [
        { pitch: "G3", start: 0, duration: 2 },
      ])
    ).toEqual([]);
  });

  test("direct fifths need similar motion and an upper-voice leap", () => {
    // Both rise, the soprano by a fourth, landing on a fifth.
    const direct = checkCounterpoint(
      melody(["D5", "G5"], "q"),
      melody(["B4", "C5"], "q")
    );
    expect(direct.map((i) => i.type)).toEqual(["direct-fifths"]);
    // Same arrival with the soprano moving by step passes.
    expect(
      checkCounterpoint(melody(["A4", "G4"], "q"), melody(["F4", "C4"], "q"))
    ).toEqual([]);
  });

  test("flags a crossing where it begins, once", () => {
    const crossed = checkCounterpoint(
      melody(["E4", "F4", "G4"], "q"),
      melody(["G4", "A4", "C4"], "q")
    );
    expect(crossed.filter((i) => i.type === "voice-crossing")).toHaveLength(1);
    expect(crossed[0]?.time).toBe(0);
  });

  test("flags overlap when a voice moves past where the other stood", () => {
    // The bass leaps above the alto's previous note.
    const overlapped = checkCounterpoint(
      melody(["C5", "E5"], "q"),
      melody(["G4", "D5"], "q")
    );
    expect(overlapped.map((i) => i.type)).toEqual(["voice-overlap"]);
  });

  test("clean two-part writing passes", () => {
    // Contrary and oblique motion, imperfect consonances.
    expect(
      checkCounterpoint(
        melody(["E5", "D5", "C5", "D5", "E5"], "q"),
        melody(["C4", "F4", "A4", "F4", "C4"], "q")
      )
    ).toEqual([]);
  });

  test("silence in either voice suspends judgement", () => {
    expect(
      checkCounterpoint(melody(["C5", null, "D5"], "q"), melody(["F4"], "q"))
    ).toEqual([]);
  });
});
