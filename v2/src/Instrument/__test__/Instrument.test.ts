import Instrument from "../Instrument";
import Note from "../../Note/Note";

describe("Instrument", () => {
   it("should create an instance of Instrument", () => {
      const instrument = new Instrument();
      expect(instrument).toBeTruthy();
      expect(instrument.tuning).toBeDefined();
   });

   it(`should accept an A4 tuning value in the constructor
   and set the tuning objects a4 value based on the tuning`, () => {
      const instrument = new Instrument(440);
      expect(instrument.tuning.a4).toBe(440);
   });

   describe(`getFrequency`, () => {
      it(`should return a frequency from a note`, () => {
         const instrument = new Instrument();
         const note = new Note("A4");
         expect(instrument.getFrequency(note)).toBe(440);
      });
   });

   describe(`getMidiKey`, () => {
      it(`should return a midikey for a given note`, () => {
         const instrument = new Instrument();
         const note = new Note("A4");
         expect(instrument.getMidiKey(note)).toBe(69);
      });
   });
});
