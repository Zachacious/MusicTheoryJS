/**
 * The tuning registry: resolving tunings by name, and the guarantee that a
 * name behaves exactly like the tuning object it stands for.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { parseNote } from "../pitch/parse";
import { centsTuning } from "./custom";
import { justIntonation } from "./historical";
import {
  asTuning,
  getTuning,
  hasTuning,
  registerTuning,
  removeTuning,
  resetTunings,
  tryGetTuning,
  tuningNames,
  tuningRegistryVersion,
} from "./registry";
import {
  TET12,
  equalTemperament,
  frequencyOfDegree,
  frequencyOfNote,
  isTuning,
} from "./tuning";

afterEach(() => {
  resetTunings();
});

describe("built-in registrations", () => {
  test("the shipped tunings resolve by name", () => {
    expect(getTuning("12-TET").size).toBe(12);
    expect(getTuning("24-EDO").size).toBe(24);
    expect(getTuning("Pythagorean").name).toContain("Pythagorean");
    expect(getTuning("rast").size).toBe(7);
    expect(getTuning("bhairav").name).toContain("Bhairav");
    expect(getTuning("Slendro").size).toBe(5);
  });

  test("lookup ignores case and surrounding space", () => {
    expect(getTuning("12-tet").size).toBe(12);
    expect(getTuning("  24-EDO  ").size).toBe(24);
    expect(hasTuning("PYTHAGOREAN")).toBe(true);
  });

  test("names come back as written, for display", () => {
    const names = tuningNames();
    expect(names).toContain("12-TET");
    expect(names).toContain("Slendro");
    expect(names).toContain("24-EDO");
    // Not the normalized lookup keys.
    expect(names).not.toContain("12-tet");
  });

  test("every registered name resolves to a valid tuning", () => {
    for (const name of tuningNames()) {
      expect(isTuning(getTuning(name))).toBe(true);
    }
  });
});

describe("resolving", () => {
  test("an unknown name throws, with a suggestion when one is close", () => {
    expect(() => getTuning("24-ED")).toThrow(/did you mean/);
    expect(() => getTuning("24-ED")).toThrow(/24-EDO/);
    expect(() => getTuning("totally-unrelated")).toThrow(/unknown tuning/);
  });

  test("tryGetTuning reports null instead of throwing", () => {
    expect(tryGetTuning("12-TET")?.size).toBe(12);
    expect(tryGetTuning("nope")).toBeNull();
  });

  test("asTuning passes objects through and resolves strings", () => {
    const custom = equalTemperament(19);
    expect(asTuning(custom)).toBe(custom);
    expect(asTuning("24-EDO").size).toBe(24);
  });
});

describe("a name behaves exactly like the object", () => {
  test("frequencies agree", () => {
    const note = parseNote("E4");
    expect(frequencyOfNote(note, "Just")).toBe(
      frequencyOfNote(note, justIntonation())
    );
    expect(frequencyOfNote(note, "12-TET")).toBe(frequencyOfNote(note, TET12));
  });

  test("a named tuning actually changes the pitch", () => {
    const c4 = parseNote("C4");
    // Just intonation puts C4 above its equal-tempered position.
    expect(frequencyOfNote(c4, "Just")).toBeGreaterThan(
      frequencyOfNote(c4, "12-TET")
    );
    // A quarter-tone step is half a semitone.
    expect(frequencyOfDegree("24-EDO", 1)).toBeLessThan(
      frequencyOfDegree("12-TET", 1)
    );
  });

  test("degree math accepts a name", () => {
    // Maqam Rast's neutral third — 350 cents, impossible in 12-TET.
    expect(getTuning("rast").centsForDegree(2)).toBe(350);
  });
});

describe("registering", () => {
  test("a registered tuning resolves and is listed", () => {
    registerTuning("my-19", equalTemperament(19));
    expect(getTuning("my-19").size).toBe(19);
    expect(hasTuning("MY-19")).toBe(true);
    expect(tuningNames()).toContain("my-19");
  });

  test("a non-octave period survives the round trip", () => {
    const bp = centsTuning([0, 146, 293, 439], {
      name: "BP",
      period: 1902,
    });
    registerTuning("bp", bp);
    expect(getTuning("bp").period).toBe(1902);
  });

  test("the version moves on every change", () => {
    const start = tuningRegistryVersion();
    registerTuning("versioned", equalTemperament(31));
    const afterAdd = tuningRegistryVersion();
    expect(afterAdd).not.toBe(start);
    removeTuning("versioned");
    expect(tuningRegistryVersion()).not.toBe(afterAdd);
  });

  test("a duplicate name is refused rather than silently replacing", () => {
    expect(() => registerTuning("12-TET", equalTemperament(19))).toThrow(
      /already registered/
    );
    // The original survives the rejected call.
    expect(getTuning("12-TET").size).toBe(12);
  });

  test("an invalid tuning is refused", () => {
    expect(() => registerTuning("bad", null as never)).toThrow(TypeError);
    expect(() =>
      registerTuning("bad", {
        name: "x",
        size: 0,
        period: 1200,
        centsForDegree: () => 0,
      })
    ).toThrow(TypeError);
    expect(() => registerTuning("  ", equalTemperament(12))).toThrow(TypeError);
  });
});

describe("removing and resetting", () => {
  test("removal reports whether anything went", () => {
    registerTuning("scratch", equalTemperament(31));
    expect(removeTuning("scratch")).toBe(true);
    expect(removeTuning("scratch")).toBe(false);
    expect(hasTuning("scratch")).toBe(false);
  });

  test("a removed name no longer resolves", () => {
    registerTuning("scratch", equalTemperament(31));
    removeTuning("scratch");
    expect(() => getTuning("scratch")).toThrow(/unknown tuning/);
  });

  test("reset restores exactly the built-ins", () => {
    const before = tuningNames();
    registerTuning("temporary", equalTemperament(53));
    resetTunings();
    expect(tuningNames()).toEqual(before);
    expect(hasTuning("temporary")).toBe(false);
    expect(hasTuning("12-TET")).toBe(true);
  });

  test("a built-in can be deliberately replaced by removing it first", () => {
    removeTuning("12-TET");
    registerTuning("12-TET", equalTemperament(24));
    expect(getTuning("12-TET").size).toBe(24);
  });
});

describe("isTuning", () => {
  test("accepts real tunings and rejects malformed ones", () => {
    expect(isTuning(equalTemperament(19))).toBe(true);
    expect(isTuning(justIntonation())).toBe(true);
    expect(isTuning(null)).toBe(false);
    expect(isTuning({})).toBe(false);
    expect(
      isTuning({ name: "x", size: 12, period: 1200, centsForDegree: 5 })
    ).toBe(false);
    expect(
      isTuning({ name: "x", size: 12, period: 0, centsForDegree: () => 0 })
    ).toBe(false);
  });
});
