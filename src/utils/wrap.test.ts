import wrap, { wrappedNumber } from "./wrap";

describe("Wrap Utility Function", () => {
  test("When passed a number within the range should return that number and 0 wraps", () => {
    const result: wrappedNumber = wrap(7, 1, 10);

    expect(result).toEqual({ value: 7, numWraps: 0 });
  });
});
