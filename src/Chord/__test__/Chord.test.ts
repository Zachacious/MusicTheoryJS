import Chord from "../Chord";
import { DEFAULT_CHORD_TEMPLATE } from "../ChordConstants";
import Scale from "../../Scale/Scale";

describe("Chord", () => {
   describe("Initialization", () => {
      it("should create a chord with no initializer", () => {
         const chord = new Chord();
         expect(chord).toBeDefined();
         expect(chord.root).toBe(0);
         expect(chord.octave).toBe(4);
         expect(chord.template).toEqual(DEFAULT_CHORD_TEMPLATE);
         expect(chord.id).toBeDefined();
      });

      it("should create a chord from a string", () => {
         const chord = new Chord("(E)min");
         expect(chord).toBeDefined();
         expect(chord.root).toBe(4);
         expect(chord.octave).toBe(4);
         expect(chord.id).toBeDefined();

         const chord2 = new Chord("(E7)min");
         expect(chord2).toBeDefined();
         expect(chord2.root).toBe(4);
         expect(chord2.octave).toBe(7);
         expect(chord2.id).toBeDefined();

         const chord3 = new Chord("(Eb7)min7");
         expect(chord3).toBeDefined();
         expect(chord3.root).toBe(3);
         expect(chord3.octave).toBe(7);
         expect(chord3.id).toBeDefined();
      });

      it("should create a chord from an initializer", () => {
         const chord = new Chord({ root: 11, octave: 4 });
         expect(chord).toBeDefined();
         expect(chord.root).toBe(11);
         expect(chord.octave).toBe(4);
         expect(chord.template).toEqual(DEFAULT_CHORD_TEMPLATE);
         expect(chord.id).toBeDefined();
      });
   });

   describe("Properties", () => {
      it("should get the root", () => {
         const chord = new Chord({ root: 11, octave: 4 });
         expect(chord.root).toBe(11);
      });

      it("should set the root", () => {
         const chord = new Chord({ root: 11, octave: 4 });
         chord.root = 5;
         expect(chord.root).toBe(5);
      });

      it("should get the base scale", () => {
         const chord = new Chord({ root: 11, octave: 4 });
         expect(chord.baseScale).toBeDefined();
         expect(chord.baseScale.key).toBe(11);
         expect(chord.baseScale.octave).toBe(4);
      });

      it("should set the base scale", () => {
         const chord = new Chord({ root: 11, octave: 4 });
         chord.baseScale = new Scale({ key: 5, octave: 4 });
         expect(chord.baseScale).toBeDefined();
         expect(chord.baseScale.key).toBe(5);
         expect(chord.baseScale.octave).toBe(4);
      });

      it("should get the octave", () => {
         const chord = new Chord({ root: 11, octave: 4 });
         expect(chord.octave).toBe(4);
      });

      it("should set the octave", () => {
         const chord = new Chord({ root: 11, octave: 4 });
         chord.octave = 5;
         expect(chord.octave).toBe(5);
      });

      it("should get the template", () => {
         const chord = new Chord({ root: 11, octave: 4, template: [1, 2, 3] });
         expect(chord.template).toEqual([1, 2, 3]);
      });

      it("should set the template", () => {
         const chord = new Chord({ root: 11, octave: 4 });
         chord.template = [1, 2, 3];
         expect(chord.template).toEqual([1, 2, 3]);
      });

      it("should generate notes based on template", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         let notes = chord.notes;
         expect(notes[0].semitone).toBe(0);
         expect(notes[0].octave).toBe(4);
         expect(notes[1].semitone).toBe(4);
         expect(notes[1].octave).toBe(4);
         expect(notes[2].semitone).toBe(7);
         expect(notes[2].octave).toBe(4);

         chord.diminish();

         notes = chord.notes;
         expect(notes[0].semitone).toBe(0);
         expect(notes[0].octave).toBe(4);
         expect(notes[1].semitone).toBe(4);
         expect(notes[1].octave).toBe(4);
         expect(notes[2].semitone).toBe(6);
         expect(notes[2].octave).toBe(4);
      });

      it("should generate note names as an array", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         const notes = chord.getNoteNames();
         expect(notes[0]).toBe("C4");
         expect(notes[1]).toBe("E4");
         expect(notes[2]).toBe("G4");
      });
   });

   describe("copy and equality", () => {
      it("should create a copy", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         const copy = chord.copy();
         expect(copy).toBeDefined();
         expect(copy.root).toBe(0);
         expect(copy.octave).toBe(4);
         expect(copy.template).toEqual(DEFAULT_CHORD_TEMPLATE);
      });

      it("should equate to chords", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         const chord2 = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         expect(chord.equals(chord2)).toBe(true);

         const chord3 = new Chord({
            root: 0,
            octave: 4,
            template: [1, 2, 3],
         });
         expect(chord.equals(chord3)).toBe(false);
      });
   });

   describe("chord qualities", () => {
      it("should augment the chord(add and/or sharpen a 5th)", () => {
         const chord = new Chord();
         chord.augment();
         expect(chord.template).toEqual([1, 3, [5, 1]]);
      });

      it("should create a copy augmented chord", () => {
         const chord = new Chord();
         const augmented = chord.augmented();
         expect(augmented).toBeDefined();
         expect(augmented.template).toEqual([1, 3, [5, 1]]);
      });

      it("should be true if augmented", () => {
         const chord = new Chord();
         expect(chord.isAugmented()).toBe(false);
         chord.augment();
         expect(chord.isAugmented()).toBe(true);
      });

      it("should diminish the chord(add and/or flatten a 5th)", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         chord.diminish();
         expect(chord.template).toEqual([1, 3, [5, -1]]);
      });

      it("should create a copy diminished chord", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         const diminished = chord.diminished();
         expect(diminished).toBeDefined();
         expect(diminished.template).toEqual([1, 3, [5, -1]]);
      });

      it("should be true if diminished", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         expect(chord.isDiminished()).toBe(false);
         chord.diminish();
         expect(chord.isDiminished()).toBe(true);
      });

      it("should make the chord major(add or natrualize the 3rd)", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         chord.minor();
         chord.major();
         expect(chord.template).toEqual([1, 3, 5]);
      });

      it("should make a copy chord that is a major", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         chord.minor();
         const major = chord.majored();
         expect(major).toBeDefined();
         expect(major.template).toEqual([1, 3, 5]);
      });

      it("should return true if the chord is major", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         expect(chord.isMajor()).toBe(true);
         chord.minor();
         expect(chord.isMajor()).toBe(false);
      });

      it("should make the chord minor(add or natrualize the 3rd)", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         chord.minor();
         expect(chord.template).toEqual([1, [3, -1], 5]);
      });

      it("should make a copy chord that is a minor", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         const minor = chord.minored();
         expect(minor).toBeDefined();
         expect(minor.template).toEqual([1, [3, -1], 5]);
      });

      it("should return true if the chord is minor", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         expect(chord.isMinor()).toBe(false);
         chord.minor();
         expect(chord.isMinor()).toBe(true);
      });

      it("should half diminish the chord(add and/or flatten the 3rd, 5th, 7th)", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         chord.halfDiminish();
         expect(chord.template).toEqual([1, [3, -1], [5, -1], [7, -1]]);
      });

      it("should create a copy half diminished chord", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         const halfDiminished = chord.halfDiminished();
         expect(halfDiminished).toBeDefined();
         expect(halfDiminished.template).toEqual([
            1,
            [3, -1],
            [5, -1],
            [7, -1],
         ]);
      });

      it("should be true if half diminished", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         expect(chord.isHalfDiminished()).toBe(false);
         chord.halfDiminish();
         expect(chord.isHalfDiminished()).toBe(true);
      });
   });

   describe("chord inversions", () => {
      it("should invert the chord", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         chord.invert();
         expect(chord.template).toEqual([3, 5, 8]);
         chord.invert();
         expect(chord.template).toEqual([5, 8, 10]);
      });
   });

   describe("Stringification", () => {
      it("should print the string form of the chord", () => {
         const chord = new Chord({
            root: 0,
            octave: 4,
            template: DEFAULT_CHORD_TEMPLATE,
         });
         expect(chord.toString()).toEqual("(C4)maj");
      });
   });
});
