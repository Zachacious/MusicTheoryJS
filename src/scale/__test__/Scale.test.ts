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

         const scale2 = new Scale({
            key: Semitone.E,
            octave: 3,
            template: ScaleTemplates.minor,
         });
         const notes2 = scale2.notes;
         expect(notes2.length).toEqual(7);
         expect(notes2[0].semitone).toEqual(Semitone.E);
         expect(notes2[0].octave).toEqual(3);
         expect(notes2[1].semitone).toEqual(Semitone.Fs);
         expect(notes2[1].octave).toEqual(3);
         expect(notes2[2].semitone).toEqual(Semitone.G);
         expect(notes2[2].octave).toEqual(3);
         expect(notes2[3].semitone).toEqual(Semitone.A);
         expect(notes2[3].octave).toEqual(3);
         expect(notes2[4].semitone).toEqual(Semitone.B);
         expect(notes2[4].octave).toEqual(3);
         expect(notes2[5].semitone).toEqual(Semitone.C);
         expect(notes2[5].octave).toEqual(4);
         expect(notes2[6].semitone).toEqual(Semitone.D);
         expect(notes2[6].octave).toEqual(4);
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
         scale2.shift(-6);
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

   describe("shifted", () => {
      it(`should return a copy the scale with the template shifted by
      the given amount`, () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.major,
         });
         const shifted = scale.shifted(6);
         expect(shifted.id).not.toEqual(scale.id);
         expect(shifted.key).toEqual(Semitone.C);
         expect(shifted.octave).toEqual(4);
         const notes = shifted.notes;
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

   describe("unshift", () => {
      it(`should take a shifted scale and restore it to the original`, () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.major,
         });
         scale.shift(6);
         const unshifted = scale.unshift();
         expect(unshifted.key).toEqual(Semitone.C);
         expect(unshifted.octave).toEqual(4);
         const notes = unshifted.notes;
         expect(notes.length).toEqual(7);
         expect(notes[0].semitone).toEqual(Semitone.C);
         expect(notes[0].octave).toEqual(4);
         expect(notes[1].semitone).toEqual(Semitone.D);
         expect(notes[1].octave).toEqual(4);
         expect(notes[2].semitone).toEqual(Semitone.E);
         expect(notes[2].octave).toEqual(4);
         expect(notes[3].semitone).toEqual(Semitone.F);
         expect(notes[3].octave).toEqual(4);
         expect(notes[4].semitone).toEqual(Semitone.G);
         expect(notes[4].octave).toEqual(4);
         expect(notes[5].semitone).toEqual(Semitone.A);
         expect(notes[5].octave).toEqual(4);
         expect(notes[6].semitone).toEqual(Semitone.B);
         expect(notes[6].octave).toEqual(4);
      });
   });

   describe("unshifted", () => {
      it(`should return a copy of the scale unshifted`, () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.major,
         });
         scale.shift(6);
         const unshifted = scale.unshifted();
         console.log(unshifted.notes);
         expect(unshifted.key).toEqual(Semitone.C);
         expect(unshifted.octave).toEqual(4);
         const notes = unshifted.notes;
         expect(notes.length).toEqual(7);
         expect(notes[0].semitone).toEqual(Semitone.C);
         expect(notes[0].octave).toEqual(4);
         expect(notes[1].semitone).toEqual(Semitone.D);
         expect(notes[1].octave).toEqual(4);
         expect(notes[2].semitone).toEqual(Semitone.E);
         expect(notes[2].octave).toEqual(4);
         expect(notes[3].semitone).toEqual(Semitone.F);
         expect(notes[3].octave).toEqual(4);
         expect(notes[4].semitone).toEqual(Semitone.G);
         expect(notes[4].octave).toEqual(4);
         expect(notes[5].semitone).toEqual(Semitone.A);
         expect(notes[5].octave).toEqual(4);
         expect(notes[6].semitone).toEqual(Semitone.B);
         expect(notes[6].octave).toEqual(4);
      });
   });

   describe("modes", () => {
      it(`should create copies of the scale
      for each mode`, () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.major,
         });

         const ionian = scale.ionian();
         expect(ionian.id).not.toEqual(scale.id);
         expect(ionian.key).toEqual(Semitone.C);
         expect(ionian.octave).toEqual(4);
         const notes = ionian.notes;
         expect(notes.length).toEqual(7);
         expect(notes[0].semitone).toEqual(Semitone.C);
         expect(notes[0].octave).toEqual(4);
         expect(notes[1].semitone).toEqual(Semitone.D);
         expect(notes[1].octave).toEqual(4);
         expect(notes[2].semitone).toEqual(Semitone.E);
         expect(notes[2].octave).toEqual(4);
         expect(notes[3].semitone).toEqual(Semitone.F);
         expect(notes[3].octave).toEqual(4);
         expect(notes[4].semitone).toEqual(Semitone.G);
         expect(notes[4].octave).toEqual(4);
         expect(notes[5].semitone).toEqual(Semitone.A);
         expect(notes[5].octave).toEqual(4);
         expect(notes[6].semitone).toEqual(Semitone.B);
         expect(notes[6].octave).toEqual(4);

         const dorian = scale.dorian();
         expect(dorian.id).not.toEqual(scale.id);
         expect(dorian.key).toEqual(Semitone.C);
         expect(dorian.octave).toEqual(4);
         const notes2 = dorian.notes;
         expect(notes2.length).toEqual(7);
         expect(notes2[0].semitone).toEqual(Semitone.C);
         expect(notes2[0].octave).toEqual(4);
         expect(notes2[1].semitone).toEqual(Semitone.D);
         expect(notes2[1].octave).toEqual(4);
         expect(notes2[2].semitone).toEqual(Semitone.Eb);
         expect(notes2[2].octave).toEqual(4);
         expect(notes2[3].semitone).toEqual(Semitone.F);
         expect(notes2[3].octave).toEqual(4);
         expect(notes2[4].semitone).toEqual(Semitone.G);
         expect(notes2[4].octave).toEqual(4);
         expect(notes2[5].semitone).toEqual(Semitone.A);
         expect(notes2[5].octave).toEqual(4);
         expect(notes2[6].semitone).toEqual(Semitone.Bb);
         expect(notes2[6].octave).toEqual(4);

         const phrygian = scale.phrygian();
         expect(phrygian.id).not.toEqual(scale.id);
         expect(phrygian.key).toEqual(Semitone.C);
         expect(phrygian.octave).toEqual(4);
         const notes3 = phrygian.notes;
         expect(notes3.length).toEqual(7);
         expect(notes3[0].semitone).toEqual(Semitone.C);
         expect(notes3[0].octave).toEqual(4);
         expect(notes3[1].semitone).toEqual(Semitone.Db);
         expect(notes3[1].octave).toEqual(4);
         expect(notes3[2].semitone).toEqual(Semitone.Eb);
         expect(notes3[2].octave).toEqual(4);
         expect(notes3[3].semitone).toEqual(Semitone.F);
         expect(notes3[3].octave).toEqual(4);
         expect(notes3[4].semitone).toEqual(Semitone.G);
         expect(notes3[4].octave).toEqual(4);
         expect(notes3[5].semitone).toEqual(Semitone.Ab);
         expect(notes3[5].octave).toEqual(4);
         expect(notes3[6].semitone).toEqual(Semitone.Bb);
         expect(notes3[6].octave).toEqual(4);

         const lydian = scale.lydian();
         expect(lydian.id).not.toEqual(scale.id);
         expect(lydian.key).toEqual(Semitone.C);
         expect(lydian.octave).toEqual(4);
         const notes4 = lydian.notes;
         expect(notes4.length).toEqual(7);
         expect(notes4[0].semitone).toEqual(Semitone.C);
         expect(notes4[0].octave).toEqual(4);
         expect(notes4[1].semitone).toEqual(Semitone.D);
         expect(notes4[1].octave).toEqual(4);
         expect(notes4[2].semitone).toEqual(Semitone.E);
         expect(notes4[2].octave).toEqual(4);
         expect(notes4[3].semitone).toEqual(Semitone.Fs);
         expect(notes4[3].octave).toEqual(4);
         expect(notes4[4].semitone).toEqual(Semitone.G);
         expect(notes4[4].octave).toEqual(4);
         expect(notes4[5].semitone).toEqual(Semitone.A);
         expect(notes4[5].octave).toEqual(4);
         expect(notes4[6].semitone).toEqual(Semitone.B);
         expect(notes4[6].octave).toEqual(4);

         const mixolydian = scale.mixolydian();
         expect(mixolydian.id).not.toEqual(scale.id);
         expect(mixolydian.key).toEqual(Semitone.C);
         expect(mixolydian.octave).toEqual(4);
         const notes5 = mixolydian.notes;
         expect(notes5.length).toEqual(7);
         expect(notes5[0].semitone).toEqual(Semitone.C);
         expect(notes5[0].octave).toEqual(4);
         expect(notes5[1].semitone).toEqual(Semitone.D);
         expect(notes5[1].octave).toEqual(4);
         expect(notes5[2].semitone).toEqual(Semitone.E);
         expect(notes5[2].octave).toEqual(4);
         expect(notes5[3].semitone).toEqual(Semitone.F);
         expect(notes5[3].octave).toEqual(4);
         expect(notes5[4].semitone).toEqual(Semitone.G);
         expect(notes5[4].octave).toEqual(4);
         expect(notes5[5].semitone).toEqual(Semitone.A);
         expect(notes5[5].octave).toEqual(4);
         expect(notes5[6].semitone).toEqual(Semitone.Bb);
         expect(notes5[6].octave).toEqual(4);

         const aeolian = scale.aeolian();
         expect(aeolian.id).not.toEqual(scale.id);
         expect(aeolian.key).toEqual(Semitone.C);
         expect(aeolian.octave).toEqual(4);
         const notes6 = aeolian.notes;
         expect(notes6.length).toEqual(7);
         expect(notes6[0].semitone).toEqual(Semitone.C);
         expect(notes6[0].octave).toEqual(4);
         expect(notes6[1].semitone).toEqual(Semitone.D);
         expect(notes6[1].octave).toEqual(4);
         expect(notes6[2].semitone).toEqual(Semitone.Eb);
         expect(notes6[2].octave).toEqual(4);
         expect(notes6[3].semitone).toEqual(Semitone.F);
         expect(notes6[3].octave).toEqual(4);
         expect(notes6[4].semitone).toEqual(Semitone.G);
         expect(notes6[4].octave).toEqual(4);
         expect(notes6[5].semitone).toEqual(Semitone.Ab);
         expect(notes6[5].octave).toEqual(4);
         expect(notes6[6].semitone).toEqual(Semitone.Bb);
         expect(notes6[6].octave).toEqual(4);

         const locrian = scale.locrian();
         expect(locrian.id).not.toEqual(scale.id);
         expect(locrian.key).toEqual(Semitone.C);
         expect(locrian.octave).toEqual(4);
         const notes7 = locrian.notes;
         expect(notes7.length).toEqual(7);
         expect(notes7[0].semitone).toEqual(Semitone.C);
         expect(notes7[0].octave).toEqual(4);
         expect(notes7[1].semitone).toEqual(Semitone.Db);
         expect(notes7[1].octave).toEqual(4);
         expect(notes7[2].semitone).toEqual(Semitone.Eb);
         expect(notes7[2].octave).toEqual(4);
         expect(notes7[3].semitone).toEqual(Semitone.F);
         expect(notes7[3].octave).toEqual(4);
         expect(notes7[4].semitone).toEqual(Semitone.Gb);
         expect(notes7[4].octave).toEqual(4);
         expect(notes7[5].semitone).toEqual(Semitone.Ab);
         expect(notes7[5].octave).toEqual(4);
         expect(notes7[6].semitone).toEqual(Semitone.Bb);
         expect(notes7[6].octave).toEqual(4);
      });
   });

   describe("toString", () => {
      it(`should return the correct string for the scale`, () => {
         const scale = new Scale({
            key: Semitone.C,
            octave: 4,
            template: ScaleTemplates.major,
         });
         expect(scale.toString()).toEqual("C4(Major AKA Ionian)");

         const scale2 = new Scale({
            key: Semitone.Eb,
            octave: 8,
            template: ScaleTemplates.enigmaticMajor,
         });
         expect(scale2.toString()).toEqual("Eb8(EnigmaticMajor)");
      });
   });
});

// eliminate b# cb e# and fb from names
