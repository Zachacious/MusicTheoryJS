import shift from "../shift";

describe("shift util", () => {
   it("should shift an array by 1 if no distance provided", () => {
      const array = [1, 2, 3, 4, 5];
      const shifted = shift(array);
      expect(shifted).toEqual([5, 1, 2, 3, 4]);
   });

   it("should shift an array with a custom shift amount", () => {
      const array = [1, 2, 3, 4, 5];
      const shifted = shift(array, 3);
      expect(shifted).toEqual([3, 4, 5, 1, 2]);
   });

   it(`should throw an exception if
   the distance is greater than the length of the array`, () => {
      const array = [1, 2, 3, 4, 5];
      expect(() => shift(array, 6)).toThrow();
      expect(() => shift(array, -10)).toThrow();
   });
});
