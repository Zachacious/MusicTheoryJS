import { describe, expect, it } from "vitest";

import { MusicTheoryError } from "../../src/core";
import {
  chordToRoman,
  romanNumeral,
  romanToChord,
  tryRomanNumeral,
} from "../../src/roman";

describe("romanNumeral() parsing", () => {
  it("parses degree, accidental, quality, and case", () => {
    const r = romanNumeral("bVII");
    expect(r.degree).toBe(7);
    expect(r.accidental).toBe(-1);
    expect(r.chordType).toBe("major");
    expect(romanNumeral("ii7").chordType).toBe("minor seventh");
    expect(romanNumeral("iiø7").chordType).toBe("half-diminished");
    expect(romanNumeral("vii°7").chordType).toBe("diminished seventh");
    expect(romanNumeral("III+").chordType).toBe("augmented");
    expect(romanNumeral("Imaj7").chordType).toBe("major seventh");
    expect(romanNumeral("imaj7").chordType).toBe("minor/major seventh");
    expect(romanNumeral("V9").chordType).toBe("dominant ninth");
  });

  it("parses secondary functions (audit defect #12 regression: never dropped)", () => {
    const r = romanNumeral("V7/V");
    expect(r.secondary).not.toBeNull();
    expect(r.secondary!.degree).toBe(5);
    expect(r.symbol).toBe("V7/V");
    const chain = romanNumeral("V/V/V");
    expect(chain.secondary!.secondary!.degree).toBe(5);
  });

  it("parses figured-bass inversions", () => {
    expect(romanNumeral("V6").inversion).toBe(1);
    expect(romanNumeral("V64").inversion).toBe(2);
    expect(romanNumeral("V7").inversion).toBe(0);
    expect(romanNumeral("V65").inversion).toBe(1);
    expect(romanNumeral("V43").inversion).toBe(2);
    expect(romanNumeral("V42").inversion).toBe(3);
    expect(romanNumeral("V2").inversion).toBe(3);
    expect(romanNumeral("V65").chordType).toBe("dominant seventh");
    expect(romanNumeral("ii65").chordType).toBe("minor seventh");
  });

  it("round-trips symbols through parse → format", () => {
    for (const s of ["I", "ii7", "bVII", "V7/V", "V65", "iiø7", "vii°7", "bII6", "V7/ii", "#iv°"]) {
      expect(romanNumeral(s).symbol).toBe(s);
    }
  });

  it("normalizes ASCII marker variants", () => {
    expect(romanNumeral("viio7").symbol).toBe("vii°7");
    expect(romanNumeral("iiØ7").symbol).toBe("iiø7");
  });

  it("resolves marker + explicit suffix through the alias families", () => {
    expect(romanNumeral("III+maj7").chordType).toBe("augmented seventh");
    expect(romanNumeral("vii°M7").chordType).toBe(""); // the oM7 type is unnamed
    expect(romanNumeral("vii°M7").quality).toBe("oM7");
  });

  it("rejects junk with clear errors", () => {
    expect(() => romanNumeral("VIII")).toThrow(MusicTheoryError);
    expect(() => romanNumeral("Vx9")).toThrow(MusicTheoryError);
    expect(() => romanNumeral("iiø9")).toThrow(MusicTheoryError);
    expect(tryRomanNumeral("nope")).toBeNull();
    expect(tryRomanNumeral("Cmaj7")).toBeNull();
  });
});

describe("romanToChord()", () => {
  const cases: ReadonlyArray<readonly [string, string, string]> = [
    ["V7/V", "C major", "D7"],
    ["V7/ii", "C major", "A7"],
    ["V/V/V", "C major", "A"],
    ["V7", "C major", "G7"],
    ["ii7", "C major", "Dm7"],
    ["V65", "C major", "G7/B"],
    ["IV64", "C major", "F/C"],
    ["bVII", "C major", "Bb"],
    ["bII6", "C major", "Db/F"],
    ["iiø7", "c minor", "Dm7b5"],
    ["V7", "c minor", "G7"],
    ["bVI", "c minor", "Ab"],
    ["V42", "Eb major", "Bb7/Ab"],
    ["Imaj7", "F# major", "F#maj7"],
    ["vii°7", "a minor", "G#dim7"],
  ];
  for (const [roman, keyName, symbol] of cases) {
    it(`${roman} in ${keyName} → ${symbol}`, () => {
      expect(romanToChord(roman, keyName).symbol).toBe(symbol);
    });
  }
});

describe("chordToRoman()", () => {
  const cases: ReadonlyArray<readonly [string, string, string]> = [
    ["D7", "C major", "V7/V"],
    ["A7", "C major", "V7/ii"],
    ["E7", "C major", "V7/vi"],
    ["B7", "C major", "V7/iii"],
    ["C7", "C major", "V7/IV"],
    ["D", "C major", "V/V"],
    ["G7", "C major", "V7"],
    ["G7/B", "C major", "V65"],
    ["Dm7", "C major", "ii7"],
    ["Bm7b5", "C major", "viiø7"],
    ["Bdim7", "C major", "vii°7"],
    ["Ab", "C major", "bVI"],
    ["Bb7", "C major", "bVII7"],
    ["C/E", "C major", "I6"],
    ["Fm", "C major", "iv"],
    ["G7", "c minor", "V7"],
    ["Cm6", "c minor", "im6"],
    ["F6", "C major", "IVadd6"],
  ];
  for (const [symbol, keyName, roman] of cases) {
    it(`${symbol} in ${keyName} → ${roman}`, () => {
      expect(chordToRoman(symbol, keyName).symbol).toBe(roman);
    });
  }
});

describe("V7/V round-trip (Phase 3 acceptance)", () => {
  it("round-trips through chords and back in every major key", () => {
    for (const tonic of ["C", "G", "D", "F", "Bb", "Eb", "F#"]) {
      const keyName = `${tonic} major`;
      const c = romanToChord("V7/V", keyName);
      expect(chordToRoman(c, keyName).symbol).toBe("V7/V");
    }
  });

  it("round-trips other numerals symbol-exactly", () => {
    for (const r of ["ii7", "V65", "bVII", "V7/ii", "iiø7", "vii°7", "IV64"]) {
      const c = romanToChord(r, "C major");
      expect(chordToRoman(c, "C major").symbol).toBe(r);
    }
  });
});
