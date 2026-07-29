/**
 * Runtime dictionary extension: a quality or scale registered at runtime must
 * behave exactly like a built-in everywhere — building, symbol parsing,
 * printing, detection, and the derived tables that other modules precompute.
 * The precomputed caches are the interesting part: each has to notice that the
 * dictionary moved underneath it.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { chordScales } from "../scale/chordscales";
import { detectScales } from "../scale/detection";
import { Scale } from "../scale/scale";
import {
  addScaleType,
  isScaleName,
  removeScaleType,
  resetScaleTypes,
  scaleTemplate,
} from "../scale/templates";
import { detectChord } from "./analysis";
import { Chord } from "./chord";
import { parseChordSymbol } from "./parse";
import {
  CHORD_QUALITIES,
  addChordType,
  chordDictionaryVersion,
  chordTemplate,
  isChordQuality,
  removeChordType,
  resetChordTypes,
} from "./templates";

afterEach(() => {
  resetChordTypes();
  resetScaleTypes();
});

describe("addChordType", () => {
  test("a registered quality builds, parses, prints, and detects", () => {
    // A quality with a pitch-class set no built-in has, so detection is
    // unambiguous.
    addChordType("majAdd11s5", "P1 M3 A5 P11", { suffix: "Madd11#5" });

    expect(isChordQuality("majAdd11s5")).toBe(true);
    expect(Chord.of("C4", "majAdd11s5").noteNames()).toEqual([
      "C4",
      "E4",
      "G#4",
      "F5",
    ]);
    expect(parseChordSymbol("CMadd11#5").quality).toBe("majAdd11s5");
    expect(Chord.of("C4", "majAdd11s5").toString()).toBe("CMadd11#5");
    expect(detectChord(["C4", "E4", "G#4", "F5"])?.quality).toBe("majAdd11s5");
  });

  test("aliases parse and the canonical suffix prints", () => {
    addChordType("so4", "P1 P4 P5 M9", {
      suffix: "so4",
      aliases: ["sowhat"],
    });
    expect(Chord.from("Csowhat").toString()).toBe("Cso4");
    expect(Chord.from("Cso4").noteNames()).toEqual(["C4", "F4", "G4", "D5"]);
  });

  test("accepts semitone offsets as well as spelled intervals", () => {
    addChordType("numeric", [0, 4, 7], { suffix: "num" });
    expect(chordTemplate("numeric").map((iv) => iv.semitones)).toEqual([
      0, 4, 7,
    ]);
  });

  test("appears in the derived tables", () => {
    addChordType("tableDemo", "P1 M3 A5 P11", { suffix: "tbl" });
    expect(CHORD_QUALITIES).toContain("tableDemo");
    expect(chordDictionaryVersion()).toBeGreaterThan(0);
  });

  test("refuses to silently overwrite an existing quality", () => {
    expect(() => addChordType("maj7", "P1 M3 P5 M7")).toThrow(/duplicate name/);
    // The rejected registration leaves the dictionary intact.
    expect(chordTemplate("maj7")).toHaveLength(4);
  });

  test("rejects an empty template", () => {
    expect(() => addChordType("empty", [])).toThrow(RangeError);
  });
});

describe("removeChordType and resetChordTypes", () => {
  test("removal un-registers everywhere", () => {
    addChordType("majAdd11s5", "P1 M3 A5 P11", { suffix: "Madd11#5" });
    expect(removeChordType("majAdd11s5")).toBe(true);

    expect(isChordQuality("majAdd11s5")).toBe(false);
    expect(CHORD_QUALITIES).not.toContain("majAdd11s5");
    expect(() => Chord.from("CMadd11#5")).toThrow();
    // The notes still form a chord — rooted on F they are an F minMaj7 — but
    // the removed quality is no longer among the readings.
    expect(detectChord(["C4", "E4", "G#4", "F5"])?.quality).not.toBe(
      "majAdd11s5"
    );
  });

  test("removing an unknown quality reports false", () => {
    expect(removeChordType("neverExisted")).toBe(false);
  });

  test("reset restores exactly the built-ins", () => {
    const before = [...CHORD_QUALITIES];
    addChordType("scratch", "P1 P5");
    resetChordTypes();
    expect([...CHORD_QUALITIES]).toEqual(before);
    expect(isChordQuality("maj7")).toBe(true);
  });
});

describe("addScaleType", () => {
  test("a registered scale builds and is detected", () => {
    addScaleType("hexatonicDream", "P1 M2 M3 A4 M6 M7", {
      aliases: ["dream"],
    });

    expect(isScaleName("hexatonicDream")).toBe(true);
    expect(Scale.from("C4", "dream").noteNames()).toEqual([
      "C4",
      "D4",
      "E4",
      "F#4",
      "A4",
      "B4",
    ]);
    expect(
      detectScales(["C4", "D4", "E4", "F#4", "A4", "B4"]).map((m) => m.name)
    ).toContain("hexatonicDream");
  });

  test("chord-scale matching picks up the addition", () => {
    const before = chordScales("C", { maxResults: 200 }).length;
    addScaleType("wideMajor", "P1 M2 M3 P4 P5 M6 M7 A4");
    const after = chordScales("C", { maxResults: 200 });
    expect(after).toHaveLength(before + 1);
    expect(after.some((m) => m.scale.name === "wideMajor")).toBe(true);
  });

  test("removal and reset clear the derived caches", () => {
    addScaleType("hexatonicDream", "P1 M2 M3 A4 M6 M7", {
      aliases: ["dream"],
    });
    removeScaleType("dream");
    expect(isScaleName("hexatonicDream")).toBe(false);
    expect(isScaleName("dream")).toBe(false);
    expect(detectScales(["C4", "D4", "E4", "F#4", "A4", "B4"])).toHaveLength(0);
  });

  test("refuses to silently overwrite, including via an alias", () => {
    expect(() => addScaleType("major", "P1 P5")).toThrow(/duplicate name/);
    expect(() =>
      addScaleType("uniqueName", "P1 P5", { aliases: ["ionian"] })
    ).toThrow(/duplicate name/);
    expect(scaleTemplate("major")).toHaveLength(7);
  });
});
