import Tuning from "../Tuning";

describe(`Tuning`, () => {
   it(`should create an instance of Tuning`, () => {
      expect(new Tuning()).toBeTruthy();
   });

   it(`should set tuning if constructed with a tuning value`, () => {
      const tuning = new Tuning(440);
      expect(tuning.a4).toBe(440);
   });

   describe(`midiKeyLookup`, () => {
      const tuning = new Tuning(440);

      it(`should find an accurate midikey for alternative tuning`, () => {
         tuning.a4 = 432;
         // midi key should be same regardless of tuning
         expect(tuning.midiKeyLookup(4, 9)).toBe(69);
      });
   });

   describe(`freqLookup`, () => {
      const tuning = new Tuning(440);

      it(`should find an accurate frequency for alternative tuning`, () => {
         tuning.a4 = 432;
         // frequency should be same regardless of tuning
         expect(tuning.freqLookup(4, 9)).toBe(432);
         expect(Math.trunc(tuning.freqLookup(1, 0))).toBe(Math.trunc(32.11));
      });
   });
});
