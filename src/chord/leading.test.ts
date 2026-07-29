import { describe, expect, test } from "bun:test";
import { Note } from "../note/note";
import { Chord } from "./chord";
import {
  findParallels,
  nextVoicing,
  voiceChord,
  voiceLeadingCost,
  voiceProgression,
} from "./leading";

describe("voiceChord", () => {
  test("deterministic close voicings with the root in the bass", () => {
    expect(voiceChord("Cmaj7").map(String)).toEqual(["C3", "E3", "B3", "G4"]);
    expect(voiceChord("C", { voices: 3 }).map(String)).toEqual([
      "C3",
      "E3",
      "G3",
    ]);
    expect(voiceChord("F#m7b5", { voices: 4 })[0]?.toString()).toBe("F#2");
  });

  test("voicings ascend and stay in range", () => {
    for (const symbol of ["C", "Fm7", "Bb13", "Emaj9", "Adim7"]) {
      const v = voiceChord(symbol, { voices: 5 });
      for (let i = 1; i < v.length; i++) {
        expect((v[i] as Note).chroma).toBeGreaterThan(
          (v[i - 1] as Note).chroma
        );
      }
      expect((v[0] as Note).chroma).toBeGreaterThanOrEqual(
        Note.from("E2").chroma
      );
      expect((v[v.length - 1] as Note).chroma).toBeLessThanOrEqual(
        Note.from("A5").chroma
      );
    }
  });

  test("impossible ranges throw", () => {
    expect(() => voiceChord("C", { range: ["C4", "E4"] })).toThrow(RangeError);
    expect(() => voiceChord("C", { voices: 1 })).toThrow(RangeError);
    expect(() => voiceChord("C", { voices: 9 })).toThrow(RangeError);
    expect(() => voiceChord("C", { range: ["C5", "C3"] })).toThrow(RangeError);
  });
});

describe("findParallels", () => {
  test("detects parallel fifths and octaves, spelled", () => {
    expect(findParallels(["C3", "G3"], ["D3", "A3"])).toEqual([
      { voices: [0, 1], type: "P5" },
    ]);
    expect(findParallels(["C3", "C4"], ["D3", "D4"])).toEqual([
      { voices: [0, 1], type: "P8" },
    ]);
    // Compound: parallel twelfths are parallel fifths.
    expect(findParallels(["C3", "G4"], ["D3", "A4"])).toEqual([
      { voices: [0, 1], type: "P5" },
    ]);
  });

  test("oblique and contrary motion are fine, and spelling matters", () => {
    expect(findParallels(["C3", "G3"], ["C3", "A3"])).toEqual([]);
    // d5 → P5 is not a parallel fifth (the first interval is diminished).
    expect(findParallels(["B2", "F3"], ["C3", "G3"])).toEqual([]);
    // Contrary octaves are still parallels by pitch-class? No — the pair
    // must form the same perfect class in both chords with both moving.
    expect(findParallels(["C3", "C4"], ["G2", "G3"])).toEqual([
      { voices: [0, 1], type: "P8" },
    ]);
  });

  test("size mismatch throws", () => {
    expect(() => findParallels(["C3"], ["C3", "G3"])).toThrow(RangeError);
  });
});

describe("voiceLeadingCost", () => {
  test("sums absolute per-voice motion", () => {
    expect(
      voiceLeadingCost(["C3", "E3", "G3", "C4"], ["B2", "D3", "G3", "D4"])
    ).toBe(5);
    expect(voiceLeadingCost(["C3"], ["C3"])).toBe(0);
    expect(() => voiceLeadingCost(["C3"], ["C3", "G3"])).toThrow(RangeError);
  });
});

describe("nextVoicing", () => {
  test("keeps the bass on the root and covers the essential tones", () => {
    const from = voiceChord("C");
    const to = nextVoicing(from, "G7");
    expect((to[0] as Note).pitchClass).toBe(Note.from("G4").pitchClass);
    const pcs = new Set(to.map((n) => n.pitchClass));
    for (const essential of ["G4", "B4", "F4"]) {
      expect(pcs.has(Note.from(essential).pitchClass)).toBe(true);
    }
  });

  test("sus chords keep their suspension — it stands in for the third", () => {
    const fourth = Note.from("F4").pitchClass;
    expect(voiceChord("C7sus4").some((n) => n.pitchClass === fourth)).toBe(
      true
    );
    const to = nextVoicing(["C3", "E3", "G3", "C4"], "G9sus4");
    expect(to.some((n) => n.pitchClass === Note.from("C4").pitchClass)).toBe(
      true
    );
    const sus2 = voiceChord("Csus2");
    expect(sus2.some((n) => n.pitchClass === Note.from("D4").pitchClass)).toBe(
      true
    );
  });

  test("respects maxLeap and range", () => {
    const from = voiceChord("C");
    const to = nextVoicing(from, "F", { maxLeap: 5 });
    for (let i = 0; i < from.length; i++) {
      const motion = Math.abs(
        (to[i] as Note).chroma - (from[i] as Note).chroma
      );
      expect(motion).toBeLessThanOrEqual(5);
    }
  });

  test("allowParallels permits what default mode rejects", () => {
    // Two power chords a step apart can only move in parallel fifths:
    // default mode refuses; allowParallels accepts.
    const from = ["C3", "G3"];
    expect(() => nextVoicing(from, "D5", { maxLeap: 4 })).toThrow(RangeError);
    const withParallels = nextVoicing(from, "D5", {
      allowParallels: true,
      maxLeap: 4,
    });
    expect(withParallels.map(String)).toEqual(["D3", "A3"]);
    // A full triad gives strict mode a legal answer (the third).
    const strict = nextVoicing(from, "D", { maxLeap: 4 });
    expect(findParallels(from, strict)).toEqual([]);
  });

  test("unsatisfiable constraints throw with guidance", () => {
    expect(() =>
      nextVoicing(["C3", "E3", "G3", "C4"], "F#", { maxLeap: 2 })
    ).toThrow(RangeError);
  });
});

describe("voiceProgression — property-tested", () => {
  const POOL = [
    "C",
    "Dm7",
    "Em",
    "F",
    "G7",
    "Am7",
    "Bdim",
    "Cmaj7",
    "Fmaj7",
    "E7",
    "A7",
    "Dm7b5",
    "Ab",
    "Bb7",
    "F#m7",
    "G7sus4",
    "C9sus4",
    "Adim7",
    "Eaug",
    "F6/9",
    "D13",
    "Db7",
  ] as const;

  test("random progressions are always parallel-free, ordered, in range", () => {
    let seed = 987654321;
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed;
    };
    let succeeded = 0;
    for (let trial = 0; trial < 40; trial++) {
      const length = 3 + (next() % 5);
      const voices = 3 + (next() % 3);
      const symbols = Array.from(
        { length },
        () => POOL[next() % POOL.length] as string
      );
      // Tight voice counts can make a connection genuinely unsatisfiable —
      // the contract is: a valid result or a RangeError, never bad output.
      let voicings: Note[][];
      try {
        voicings = voiceProgression(symbols, { voices });
      } catch (error) {
        expect(error).toBeInstanceOf(RangeError);
        continue;
      }
      succeeded++;
      expect(voicings.length).toBe(length);
      for (let i = 0; i < voicings.length; i++) {
        const v = voicings[i] as Note[];
        const chord = Chord.from(symbols[i] as string);
        // Bass holds the root's pitch class.
        expect((v[0] as Note).pitchClass).toBe(chord.root.pitchClass);
        // Ascending (unisons allowed after the first connection).
        for (let j = 1; j < v.length; j++) {
          expect((v[j] as Note).chroma).toBeGreaterThanOrEqual(
            (v[j - 1] as Note).chroma
          );
        }
        // In range.
        expect((v[0] as Note).chroma).toBeGreaterThanOrEqual(
          Note.from("E2").chroma
        );
        expect((v[v.length - 1] as Note).chroma).toBeLessThanOrEqual(
          Note.from("A5").chroma
        );
        // Every voiced pitch class belongs to the chord.
        const chordPcs = new Set(chord.notes.map((n) => n.pitchClass));
        for (const n of v) {
          expect(chordPcs.has(n.pitchClass)).toBe(true);
        }
        // Never a parallel fifth or octave against the previous voicing.
        if (i > 0) {
          expect(findParallels(voicings[i - 1] as Note[], v)).toEqual([]);
        }
      }
    }
    // The property has teeth only if most trials actually ran.
    expect(succeeded).toBeGreaterThan(30);
  });

  test("four-voice defaults never dead-end on this pool", () => {
    let seed = 24681357;
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed;
    };
    for (let trial = 0; trial < 60; trial++) {
      const symbols = Array.from(
        { length: 3 + (next() % 6) },
        () => POOL[next() % POOL.length] as string
      );
      const voicings = voiceProgression(symbols);
      for (let i = 1; i < voicings.length; i++) {
        expect(
          findParallels(voicings[i - 1] as Note[], voicings[i] as Note[])
        ).toEqual([]);
      }
    }
  });

  test("empty progressions throw", () => {
    expect(() => voiceProgression([])).toThrow(RangeError);
  });
});
