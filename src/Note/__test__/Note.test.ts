import Note from "../Note";
import { OCTAVE_MAX, OCTAVE_MIN, DEFAULT_OCTAVE, DEFAULT_SEMITONE } from "../noteConstants";

describe("Note", () => {
   it("should have an UID", () => {
      const note = new Note();
      expect(note.id).toBeDefined();
      const id = note.id();
      expect(typeof id).toBe("string");
   });

   it("should construct a note passing no args", () => {
      const note = new Note();
      expect(note.semitone).toBe(DEFAULT_SEMITONE);
      expect(note.octave).toBe(DEFAULT_OCTAVE);
   });

   it("should construct a note with NoteInitializer", () => {
      const note = new Note({ octave: 7, semitone: 3 });
      expect(note.octave).toBe(7);
      expect(note.semitone).toBe(3);
   });

   it("should construct a note via string", () => {
      const note = new Note("G#7");
      expect(note.octave).toBe(7);
      expect(note.semitone).toBe(8);
   });

   it("should wrap both the semitone and the octave when semi tone set beyond the max", () => {
      const note = new Note({ semitone: 3, octave: 7 });
      note.semitone = 15; // max is 11
      expect(note.octave).toBe(8);
      expect(note.semitone).toBe(3);
   });

   it("should clamp the octave to the min/max when set", () => {
      const note = new Note({ octave: 7 });
      note.octave = -1;
      expect(note.octave).toBe(OCTAVE_MIN);
      note.octave = 12;
      expect(note.octave).toBe(OCTAVE_MAX);
   });

   it("should return a new Note one semitone higher when sharp is called", () => {
      const note = new Note("G#7");
      const sharp = note.sharp();
      expect(sharp.octave).toBe(7);
      expect(sharp.semitone).toBe(9);
   });

   it("should set the semitone one higher and return the note when sharpen() is called", () => {
      const note = new Note("G#7");
      const sharp = note.sharpen();
      expect(sharp.octave).toBe(7);
      expect(sharp.semitone).toBe(9);
      expect(note.id()).toEqual(sharp.id());
   });

   it("should return a new Note one semitone lower when flat is called", () => {
      const note = new Note("D#7");
      const flat = note.flat();
      expect(flat.octave).toBe(7);
      expect(flat.semitone).toBe(2);
   });

   it("should set the semitone one lower and return the note when flatten() is called", () => {
      const note = new Note("C#7");
      const flat = note.flatten();
      expect(flat.octave).toBe(7);
      expect(flat.semitone).toBe(0);
      expect(note.id()).toEqual(flat.id());
   });

   it("should return true for isSharp() if the note is sharp, and false for isFlat()", () => {
      const note = new Note("A7");
      const sharp = note.sharp();
      note.sharpen();
      expect(note.isSharp()).toBe(true);
      expect(note.isFlat()).toBe(false);

      expect(sharp.isSharp()).toBe(true);
      expect(sharp.isFlat()).toBe(false);
   });

   it("should return true for isFlat() if the note is flat, and false for isSharp()", () => {
      const note = new Note("A7");
      const flat = note.flat();
      note.flatten();
      expect(note.isSharp()).toBe(false);
      expect(note.isFlat()).toBe(true);

      expect(flat.isSharp()).toBe(false);
      expect(flat.isFlat()).toBe(true);
   });

   it("should return true for isFlat() and isSharp() if no determination can be made", () => {
      const note = new Note("A#7");
      expect(note.isSharp()).toBe(true);
      expect(note.isFlat()).toBe(true);

      const note2 = new Note("Ab7");
      expect(note2.isSharp()).toBe(true);
      expect(note2.isFlat()).toBe(true);

      const note3 = new Note("A7");
      note3.semitone = 1;
      note3.semitone = 6;
      expect(note3.isSharp()).toBe(true);
      expect(note3.isFlat()).toBe(true);
   });

   it("should return true if the 2 notes are equal", () => {
      const note = new Note("A#7");
      const note2 = new Note("A#7");
      expect(note.equals(note2)).toBe(true);
   });

   it("should return a copy of the note", () => {
      const note = new Note("A#7");
      const copy = note.copy();
      expect(note.equals(copy)).toBe(true);
   });

   it("should return a string containing the right note label", () => {
      const note = new Note("A#7");
      expect(note.toString()).toBe("A#/Bb7");

      const note2 = new Note("A7");
      note2.flatten();
      expect(note2.toString()).toBe("Ab7");

      const note3 = new Note("A7");
      expect(note3.toString()).toBe("A7");

      const note4 = new Note("A");
      expect(note4.toString()).toBe("A4");

      const note5 = new Note("A#");
      note5.sharpen();
      expect(note5.toString()).toBe("B4");
   });

   it("should create a Note with static preset functions(A(), B()) that are correct(semitone, ovtave)", () => {
      const note = Note.A();
      expect(note.semitone).toBe(9);
      expect(note.octave).toBe(DEFAULT_OCTAVE);

      const note2 = Note.B();
      expect(note2.octave).toBe(DEFAULT_OCTAVE);

      const note3 = Note.C(7);
      expect(note3.semitone).toBe(0);
      expect(note3.octave).toBe(7);

      const note4 = Note.D(7);
      expect(note4.semitone).toBe(2);
      expect(note4.octave).toBe(7);

      const note5 = Note.E(7);
      expect(note5.semitone).toBe(4);
      expect(note5.octave).toBe(7);

      const note6 = Note.F(7);
      expect(note6.semitone).toBe(5);
      expect(note6.octave).toBe(7);

      const note7 = Note.G(7);
      expect(note7.semitone).toBe(7);
      expect(note7.octave).toBe(7);
   });
});
