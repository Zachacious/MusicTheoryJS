import wrap, { wrappedNumber } from "../wrap";

describe("Wrap Utility Function", () => {
   test(`When passed a number within the range,
  should return that number and 0 wraps`, () => {
      const result: wrappedNumber = wrap(7, 1, 10);

      expect(result).toEqual({ value: 7, numWraps: 0 });
   });

   test(`When passed a number lower than the range
  (but not more than the length of the range),
  should return a number equal to the upper bound
  of the range and -1 wraps`, () => {
      const result: wrappedNumber = wrap(0, 1, 10);

      expect(result).toEqual({ value: 10, numWraps: -1 });
   });

   test(`When passed a number higher than the range
  (but not less than the length of the range),
  should return a number equal to the lower bound
  of the range and 1 wraps`, () => {
      const result: wrappedNumber = wrap(11, 1, 10);

      expect(result).toEqual({ value: 1, numWraps: 1 });
   });

   test(`When passed a number lower than the range
  (one large enough to wrap multiple times)
  should return a number in the range with
  a negative number of wraps less than -1`, () => {
      const result: wrappedNumber = wrap(-60, 7, 15);

      expect(result).toEqual({ value: 12, numWraps: -8 });
   });

   test(`When passed a number higher than the range
    (one large enough to wrap multiple times)
    should return a number in the range with
    a positive number of wraps greater than 1`, () => {
      const result: wrappedNumber = wrap(60, 7, 15);

      expect(result).toEqual({ value: 12, numWraps: 6 });
   });

   test(`When passing a range where the upper bound
  is less than the lower bound it should invert the bounds
  and give the correct result`, () => {
      const result: wrappedNumber = wrap(60, 15, 7);

      expect(result).toEqual({ value: 12, numWraps: 6 });
   });
});
