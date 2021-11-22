type wrappedNumber = {
  value: number;
  numWraps: number;
};

const wrap = (value: number, lower: number, upper: number): wrappedNumber => {
  const wraps: number = Math.trunc(value / upper);
  let wrappedValue: number = value;
  wrappedValue -= (upper + 1) * wraps;
  wrappedValue += lower;

  return {
    value: wrappedValue >= lower ? wrappedValue : wrappedValue + 1,
    numWraps: wraps,
  };
};

export default wrap;
export type { wrappedNumber };
