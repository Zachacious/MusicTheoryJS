/**
 * The scale dictionary tested for internal invariants and against the
 * reference implementation (dev-dependency only): wherever the reference
 * knows a name or alias we accept, the pitch-class content must agree.
 * (Spelling is compared in our own template tests — the reference spells a
 * few scales differently, e.g. the augmented scale's A2 for our m3.)
 */
import { describe, expect, test } from "bun:test";
import { ScaleType as RefScaleType } from "tonal";
import { pcsetMask } from "../pitch/pcset";
import { Scale } from "./scale";
import {
  SCALE_DEFINITIONS,
  SCALE_TEMPLATES,
  isScaleName,
  scaleTemplate,
} from "./templates";

describe("scale dictionary invariants", () => {
  test("the dictionary holds 92 scales", () => {
    expect(SCALE_DEFINITIONS.length).toBe(92);
  });

  test("canonical names and aliases never collide", () => {
    const all = SCALE_DEFINITIONS.flatMap((def) => [def.name, ...def.aliases]);
    expect(new Set(all).size).toBe(all.length);
  });

  test("every template starts on the tonic, ascends, and repeats no pitch class", () => {
    for (const def of SCALE_DEFINITIONS) {
      const semitones = def.intervals.map((iv) => iv.semitones);
      expect(semitones[0]).toBe(0);
      for (let i = 1; i < semitones.length; i++) {
        expect(semitones[i]).toBeGreaterThan(semitones[i - 1] as number);
        expect(semitones[i]).toBeLessThan(12);
      }
      expect(new Set(semitones).size).toBe(semitones.length);
    }
  });

  test("legacy names still resolve", () => {
    for (const legacy of [
      "ionian",
      "aeolian",
      "acoustic",
      "gypsyMinor",
      "chinese",
      "romanian",
      "arabian",
      "halfDiminished",
    ]) {
      expect(isScaleName(legacy)).toBe(true);
    }
    // Aliases share their canonical template.
    expect(SCALE_TEMPLATES.ionian).toBe(SCALE_TEMPLATES.major);
    expect(SCALE_TEMPLATES.gypsyMinor).toBe(SCALE_TEMPLATES.hungarianMinor);
    expect(SCALE_TEMPLATES.acoustic).toBe(SCALE_TEMPLATES.lydianDominant);
  });

  test("spaced aliases work through Scale.from strings", () => {
    expect(Scale.from("C4 melodic minor").noteNames()).toEqual(
      Scale.from("C4", "melodicMinor").noteNames()
    );
    expect(Scale.from("D4 dorian b2").name).toBe("dorian b2");
    expect(Scale.from("Eb4 super locrian").noteNames()).toEqual(
      Scale.from("Eb4", "altered").noteNames()
    );
  });
});

/** Our template's pitch-class chroma string, reference-style (bit 0 = tonic). */
function chromaString(name: string): string {
  const template = scaleTemplate(name);
  const mask = pcsetMask(template.map((iv) => iv.semitones));
  let out = "";
  for (let pc = 0; pc < 12; pc++) out += mask & (1 << pc) ? "1" : "0";
  return out;
}

describe("differential sweep: every scale name vs the reference", () => {
  for (const def of SCALE_DEFINITIONS) {
    test(def.name, () => {
      let checked = 0;
      for (const name of [def.name, ...def.aliases]) {
        const ref = RefScaleType.get(name.toLowerCase());
        if (ref.empty) continue;
        checked++;
        expect(chromaString(def.name)).toBe(ref.chroma);
      }
      // Every scale should be corroborated through at least one of its
      // names; a zero here means an alias set that nothing verifies.
      expect(checked).toBeGreaterThan(0);
    });
  }
});
