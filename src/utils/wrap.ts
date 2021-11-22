type wrappedNumber = {
  value: number;
  numWraps: number;
};

const wrap = (value: number, lower: number, upper: number): wrappedNumber => {
  let wraps: number = Math.trunc(Math.abs(value) / upper);
  if (wraps === 0 && value < lower) wraps = 1;

  let wrappedValue: number = value;
  const offset = (upper + 1) * wraps;
  wrappedValue += (value < lower ? offset : -offset) + lower;
  // wrappedValue += lower;

  return {
    value: wrappedValue >= lower ? wrappedValue : wrappedValue + 1,
    numWraps: wraps,
  };
};

export default wrap;
export type { wrappedNumber };
