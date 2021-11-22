type wrappedNumber = {
  value: number;
  numWraps: number;
};

const wrap = (value: number, lower: number, upper: number): wrappedNumber => {
  const wraps: number = Math.trunc(value / (upper + 1));
  let wrappedValue: number = value;
  wrappedValue -= upper * wraps;
  wrappedValue += lower;

  return { value: wrappedValue, numWraps: wraps };
};

export default wrap;
