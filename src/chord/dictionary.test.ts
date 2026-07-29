import { describe, expect, test } from "bun:test";
import { intervalName } from "../interval/interval";
import {
  LEFTHAND_VOICINGS,
  TRIAD_VOICINGS,
  lookupVoicings,
  voicingsOf,
} from "./dictionary";

describe("lookupVoicings", () => {
  test("parses a dictionary entry into intervals", () => {
    const forms = lookupVoicings("maj7", LEFTHAND_VOICINGS);
    expect(forms).toHaveLength(2);
    expect(forms[0]?.map(intervalName)).toEqual(["M3", "P5", "M7", "M9"]);
  });

  test("an absent quality yields no voicings rather than undefined", () => {
    expect(lookupVoicings("power", LEFTHAND_VOICINGS)).toEqual([]);
    expect(lookupVoicings("notAQuality", TRIAD_VOICINGS)).toEqual([]);
  });

  test("every built-in entry parses", () => {
    for (const dictionary of [LEFTHAND_VOICINGS, TRIAD_VOICINGS]) {
      for (const quality of Object.keys(dictionary)) {
        const forms = lookupVoicings(quality, dictionary);
        expect(forms.length).toBeGreaterThan(0);
        for (const form of forms) expect(form.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("voicingsOf", () => {
  test("realises triad inversions on the chord's root", () => {
    const forms = voicingsOf("C", TRIAD_VOICINGS);
    expect(forms).toHaveLength(3);
    expect(forms[0]?.map(String)).toEqual(["C4", "E4", "G4"]);
    expect(forms[1]?.map(String)).toEqual(["E4", "G4", "C5"]);
    expect(forms[2]?.map(String)).toEqual(["G4", "C5", "E5"]);
  });

  test("left-hand voicings are rootless", () => {
    const forms = voicingsOf("Dm7", LEFTHAND_VOICINGS);
    expect(forms[0]?.map(String)).toEqual(["F4", "A4", "C5", "E5"]);
    // The root is left to the bass.
    expect(forms[0]?.some((n) => n.letter === "D")).toBe(false);
  });

  test("transposes with the root, keeping spelling", () => {
    expect(voicingsOf("Ebmaj7", LEFTHAND_VOICINGS)[0]?.map(String)).toEqual([
      "G4",
      "Bb4",
      "D5",
      "F5",
    ]);
  });

  test("a quality the dictionary does not cover yields nothing", () => {
    expect(voicingsOf("C5", TRIAD_VOICINGS)).toEqual([]);
  });
});
