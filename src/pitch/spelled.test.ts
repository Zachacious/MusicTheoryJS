import { describe, expect, test } from "bun:test";
import {
  chroma,
  isEnharmonic,
  letterOf,
  midi,
  pitchClass,
  spelled,
  spelledEquals,
} from "./spelled";

describe("chroma / midi", () => {
  test("middle C4 is chroma 48, midi 60", () => {
    const c4 = spelled(0, 0, 4);
    expect(chroma(c4)).toBe(48);
    expect(midi(c4)).toBe(60);
  });

  test("A4 is midi 69", () => {
    expect(midi(spelled(5, 0, 4))).toBe(69);
  });

  test("alteration shifts chromatic position", () => {
    expect(midi(spelled(0, 1, 4))).toBe(61); // C#4
    expect(midi(spelled(1, -1, 4))).toBe(61); // Db4 (enharmonic)
  });
});

describe("pitchClass", () => {
  test("wraps to 0-11", () => {
    expect(pitchClass(spelled(0, 0, 4))).toBe(0); // C
    expect(pitchClass(spelled(6, 0, 4))).toBe(11); // B
    expect(pitchClass(spelled(6, 1, 4))).toBe(0); // B# -> C
    expect(pitchClass(spelled(0, -1, 4))).toBe(11); // Cb -> B
  });
});

describe("enharmonics vs spelling", () => {
  test("E#4 and F4 are enharmonic but not equal", () => {
    const eSharp = spelled(2, 1, 4); // E#
    const f = spelled(3, 0, 4); // F
    expect(isEnharmonic(eSharp, f)).toBe(true);
    expect(spelledEquals(eSharp, f)).toBe(false);
  });

  test("identical spellings are equal", () => {
    expect(spelledEquals(spelled(0, 1, 4), spelled(0, 1, 4))).toBe(true);
  });
});

describe("letterOf", () => {
  test("maps steps to letters", () => {
    expect(letterOf(spelled(0))).toBe("C");
    expect(letterOf(spelled(6))).toBe("B");
    expect(letterOf(spelled(5))).toBe("A");
  });
});
