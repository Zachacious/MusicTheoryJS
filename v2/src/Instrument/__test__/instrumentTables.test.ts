import { createTables } from "../instrumentTables";

const tables = createTables();

describe(`instrumentTables`, () => {
   it(`should create tables`, () => {
      expect(tables).toBeDefined();
   });

   describe("midiLookup", () => {
      it("should have a lookup table", () => {
         expect(tables.midiLookup).toBeDefined();
      });
   });

   describe(`freqLookup`, () => {
      it("should have a lookup table", () => {
         expect(tables.freqLookup).toBeDefined();
      });
   });
});
