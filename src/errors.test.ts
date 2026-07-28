/**
 * Error-path and guard coverage — the branches that reject bad input.
 */
import { describe, expect, test } from "bun:test";
import { isChordQuality } from "./chord/templates";
import { interval } from "./interval/interval";
import { writeMidi } from "./midi/writer";
import { parseNote, tryParseNote } from "./pitch/parse";
import { isScaleName } from "./scale/templates";
import { centsTuning, scalaTuning } from "./tuning/custom";
import { equalTemperament } from "./tuning/tuning";

describe("tuning input validation", () => {
  test("centsTuning rejects an empty degree list", () => {
    expect(() => centsTuning([])).toThrow();
  });

  test("equalTemperament rejects non-positive / non-integer divisions", () => {
    expect(() => equalTemperament(0)).toThrow();
    expect(() => equalTemperament(-3)).toThrow();
    expect(() => equalTemperament(12.5)).toThrow();
  });

  test("scalaTuning rejects malformed files", () => {
    expect(() => scalaTuning("only one line")).toThrow(); // < 2 content lines
    expect(() =>
      scalaTuning(["desc", "notanumber", "2/1"].join("\n"))
    ).toThrow();
    expect(() => scalaTuning(["desc", "3", "2/1"].join("\n"))).toThrow(); // declares 3, lists 1
    expect(() => scalaTuning(["desc", "1", "50.x"].join("\n"))).toThrow(); // bad cents
  });
});

describe("interval validation", () => {
  test("rejects invalid number and quality combinations", () => {
    expect(() => interval(0, "P")).toThrow();
    expect(() => interval(5, "M")).toThrow(); // no major fifth
    expect(() => interval(3, "P")).toThrow(); // no perfect third
  });
});

describe("note parsing", () => {
  test("parseNote throws, tryParseNote returns null", () => {
    expect(() => parseNote("H9")).toThrow();
    expect(tryParseNote("H9")).toBeNull();
  });
});

describe("MIDI writer validation", () => {
  test("rejects a negative note start (negative delta time)", () => {
    expect(() =>
      writeMidi({
        format: 0,
        ppq: 480,
        tracks: [
          {
            notes: [
              { note: 60, start: -10, duration: 100, velocity: 64, channel: 0 },
            ],
          },
        ],
      })
    ).toThrow();
  });
});

describe("name guards", () => {
  test("isChordQuality", () => {
    expect(isChordQuality("maj7")).toBe(true);
    expect(isChordQuality("nope")).toBe(false);
  });

  test("isScaleName", () => {
    expect(isScaleName("dorian")).toBe(true);
    expect(isScaleName("nope")).toBe(false);
  });
});
