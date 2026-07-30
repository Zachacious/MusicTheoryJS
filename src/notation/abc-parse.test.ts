import { describe, expect, test } from "bun:test";
import { Scale } from "../scale/scale";
import { sequenceToScore } from "../sequence/convert";
import { toABC } from "./abc";
import { abcToNote, fromABC, noteToABC, tokenizeABC } from "./abc-parse";

describe("tokenizeABC", () => {
  test("splits accidental, letter, and octave marks", () => {
    expect(tokenizeABC("^F")).toEqual({
      accidental: "^",
      letter: "F",
      octave: "",
    });
    expect(tokenizeABC("__B,,")).toEqual({
      accidental: "__",
      letter: "B",
      octave: ",,",
    });
    expect(tokenizeABC("c'")).toEqual({
      accidental: "",
      letter: "c",
      octave: "'",
    });
  });

  test("rejects non-pitches", () => {
    expect(tokenizeABC("x")).toBeNull();
    expect(tokenizeABC("z")).toBeNull();
    expect(tokenizeABC("")).toBeNull();
  });
});

describe("abcToNote", () => {
  test("reads case and octave marks as register", () => {
    expect(abcToNote("C").toString()).toBe("C4");
    expect(abcToNote("c").toString()).toBe("C5");
    expect(abcToNote("C,").toString()).toBe("C3");
    expect(abcToNote("C,,").toString()).toBe("C2");
    expect(abcToNote("c'").toString()).toBe("C6");
  });

  test("reads accidentals, including doubles and naturals", () => {
    expect(abcToNote("^F").toString()).toBe("F#4");
    expect(abcToNote("_B").toString()).toBe("Bb4");
    expect(abcToNote("^^F").toString()).toBe("F##4");
    expect(abcToNote("__B").toString()).toBe("Bbb4");
    // An explicit natural overrides the supplied signature.
    expect(abcToNote("=F", { F: 1 }).toString()).toBe("F4");
  });

  test("falls back to the key signature when no accidental is written", () => {
    expect(abcToNote("F", { F: 1 }).toString()).toBe("F#4");
    expect(abcToNote("F").toString()).toBe("F4");
  });

  test("rejects invalid input", () => {
    expect(() => abcToNote("H")).toThrow(SyntaxError);
  });
});

describe("noteToABC", () => {
  test("writes register and accidental", () => {
    expect(noteToABC("C4")).toBe("C");
    expect(noteToABC("C5")).toBe("c");
    expect(noteToABC("C3")).toBe("C,");
    expect(noteToABC("F#4")).toBe("^F");
    expect(noteToABC("Bb5")).toBe("_b");
  });

  test("round-trips every pitch it can write", () => {
    for (const name of ["C4", "F#4", "Bb3", "G5", "A2", "Ebb4", "C##6"]) {
      expect(abcToNote(noteToABC(name)).toString()).toBe(name);
    }
  });
});

describe("fromABC", () => {
  test("reads header fields and notes", () => {
    const tune = fromABC("X:1\nT:Scale\nM:4/4\nK:D\nD2 E2 F2 G2 |]");
    expect(tune.title).toBe("Scale");
    expect(tune.meter).toBe("4/4");
    expect(tune.key).toBe("D");
    // F is sharp by key signature.
    expect(tune.notes.map(String)).toEqual(["D4", "E4", "F#4", "G4"]);
  });

  test("accidentals persist to the end of their measure only", () => {
    const tune = fromABC("K:C\n^F F | F |]");
    expect(tune.notes.map(String)).toEqual(["F#4", "F#4", "F4"]);
  });

  test("collects chord tones and skips rests", () => {
    expect(fromABC("K:C\n[CEG]4 |]").notes.map(String)).toEqual([
      "C4",
      "E4",
      "G4",
    ]);
    expect(fromABC("K:C\nz4 C2 |]").notes.map(String)).toEqual(["C4"]);
  });

  test("skips chord symbols and decorations rather than reading them as notes", () => {
    // The quoted "Am" must not contribute an A and an m.
    expect(fromABC('K:C\n"Am" C2 D2 |]').notes.map(String)).toEqual([
      "C4",
      "D4",
    ]);
    expect(fromABC("K:C\n!trill! C2 |]").notes.map(String)).toEqual(["C4"]);
  });

  test("reads modal key fields", () => {
    // D dorian shares C major's signature: nothing is inflected.
    expect(fromABC("K:Ddor\nD2 F2 C2 |]").notes.map(String)).toEqual([
      "D4",
      "F4",
      "C4",
    ]);
    // E dorian shares D major's two sharps, so F and C are sharp.
    expect(fromABC("K:Edor\nE2 F2 C2 |]").notes.map(String)).toEqual([
      "E4",
      "F#4",
      "C#4",
    ]);
    // A minor is spelled natively, not via a mode lookup.
    expect(fromABC("K:Am\nA2 C2 |]").notes.map(String)).toEqual(["A4", "C4"]);
  });

  test("tolerates a tune with no header", () => {
    expect(fromABC("C D E").notes.map(String)).toEqual(["C4", "D4", "E4"]);
  });

  test("round-trips what toABC writes", () => {
    const notes = ["C4", "D4", "E4", "F#4", "G4", "A4", "B4", "C5"];
    expect(fromABC(toABC(notes)).notes.map(String)).toEqual(notes);

    const scale = Scale.from("D4", "major");
    const rendered = toABC(scale, { key: "D major" });
    expect(fromABC(rendered).notes.map(String)).toEqual(
      scale.notes.map(String)
    );
  });
});

describe("fromABC rhythm", () => {
  test("durations against an explicit unit length, rests as gaps", () => {
    const tune = fromABC("X:1\nM:4/4\nL:1/4\nK:C\nC D2 z E |]");
    expect(tune.stream.map((e) => e.start)).toEqual([0, 1, 4]);
    expect(tune.stream.map((e) => e.duration)).toEqual([1, 2, 1]);
  });

  test("the default unit length follows the meter", () => {
    // 4/4 defaults to eighths; 2/4 (under 3/4 of a whole note) to sixteenths.
    expect(fromABC("M:4/4\nK:C\nC2 D2").stream[1]?.start).toBe(1);
    expect(fromABC("M:2/4\nK:C\nC2 D2").stream[1]?.start).toBe(0.5);
  });

  test("fractional factors: /2, /, 3/2, //", () => {
    const tune = fromABC("K:C\nC/2 C/ C3/2 C// |]");
    expect(tune.stream.map((e) => e.duration)).toEqual([
      0.25, 0.25, 0.75, 0.125,
    ]);
    expect(tune.stream.map((e) => e.start)).toEqual([0, 0.25, 0.5, 1.25]);
  });

  test("broken rhythms dot one side and halve the other", () => {
    const tune = fromABC("K:C\nC>D E<F |]");
    expect(tune.stream.map((e) => e.duration)).toEqual([
      0.75, 0.25, 0.25, 0.75,
    ]);
    expect(tune.stream.map((e) => e.start)).toEqual([0, 0.75, 1, 1.25]);
  });

  test("ties merge into one event and carry their inflection over the bar", () => {
    const tune = fromABC("K:C\n^F2- | F2 F2 |]");
    expect(tune.stream.map((e) => e.pitch.toString())).toEqual(["F#4", "F4"]);
    expect(tune.stream.map((e) => [e.start, e.duration])).toEqual([
      [0, 2],
      [2, 1],
    ]);
    // The written notes still appear one by one.
    expect(tune.notes.map(String)).toEqual(["F#4", "F#4", "F4"]);
  });

  test("a tie into a different pitch stays two events", () => {
    const tune = fromABC("K:C\nC2- D2 |]");
    expect(tune.stream).toHaveLength(2);
    expect(tune.stream.map((e) => e.duration)).toEqual([1, 1]);
  });

  test("tuplet groups scale their notes", () => {
    const explicit = fromABC("M:4/4\nK:C\n(3:2:3 C C C C |]");
    expect(explicit.stream[1]?.start).toBeCloseTo(1 / 3, 9);
    expect(explicit.stream[3]?.start).toBeCloseTo(1, 9);
    expect(explicit.stream[3]?.duration).toBe(0.5);
    // A bare (3 means three in the time of two in a simple meter.
    const bare = fromABC("M:4/4\nK:C\n(3 C C C C |]");
    expect(bare.stream[2]?.duration).toBeCloseTo(1 / 3, 9);
    expect(bare.stream[3]?.duration).toBe(0.5);
  });

  test("chords stack every tone at one onset", () => {
    const tune = fromABC("K:C\n[CEG]2 [ce]/ |]");
    expect(tune.stream.map((e) => e.start)).toEqual([0, 0, 0, 1, 1]);
    expect(tune.stream.map((e) => e.duration)).toEqual([1, 1, 1, 0.25, 0.25]);
  });

  test("reads the tempo field in quarter-note BPM", () => {
    expect(fromABC("X:1\nQ:1/4=120\nK:C\nC").tempo).toBe(120);
    expect(fromABC("X:1\nQ:1/8=120\nK:C\nC").tempo).toBe(60);
    // The bare form counts unit note lengths per minute.
    expect(fromABC("X:1\nL:1/8\nQ:140\nK:C\nC").tempo).toBe(70);
    expect(fromABC("X:1\nK:C\nC").tempo).toBeUndefined();
  });

  test("repeats and voltas pass through as barlines, unexpanded", () => {
    const tune = fromABC("K:C\n|: C2 :|1 D2 :|2 E2 |]");
    expect(tune.notes.map(String)).toEqual(["C4", "D4", "E4"]);
    expect(tune.stream.map((e) => e.start)).toEqual([0, 1, 2]);
  });

  test("inline fields and lyric lines contribute no notes", () => {
    const tune = fromABC("K:C\nC2 [K:G] D2 |]\nw: la la");
    expect(tune.notes.map(String)).toEqual(["C4", "D4"]);
    expect(tune.stream.map((e) => e.start)).toEqual([0, 1]);
  });

  test("a multi-measure rest spans whole bars", () => {
    const tune = fromABC("M:4/4\nK:C\nC2 | Z2 | D2 |]");
    expect(tune.stream.map((e) => e.start)).toEqual([0, 9]);
  });

  test("round-trips a sequenced score: chords, a cross-bar tie, a rest", () => {
    const stream = [
      { pitch: "C4", start: 0, duration: 3 },
      { pitch: "E4", start: 3, duration: 2 },
      { pitch: "G4", start: 3, duration: 2 },
      { pitch: "D4", start: 6, duration: 1 },
    ];
    const score = sequenceToScore(stream, {
      key: "C major",
      timeSignature: "4/4",
      tempo: 96,
    });
    const back = fromABC(toABC(score));
    expect(back.tempo).toBe(96);
    expect(
      back.stream.map((e) => [e.pitch.toString(), e.start, e.duration])
    ).toEqual([
      ["C4", 0, 3],
      ["E4", 3, 2],
      ["G4", 3, 2],
      ["D4", 6, 1],
    ]);
  });
});
