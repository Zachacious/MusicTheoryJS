import { describe, expect, test } from "bun:test";
import { Chord } from "../chord/chord";
import {
  chordToRoman,
  formatRomanNumeral,
  parseRomanNumeral,
  romanToChord,
  tryParseRomanNumeral,
} from "./roman";

describe("parseRomanNumeral", () => {
  test("plain numerals carry degree, case, and accidentals", () => {
    expect(parseRomanNumeral("IV")).toMatchObject({
      degree: 4,
      alteration: 0,
      quality: "maj",
      inversion: 0,
      secondary: null,
    });
    expect(parseRomanNumeral("vi").quality).toBe("min");
    expect(parseRomanNumeral("bVII").alteration).toBe(-1);
    expect(parseRomanNumeral("#iv").alteration).toBe(1);
    expect(parseRomanNumeral("♭III").alteration).toBe(-1);
  });

  test("markers and suffixes resolve through the chord dictionary", () => {
    expect(parseRomanNumeral("vii°").quality).toBe("dim");
    expect(parseRomanNumeral("viio7").quality).toBe("dim7");
    expect(parseRomanNumeral("iiø").quality).toBe("min7b5");
    expect(parseRomanNumeral("III+").quality).toBe("aug");
    expect(parseRomanNumeral("V+7").quality).toBe("aug7");
    expect(parseRomanNumeral("Imaj7").quality).toBe("maj7");
    expect(parseRomanNumeral("imaj7").quality).toBe("minMaj7");
    expect(parseRomanNumeral("ii9").quality).toBe("min9");
    expect(parseRomanNumeral("V7b9").quality).toBe("dom7b9");
    expect(parseRomanNumeral("V13").quality).toBe("dom13");
    expect(parseRomanNumeral("Isus4").quality).toBe("sus4");
    expect(parseRomanNumeral("Iadd6").quality).toBe("maj6");
    expect(parseRomanNumeral("ii6/9").quality).toBe("min69");
  });

  test("figured bass figures set inversion and imply sevenths", () => {
    expect(parseRomanNumeral("I6")).toMatchObject({
      quality: "maj",
      inversion: 1,
    });
    expect(parseRomanNumeral("I64").inversion).toBe(2);
    expect(parseRomanNumeral("V65")).toMatchObject({
      quality: "dom7",
      inversion: 1,
    });
    expect(parseRomanNumeral("ii43")).toMatchObject({
      quality: "min7",
      inversion: 2,
    });
    expect(parseRomanNumeral("V42").inversion).toBe(3);
    expect(parseRomanNumeral("V2").symbol).toBe("V42");
    expect(parseRomanNumeral("vii°65").quality).toBe("dim7");
  });

  test("secondary functions chain", () => {
    const r = parseRomanNumeral("V7/V");
    expect(r.quality).toBe("dom7");
    expect(r.secondary?.degree).toBe(5);
    const deep = parseRomanNumeral("V/V/V");
    expect(deep.secondary?.secondary?.symbol).toBe("V");
    expect(parseRomanNumeral("vii°7/V").secondary?.symbol).toBe("V");
  });

  test("rejects non-numerals", () => {
    expect(tryParseRomanNumeral("H7")).toBeNull();
    expect(tryParseRomanNumeral("V7/nope")).toBeNull();
    expect(tryParseRomanNumeral("IIVI")).toBeNull();
    expect(tryParseRomanNumeral("Vxyz")).toBeNull();
    expect(() => parseRomanNumeral("")).toThrow(SyntaxError);
  });
});

describe("round-trip: parse ↔ format", () => {
  const CANONICAL = [
    "I",
    "ii",
    "iii",
    "IV",
    "V",
    "vi",
    "vii°",
    "i",
    "ii°",
    "bIII",
    "iv",
    "v",
    "bVI",
    "bVII",
    "V7",
    "ii7",
    "Imaj7",
    "imaj7",
    "iiø7",
    "vii°7",
    "V+7",
    "III+",
    "ii9",
    "V7b9",
    "V13",
    "V7#9",
    "Isus4",
    "Iadd6",
    "ii6/9",
    "I6",
    "I64",
    "V65",
    "V43",
    "V42",
    "vii°65",
    "V7/V",
    "V7/ii",
    "vii°7/V",
    "V/V/V",
    "#iv",
    "bII maj7".replace(" ", ""),
  ] as const;

  for (const symbol of CANONICAL) {
    test(`"${symbol}" survives parse → format → parse`, () => {
      const parsed = parseRomanNumeral(symbol);
      const formatted = formatRomanNumeral(parsed);
      const reparsed = parseRomanNumeral(formatted);
      expect(formatted).toBe(parsed.symbol);
      expect(reparsed).toEqual(parsed);
    });
  }

  test("aliases normalize to one canonical spelling", () => {
    expect(parseRomanNumeral("viio7").symbol).toBe("vii°7");
    expect(parseRomanNumeral("iiØ7").symbol).toBe("iiø7");
    expect(parseRomanNumeral("♭VII").symbol).toBe("bVII");
    expect(parseRomanNumeral("V2").symbol).toBe("V42");
  });
});

describe("romanToChord", () => {
  test("plain numerals resolve against the key's own scale", () => {
    expect(romanToChord("I", "C major").toString()).toBe("C");
    expect(romanToChord("ii7", "C major").toString()).toBe("Dm7");
    expect(romanToChord("bVII", "C major").toString()).toBe("Bb");
    expect(romanToChord("VII", "A minor").toString()).toBe("G");
    expect(romanToChord("iiø7", "C minor").toString()).toBe("Dm7b5");
    expect(romanToChord("V13", "F major").toString()).toBe("C13");
  });

  test("secondary functions resolve recursively", () => {
    expect(romanToChord("V7/V", "C major").toString()).toBe("D7");
    expect(romanToChord("V7/ii", "C major").toString()).toBe("A7");
    expect(romanToChord("V7/V", "Eb major").toString()).toBe("F7");
    expect(romanToChord("V/V/V", "C major").toString()).toBe("A");
    expect(romanToChord("vii°7/V", "C major").toString()).toBe("F#dim7");
  });

  test("figures produce inversions", () => {
    expect(romanToChord("I6", "C major").noteNames()).toEqual([
      "E4",
      "G4",
      "C5",
    ]);
    expect(romanToChord("V65", "C major").noteNames()).toEqual([
      "B4",
      "D5",
      "F5",
      "G5",
    ]);
    expect(() => romanToChord("I64", "C major")).not.toThrow();
  });
});

describe("chordToRoman", () => {
  test("diatonic chords in major", () => {
    expect(chordToRoman("C", "C major").symbol).toBe("I");
    expect(chordToRoman("Dm7", "C major").symbol).toBe("ii7");
    expect(chordToRoman("G7", "C major").symbol).toBe("V7");
    expect(chordToRoman("Bdim", "C major").symbol).toBe("vii°");
    expect(chordToRoman("Fmaj7", "C major").symbol).toBe("IVmaj7");
  });

  test("minor keys accept all three variants as diatonic", () => {
    expect(chordToRoman("E7", "A minor").symbol).toBe("V7");
    expect(chordToRoman("Am", "A minor").symbol).toBe("i");
    expect(chordToRoman("G", "A minor").symbol).toBe("VII");
    expect(chordToRoman("F#m7b5", "A minor").symbol).toBe("viø7");
  });

  test("applied dominants are detected", () => {
    expect(chordToRoman("D7", "C major").symbol).toBe("V7/V");
    expect(chordToRoman("A7", "C major").symbol).toBe("V7/ii");
    expect(chordToRoman("D", "C major").symbol).toBe("V/V");
    expect(chordToRoman("B7", "C major").symbol).toBe("V7/iii");
    expect(chordToRoman("F7", "Bb major").symbol).toBe("V7");
  });

  test("minor-key applied dominants are scale-relative", () => {
    // The tonicized degree keeps its diatonic case: natural minor's v is
    // minor, so B7 reads V7/v (and resolves back to B7 exactly).
    const r = chordToRoman("B7", "A minor");
    expect(r.symbol).toBe("V7/v");
    expect(romanToChord(r, "A minor").toString()).toBe("B7");
    // A dominant on a degree whose triad cannot be tonicized (ii° in minor)
    // renders chromatically instead of as an applied chord.
    expect(chordToRoman("F#7", "A minor").symbol).toBe("#VI7");
  });

  test("tritone-substitute dominants read as bII7", () => {
    const r = chordToRoman("Db7", "C major");
    expect(r.symbol).toBe("bII7");
    expect(romanToChord(r, "C major").toString()).toBe("Db7");
  });

  test("chromatic chords render with accidentals", () => {
    expect(chordToRoman("Ab", "C major").symbol).toBe("bVI");
    expect(chordToRoman("Eb", "C major").symbol).toBe("bIII");
    expect(chordToRoman("Db", "C major").symbol).toBe("bII");
  });

  test("round-trips with romanToChord for root-position chords", () => {
    for (const keyName of ["C major", "Eb major", "F# major", "A minor"]) {
      for (const symbol of ["I", "ii7", "V7", "bVII", "V7/V", "iiø7"]) {
        const chord = romanToChord(symbol, keyName);
        // Some numerals land on the same chord (V7 in minor via variants);
        // resolving the analyzed numeral must reproduce the chord exactly.
        const analyzed = chordToRoman(chord, keyName);
        expect(romanToChord(analyzed, keyName).toString()).toBe(
          chord.toString()
        );
      }
    }
  });

  test("rejects chords with unknown quality", () => {
    const cluster = Chord.from({ root: "C4", intervals: ["P1", "m2", "M2"] });
    expect(() => chordToRoman(cluster, "C major")).toThrow(RangeError);
    // An inverted triad still reads by pitch-class set: quality survives.
    expect(chordToRoman(Chord.from("C").invert(), "C major").symbol).toBe("I");
  });
});
