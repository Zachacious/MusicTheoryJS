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
      const scale = scaleParser("Cmajor");
      expect(scale.key).toBe(Semitone.C);
      expect(scale.octave).toBe(DEFAULT_OCTAVE);
      expect(scale.template).toBe(ScaleTemplates.MAJOR);
   });

   it("should parse a scale with a custom octave", () => {
      const scale = scaleParser("C8minor");
      expect(scale.key).toBe(Semitone.C);
      expect(scale.octave).toBe(8);
      expect(scale.template).toBe(ScaleTemplates.MINOR);
   });

   it(`should parse a scale with a modifier`, () => {
      const scale = scaleParser("Eb7major");
      expect(scale.key).toBe(Semitone.Eb);
      expect(scale.octave).toBe(7);
      expect(scale.template).toBe(ScaleTemplates.MAJOR);
   });

   it(`should parse a scale when components are out of order`, () => {
      const scale = scaleParser("3yoAs");
      expect(scale.key).toBe(Semitone.As);
      expect(scale.octave).toBe(3);
      expect(scale.template).toBe(ScaleTemplates.YO);
   });

   it(`should throw error if unknown scale name`, () => {
      expect(() => scaleParser("C7alpha")).toThrowError();
   });
});
