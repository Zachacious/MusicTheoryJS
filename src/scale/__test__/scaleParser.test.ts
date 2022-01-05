import scaleParser from "../scaleParser";
import ScaleTemplates from "../ScaleTemplates";
import {
   MODIFIED_SEMITONES,
   TONES_MAX,
   TONES_MIN,
   OCTAVE_MAX,
   OCTAVE_MIN,
   DEFAULT_OCTAVE,
   DEFAULT_SEMITONE,
} from "../../Note/noteConstants";
import Semitone from "../../semitone";

describe("scaleParser", () => {
   it("should parse a scale", () => {
      const scale = scaleParser("C(major)");
      expect(scale.key).toBe(Semitone.C);
      expect(scale.octave).toBe(DEFAULT_OCTAVE);
      expect(scale?.template?.[0]).toBe(ScaleTemplates.major[0]);
      expect(scale?.template?.[1]).toBe(ScaleTemplates.major[1]);
      expect(scale?.template?.[2]).toBe(ScaleTemplates.major[2]);
      expect(scale?.template?.[3]).toBe(ScaleTemplates.major[3]);
      expect(scale?.template?.[4]).toBe(ScaleTemplates.major[4]);
      expect(scale?.template?.[5]).toBe(ScaleTemplates.major[5]);
      expect(scale?.template?.[6]).toBe(ScaleTemplates.major[6]);

      const scale2 = scaleParser("D2(dorian)");
      expect(scale2.key).toBe(Semitone.D);
      expect(scale2.octave).toBe(2);
      expect(scale2?.template?.[0]).toBe(ScaleTemplates.dorian[0]);
      expect(scale2?.template?.[1]).toBe(ScaleTemplates.dorian[1]);
      expect(scale2?.template?.[2]).toBe(ScaleTemplates.dorian[2]);
      expect(scale2?.template?.[3]).toBe(ScaleTemplates.dorian[3]);
      expect(scale2?.template?.[4]).toBe(ScaleTemplates.dorian[4]);
      expect(scale2?.template?.[5]).toBe(ScaleTemplates.dorian[5]);
      expect(scale2?.template?.[6]).toBe(ScaleTemplates.dorian[6]);
   });

   it("should parse a scale with a custom octave", () => {
      const scale = scaleParser("C8(minor)");
      expect(scale.key).toBe(Semitone.C);
      expect(scale.octave).toBe(8);
      expect(scale.template).toBe(ScaleTemplates.minor);
   });

   it(`should parse a scale with a modifier`, () => {
      const scale = scaleParser("Eb7(major)");
      expect(scale.key).toBe(Semitone.Eb);
      expect(scale.octave).toBe(7);
      expect(scale.template).toBe(ScaleTemplates.major);
   });

   it(`should parse a scale when components are out of order`, () => {
      const scale = scaleParser("3(yo)As");
      expect(scale.key).toBe(Semitone.As);
      expect(scale.octave).toBe(3);
      expect(scale.template).toBe(ScaleTemplates.yo);
   });

   it(`should throw error if unknown scale name`, () => {
      expect(() => scaleParser("C7(alpha)")).toThrowError();
   });

   it(`should throw an error if scale string is invalid`, () => {
      expect(() => scaleParser("7minor")).toThrowError();
   });
});
