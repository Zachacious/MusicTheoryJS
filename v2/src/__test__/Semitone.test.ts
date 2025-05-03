import Semitone, { getWholeToneFromName } from "../Semitone";

describe("Semitone", () => {
   describe("getWholeToneFromName", () => {
      it("should return semitone for valid string", () => {
         expect(getWholeToneFromName("C")).toEqual(Semitone.C);
         expect(getWholeToneFromName("D")).toEqual(Semitone.D);
         expect(getWholeToneFromName("E")).toEqual(Semitone.E);
         expect(getWholeToneFromName("F")).toEqual(Semitone.F);
         expect(getWholeToneFromName("G")).toEqual(Semitone.G);
         expect(getWholeToneFromName("A")).toEqual(Semitone.A);
         expect(getWholeToneFromName("B")).toEqual(Semitone.B);
      });

      it("should throw error if passed string with > 1 char or empty", () => {
         expect(() => getWholeToneFromName("")).toThrowError();
         expect(() => getWholeToneFromName("C#")).toThrowError();
      });
   });
});
