import { describe, expect, test } from "bun:test";
import {
  asDuration,
  duration,
  durationBeats,
  durationName,
  durationSeconds,
  durationTicks,
  formatDuration,
  parseDuration,
  tryParseDuration,
  tuplet,
  wholeNotes,
} from "./duration";

describe("duration factory", () => {
  test("accepts denominator numbers and names", () => {
    expect(duration(4)).toEqual({ value: 4, dots: 0 });
    expect(duration("quarter")).toEqual({ value: 4, dots: 0 });
    expect(duration("breve")).toEqual({ value: 0.5, dots: 0 });
    expect(duration("double-whole")).toEqual({ value: 0.5, dots: 0 });
    expect(duration(128)).toEqual({ value: 128, dots: 0 });
  });

  test("rejects non-note values", () => {
    expect(() => duration(3)).toThrow(RangeError);
    expect(() => duration(0)).toThrow(RangeError);
    expect(() => duration(256)).toThrow(RangeError);
    expect(() => duration(-4)).toThrow(RangeError);
  });

  test("rejects bad dots and tuplets", () => {
    expect(() => duration(4, { dots: -1 })).toThrow(RangeError);
    expect(() => duration(4, { dots: 1.5 })).toThrow(RangeError);
    expect(() => duration(4, { tuplet: { actual: 1, normal: 2 } })).toThrow(
      RangeError
    );
    expect(() => duration(4, { tuplet: { actual: 3, normal: 0 } })).toThrow(
      RangeError
    );
  });
});

describe("tuplet defaults", () => {
  test("largest power of two below actual", () => {
    expect(tuplet(3)).toEqual({ actual: 3, normal: 2 });
    expect(tuplet(5)).toEqual({ actual: 5, normal: 4 });
    expect(tuplet(6)).toEqual({ actual: 6, normal: 4 });
    expect(tuplet(7)).toEqual({ actual: 7, normal: 4 });
    expect(tuplet(9)).toEqual({ actual: 9, normal: 8 });
  });

  test("duplets and quadruplets read as compound-meter ratios", () => {
    expect(tuplet(2)).toEqual({ actual: 2, normal: 3 });
    expect(tuplet(4)).toEqual({ actual: 4, normal: 3 });
  });
});

describe("parsing", () => {
  test("numbers, names, and letters", () => {
    expect(parseDuration("4")).toEqual({ value: 4, dots: 0 });
    expect(parseDuration("eighth")).toEqual({ value: 8, dots: 0 });
    expect(parseDuration("w")).toEqual({ value: 1, dots: 0 });
    expect(parseDuration("h")).toEqual({ value: 2, dots: 0 });
    expect(parseDuration("q")).toEqual({ value: 4, dots: 0 });
    expect(parseDuration("e")).toEqual({ value: 8, dots: 0 });
    expect(parseDuration("s")).toEqual({ value: 16, dots: 0 });
    expect(parseDuration("thirty-second")).toEqual({ value: 32, dots: 0 });
  });

  test("dots and tuplets", () => {
    expect(parseDuration("q.")).toEqual({ value: 4, dots: 1 });
    expect(parseDuration("h..")).toEqual({ value: 2, dots: 2 });
    expect(parseDuration("8t")).toEqual({
      value: 8,
      dots: 0,
      tuplet: { actual: 3, normal: 2 },
    });
    expect(parseDuration("st")).toEqual({
      value: 16,
      dots: 0,
      tuplet: { actual: 3, normal: 2 },
    });
    expect(parseDuration("16[5:4]")).toEqual({
      value: 16,
      dots: 0,
      tuplet: { actual: 5, normal: 4 },
    });
    expect(parseDuration("q.t")).toEqual({
      value: 4,
      dots: 1,
      tuplet: { actual: 3, normal: 2 },
    });
  });

  test("malformed input throws SyntaxError, impossible input RangeError", () => {
    expect(() => parseDuration("")).toThrow(SyntaxError);
    expect(() => parseDuration("q!")).toThrow(SyntaxError);
    expect(() => parseDuration("3")).toThrow(RangeError);
    expect(() => parseDuration("wat")).toThrow(SyntaxError);
    expect(() => parseDuration("8[1:2]")).toThrow(RangeError);
  });

  test("tryParseDuration returns null instead of throwing", () => {
    expect(tryParseDuration("q.")).toEqual({ value: 4, dots: 1 });
    expect(tryParseDuration("3")).toBeNull();
    expect(tryParseDuration("q!")).toBeNull();
    expect(tryParseDuration("")).toBeNull();
  });

  test("asDuration normalises all three input shapes", () => {
    const d = { value: 8, dots: 1 };
    expect(asDuration(d)).toBe(d);
    expect(asDuration("8.")).toEqual(d);
    expect(asDuration(8)).toEqual({ value: 8, dots: 0 });
  });
});

describe("formatting", () => {
  test("round-trips through parseDuration", () => {
    for (const text of ["breve", "1", "2..", "4.", "8t", "16[5:4]", "128"]) {
      expect(formatDuration(parseDuration(text))).toBe(text);
    }
  });

  test("spoken names", () => {
    expect(durationName("q")).toBe("quarter");
    expect(durationName("q.")).toBe("dotted quarter");
    expect(durationName("h..")).toBe("double-dotted half");
    expect(durationName("w...")).toBe("triple-dotted whole");
    expect(durationName("8t")).toBe("eighth triplet");
    expect(durationName("16[5:4]")).toBe("sixteenth quintuplet");
    expect(durationName("breve")).toBe("double whole");
    expect(durationName("8[11:8]")).toBe("eighth 11:8 tuplet");
  });
});

describe("conversions", () => {
  test("wholeNotes with dots and tuplets", () => {
    expect(wholeNotes("w")).toBe(1);
    expect(wholeNotes("q")).toBe(0.25);
    expect(wholeNotes("q.")).toBe(0.375);
    expect(wholeNotes("q..")).toBe(0.4375);
    expect(wholeNotes("breve")).toBe(2);
    expect(wholeNotes("8t")).toBeCloseTo(1 / 12, 12);
    expect(wholeNotes("16[5:4]")).toBeCloseTo(1 / 20, 12);
  });

  test("durationBeats defaults to quarter-note beats", () => {
    expect(durationBeats("h")).toBe(2);
    expect(durationBeats("8")).toBe(0.5);
    expect(durationBeats("q.", "q.")).toBe(1);
    expect(durationBeats("8", "q.")).toBeCloseTo(1 / 3, 12);
  });

  test("durationTicks is exact on divisible grids", () => {
    expect(durationTicks("q")).toBe(480);
    expect(durationTicks("8t")).toBe(160);
    expect(durationTicks("q.", 96)).toBe(144);
    expect(durationTicks("16[5:4]")).toBe(96);
    expect(durationTicks("breve", 96)).toBe(768);
  });

  test("durationSeconds respects tempo and beat unit", () => {
    expect(durationSeconds("q", 120)).toBe(0.5);
    expect(durationSeconds("h.", 60)).toBe(3);
    // 6/8 at 90 dotted-quarter beats per minute: an eighth is 1/3 beat.
    expect(durationSeconds("8", 90, "q.")).toBeCloseTo(60 / 90 / 3, 12);
  });
});
