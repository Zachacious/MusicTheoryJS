import Scale from "../Scale";
import Semitone from "../../Semitone";
import {
   TONES_MAX,
   TONES_MIN,
   OCTAVE_MAX,
   OCTAVE_MIN,
   DEFAULT_OCTAVE,
   DEFAULT_SEMITONE,
} from "../../Note/noteConstants";
import { DEFAULT_SCALE_TEMPLATE } from "../scaleConstants";
import ScaleTemplates from "../ScaleTemplates";

describe("Scale", () => {
   it("should create an instance", () => {
      expect(new Scale()).toBeTruthy();
   });

   it("should create an instance with a value", () => {
      const scale = new Scale({
         key: Semitone.C,
         octave: 4,
         template: ScaleTemplates.minor,
      });
      expect(scale.key).toEqual(Semitone.C);
      expect(scale.octave).toEqual(4);
      expect(scale.template).toEqual(ScaleTemplates.minor);

      const scale2 = new Scale("C4");
      expect(scale2.key).toEqual(Semitone.C);
      expect(scale2.octave).toEqual(4);
      expect(scale2.template).toEqual(ScaleTemplates.major);

      const scale3 = new Scale("B7(jewish)");
      expect(scale3.key).toEqual(Semitone.B);
      expect(scale3.octave).toEqual(7);
      expect(scale3.template).toEqual(ScaleTemplates.jewish);
   });
});
