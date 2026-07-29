import { describe, expect, test } from "bun:test";
import {
  asTimeSignature,
  barSeconds,
  barTicks,
  barWholeNotes,
  beatGrouping,
  beatUnit,
  beatsPerBar,
  beatsToSeconds,
  formatTimeSignature,
  meterClass,
  parseTimeSignature,
  positionToTick,
  secondsToBeats,
  tickToPosition,
  timeSignature,
  tryParseTimeSignature,
} from "./meter";

describe("timeSignature factory and parsing", () => {
  test("builds and validates", () => {
    expect(timeSignature(6, 8)).toEqual({ numerator: 6, denominator: 8 });
    expect(() => timeSignature(0, 4)).toThrow(RangeError);
    expect(() => timeSignature(2.5, 4)).toThrow(RangeError);
    expect(() => timeSignature(4, 6)).toThrow(RangeError);
    expect(() => timeSignature(4, 256)).toThrow(RangeError);
  });

  test("parses fractions and symbols", () => {
    expect(parseTimeSignature("7/8")).toEqual({ numerator: 7, denominator: 8 });
    expect(parseTimeSignature(" 3 / 4 ")).toEqual({
      numerator: 3,
      denominator: 4,
    });
    expect(parseTimeSignature("C")).toEqual({ numerator: 4, denominator: 4 });
    expect(parseTimeSignature("common")).toEqual({
      numerator: 4,
      denominator: 4,
    });
    expect(parseTimeSignature("C|")).toEqual({ numerator: 2, denominator: 2 });
    expect(parseTimeSignature("cut")).toEqual({ numerator: 2, denominator: 2 });
    expect(() => parseTimeSignature("waltz")).toThrow(SyntaxError);
    expect(() => parseTimeSignature("4/6")).toThrow(RangeError);
  });

  test("tryParse returns null instead of throwing", () => {
    expect(tryParseTimeSignature("12/8")).toEqual({
      numerator: 12,
      denominator: 8,
    });
    expect(tryParseTimeSignature("4/6")).toBeNull();
    expect(tryParseTimeSignature("")).toBeNull();
  });

  test("asTimeSignature accepts objects, strings, and pairs", () => {
    const ts = { numerator: 5, denominator: 8 };
    expect(asTimeSignature(ts)).toBe(ts);
    expect(asTimeSignature("5/8")).toEqual(ts);
    expect(asTimeSignature([5, 8])).toEqual(ts);
  });

  test("formatTimeSignature round-trips", () => {
    for (const text of ["4/4", "6/8", "7/8", "3/2", "12/8"]) {
      expect(formatTimeSignature(parseTimeSignature(text))).toBe(text);
    }
  });
});

describe("meter classification and grouping", () => {
  test("simple / compound / irregular", () => {
    expect(meterClass("2/4")).toBe("simple");
    expect(meterClass("3/4")).toBe("simple");
    expect(meterClass("4/4")).toBe("simple");
    expect(meterClass("2/2")).toBe("simple");
    expect(meterClass("6/8")).toBe("compound");
    expect(meterClass("9/8")).toBe("compound");
    expect(meterClass("12/8")).toBe("compound");
    expect(meterClass("5/8")).toBe("irregular");
    expect(meterClass("7/8")).toBe("irregular");
    expect(meterClass("8/8")).toBe("irregular");
    expect(meterClass("11/8")).toBe("irregular");
  });

  test("beat grouping", () => {
    expect(beatGrouping("4/4")).toEqual([1, 1, 1, 1]);
    expect(beatGrouping("3/4")).toEqual([1, 1, 1]);
    expect(beatGrouping("6/8")).toEqual([3, 3]);
    expect(beatGrouping("9/8")).toEqual([3, 3, 3]);
    expect(beatGrouping("5/8")).toEqual([3, 2]);
    expect(beatGrouping("7/8")).toEqual([3, 2, 2]);
    expect(beatGrouping("8/8")).toEqual([3, 3, 2]);
    expect(beatGrouping("10/8")).toEqual([3, 3, 2, 2]);
    expect(beatGrouping("11/8")).toEqual([3, 3, 3, 2]);
  });

  test("groups always sum to the numerator", () => {
    for (let n = 1; n <= 16; n++) {
      const groups = beatGrouping({ numerator: n, denominator: 8 });
      expect(groups.reduce((a, b) => a + b, 0)).toBe(n);
    }
  });

  test("beatsPerBar counts felt beats", () => {
    expect(beatsPerBar("4/4")).toBe(4);
    expect(beatsPerBar("6/8")).toBe(2);
    expect(beatsPerBar("12/8")).toBe(4);
    expect(beatsPerBar("7/8")).toBe(3);
  });

  test("beatUnit", () => {
    expect(beatUnit("4/4")).toEqual({ value: 4, dots: 0 });
    expect(beatUnit("3/2")).toEqual({ value: 2, dots: 0 });
    expect(beatUnit("6/8")).toEqual({ value: 4, dots: 1 });
    expect(beatUnit("12/16")).toEqual({ value: 8, dots: 1 });
    // Irregular meters have unequal beats: the written unit comes back.
    expect(beatUnit("7/8")).toEqual({ value: 8, dots: 0 });
  });
});

describe("bar lengths", () => {
  test("whole notes, ticks, seconds", () => {
    expect(barWholeNotes("4/4")).toBe(1);
    expect(barWholeNotes("6/8")).toBe(0.75);
    expect(barTicks("4/4")).toBe(1920);
    expect(barTicks("6/8", 96)).toBe(288);
    expect(barTicks("7/8", 480)).toBe(1680);
    expect(barSeconds("4/4", 120)).toBe(2);
    expect(barSeconds("3/4", 60)).toBe(3);
    expect(barSeconds("6/8", 90, "q.")).toBeCloseTo(4 / 3, 12);
  });
});

describe("positions", () => {
  test("tickToPosition in simple meter", () => {
    expect(tickToPosition(0, "4/4")).toEqual({ bar: 1, beat: 1, offset: 0 });
    expect(tickToPosition(480, "4/4")).toEqual({ bar: 1, beat: 2, offset: 0 });
    expect(tickToPosition(1230, "4/4")).toEqual({
      bar: 1,
      beat: 3,
      offset: 270,
    });
    expect(tickToPosition(1920, "4/4")).toEqual({ bar: 2, beat: 1, offset: 0 });
  });

  test("compound and irregular beats follow the grouping", () => {
    // 6/8: two dotted-quarter beats of 720 ticks each.
    expect(tickToPosition(720, "6/8")).toEqual({ bar: 1, beat: 2, offset: 0 });
    expect(tickToPosition(1500, "6/8")).toEqual({
      bar: 2,
      beat: 1,
      offset: 60,
    });
    // 7/8 grouped 3+2+2: beats of 720, 480, 480 ticks.
    expect(tickToPosition(719, "7/8")).toEqual({
      bar: 1,
      beat: 1,
      offset: 719,
    });
    expect(tickToPosition(720, "7/8")).toEqual({ bar: 1, beat: 2, offset: 0 });
    expect(tickToPosition(1200, "7/8")).toEqual({
      bar: 1,
      beat: 3,
      offset: 0,
    });
    expect(tickToPosition(1680, "7/8")).toEqual({ bar: 2, beat: 1, offset: 0 });
  });

  test("negative ticks are rejected", () => {
    expect(() => tickToPosition(-1, "4/4")).toThrow(RangeError);
  });

  test("positionToTick inverts tickToPosition", () => {
    for (const ts of ["4/4", "3/4", "6/8", "7/8", "12/8", "5/4"]) {
      for (const tick of [0, 1, 239, 480, 719, 720, 1680, 1919, 5000, 12345]) {
        const pos = tickToPosition(tick, ts);
        expect(positionToTick(pos, ts)).toBe(tick);
      }
    }
  });

  test("positionToTick validates bar and beat", () => {
    expect(positionToTick({ bar: 1, beat: 3 }, "4/4")).toBe(960);
    expect(positionToTick({ bar: 2, beat: 2 }, "6/8")).toBe(2160);
    expect(() => positionToTick({ bar: 0, beat: 1 }, "4/4")).toThrow(
      RangeError
    );
    expect(() => positionToTick({ bar: 1, beat: 5 }, "4/4")).toThrow(
      RangeError
    );
    expect(() => positionToTick({ bar: 1, beat: 4 }, "7/8")).toThrow(
      RangeError
    );
  });
});

describe("tempo helpers", () => {
  test("seconds <-> beats", () => {
    expect(secondsToBeats(1.5, 120)).toBe(3);
    expect(beatsToSeconds(3, 120)).toBe(1.5);
    expect(beatsToSeconds(secondsToBeats(7.3, 91), 91)).toBeCloseTo(7.3, 12);
  });
});
