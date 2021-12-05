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

   it("should have an id", () => {
      const scale = new Scale();
      expect(scale.id).toBeDefined();
      expect(scale.id).toBeTruthy();
      expect(scale.id.length).toBeGreaterThan(0);
      expect(typeof scale.id).toBe("string");
   });

   describe("equals", () => {
      it(`should return true for scale
       with the same props regardless of id`, () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.minor,
         });
         const scale2 = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.minor,
         });
         expect(scale.equals(scale2)).toBeTruthy();
      });
   });

   describe("copy", () => {
      it("should return a copy of the scale", () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.minor,
         });
         const copy = scale.copy();
         expect(copy.equals(scale)).toBeTruthy();
         expect(copy.id).not.toBe(scale.id);
         expect(copy.key).toEqual(scale.key);
         expect(copy.octave).toEqual(scale.octave);
         expect(copy.template).toEqual(scale.template);
      });
   });

   describe("key", () => {
      it("should return the key", () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.minor,
         });
         expect(scale.key).toEqual(Semitone.C);
      });

      it("should set the key", () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.minor,
         });
         scale.key = Semitone.D;
         expect(scale.key).toEqual(Semitone.D);
      });
   });

   describe("octave", () => {
      it("should return the octave", () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.minor,
         });
         expect(scale.octave).toEqual(4);
      });

      it("should set the octave", () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.minor,
         });
         scale.octave = 5;
         expect(scale.octave).toEqual(5);
      });
   });

   describe("template", () => {
      it("should return the template", () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.minor,
         });
         expect(scale.template).toEqual(ScaleTemplates.minor);
      });

      it("should set the template", () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.minor,
         });
         scale.template = ScaleTemplates.major;
         expect(scale.template).toEqual(ScaleTemplates.major);
      });
   });

   describe("notes", () => {
      it("should return the notes", () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 7,
            template: ScaleTemplates.minor,
         });
         const notes = scale.notes;
         expect(notes.length).toEqual(7);
         expect(notes[0].semitone).toEqual(Semitone.C);
         expect(notes[0].octave).toEqual(7);
         expect(notes[1].semitone).toEqual(Semitone.D);
         expect(notes[1].octave).toEqual(7);
         expect(notes[2].semitone).toEqual(Semitone.Eb);
         expect(notes[2].octave).toEqual(7);
         expect(notes[3].semitone).toEqual(Semitone.F);
         expect(notes[3].octave).toEqual(7);
         expect(notes[4].semitone).toEqual(Semitone.G);
         expect(notes[4].octave).toEqual(7);
         expect(notes[5].semitone).toEqual(Semitone.Ab);
         expect(notes[5].octave).toEqual(7);
         expect(notes[6].semitone).toEqual(Semitone.Bb);
         expect(notes[6].octave).toEqual(7);
      });
   });

   describe("degree", () => {
      it("should return the note for the given scale degree", () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 7,
            template: ScaleTemplates.minor,
         });
         const note = scale.degree(1);
         expect(note.semitone).toEqual(Semitone.C);
         expect(note.octave).toEqual(7);

         const note2 = scale.degree(2);
         expect(note2.semitone).toEqual(Semitone.D);
         expect(note2.octave).toEqual(7);

         const note3 = scale.degree(3);
         expect(note3.semitone).toEqual(Semitone.Eb);
         expect(note3.octave).toEqual(7);

         const note4 = scale.degree(4);
         expect(note4.semitone).toEqual(Semitone.F);
         expect(note4.octave).toEqual(7);

         const note5 = scale.degree(5);
         expect(note5.semitone).toEqual(Semitone.G);
         expect(note5.octave).toEqual(7);

         const note6 = scale.degree(6);
         expect(note6.semitone).toEqual(Semitone.Ab);
         expect(note6.octave).toEqual(7);

         const note7 = scale.degree(7);
         expect(note7.semitone).toEqual(Semitone.Bb);
         expect(note7.octave).toEqual(7);
      });
   });

   describe("relativeMajor", () => {
      it("should return the relative major scale", () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.minor,
         });
         const relativeMajor = scale.relativeMajor();
         expect(relativeMajor.template).toEqual(ScaleTemplates.major);
         expect(relativeMajor.key).toEqual(Semitone.Eb);
         expect(relativeMajor.octave).toEqual(4);
      });
   });

   describe("relativeMinor", () => {
      it("should return the relative minor scale", () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.major,
         });
         const relativeMinor = scale.relativeMinor();
         expect(relativeMinor.template).toEqual(ScaleTemplates.minor);
         expect(relativeMinor.key).toEqual(Semitone.A);
         expect(relativeMinor.octave).toEqual(4);
      });
   });

   describe("shift", () => {
      it(`should shift the scale notes by the given degrees`, () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.major,
         });
         scale.shift(6);
         const notes = scale.notes;
         expect(notes.length).toEqual(7);
         expect(notes[0].semitone).toEqual(Semitone.D);
         expect(notes[0].octave).toEqual(4);
         expect(notes[1].semitone).toEqual(Semitone.E);
         expect(notes[1].octave).toEqual(4);
         expect(notes[2].semitone).toEqual(Semitone.F);
         expect(notes[2].octave).toEqual(4);
         expect(notes[3].semitone).toEqual(Semitone.G);
         expect(notes[3].octave).toEqual(4);
         expect(notes[4].semitone).toEqual(Semitone.A);
         expect(notes[4].octave).toEqual(4);
         expect(notes[5].semitone).toEqual(Semitone.B);
         expect(notes[5].octave).toEqual(4);
         expect(notes[6].semitone).toEqual(Semitone.C);
         expect(notes[6].octave).toEqual(4);
      });

      it(`should shift the scale notes
      to the left by the given degrees(negative)`, () => {
         const scale2 = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.major,
         });
         // acts as if using a global for notes
         // the scale is already shifted by 6
         console.log(ScaleTemplates.major);
         console.log(scale2.notes);
         scale2.shift(-6);
         console.log(scale2.notes);
         const notes = scale2.notes;
         expect(notes.length).toEqual(7);
         expect(notes[0].semitone).toEqual(Semitone.D);
         expect(notes[0].octave).toEqual(4);
         expect(notes[1].semitone).toEqual(Semitone.E);
         expect(notes[1].octave).toEqual(4);
         expect(notes[2].semitone).toEqual(Semitone.F);
         expect(notes[2].octave).toEqual(4);
         expect(notes[3].semitone).toEqual(Semitone.G);
         expect(notes[3].octave).toEqual(4);
         expect(notes[4].semitone).toEqual(Semitone.A);
         expect(notes[4].octave).toEqual(4);
         expect(notes[5].semitone).toEqual(Semitone.B);
         expect(notes[5].octave).toEqual(4);
         expect(notes[6].semitone).toEqual(Semitone.C);
         expect(notes[6].octave).toEqual(4);
      });
   });
});
