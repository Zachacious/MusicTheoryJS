import parseNote from "../noteParser";

describe("Note Parser", () => {
   it("should parse a note", () => {
      const note = parseNote("C4");
      expect(note).toEqual({
         semitone: 0,
         octave: 4,
      });
   });

   it("should parse a note with a sharp", () => {
      const note = parseNote("C#4");
      expect(note).toEqual({
         semitone: 1,
         octave: 4,
      });
   });

   it("should parse a note with a flat", () => {
      const note = parseNote("Cb4");
      expect(note).toEqual({
         semitone: 11,
         octave: 4,
      });
   });

   it("should parse a note with a double sharp", () => {
      const note = parseNote("C##4");
      expect(note).toEqual({
         semitone: 2,
         octave: 4,
      });
   });

   it("should parse a note with a double flat", () => {
      const note = parseNote("Cbb4");
      expect(note).toEqual({
         semitone: 10,
         octave: 4,
      });
   });

   it("should parse a note when components are out of order", () => {
      let note = parseNote("4C");
      expect(note).toEqual({
         semitone: 0,
         octave: 4,
      });

      note = parseNote("bb7A");
      expect(note).toEqual({
         semitone: 7,
         octave: 7,
      });

      note = parseNote("1D#");
      expect(note).toEqual({
         semitone: 3,
         octave: 1,
      });
   });
});
