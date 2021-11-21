const wrap = (value: number, lower: number, upper: number): object => {
  const wraps: number = Math.trunc(value / (upper + 1));
  let wrappedValue: number = value;
  wrappedValue -= upper * wraps;
  wrappedValue += lower - 1;

  return { wrappedValue, wraps };
};

export default wrap;
