type wrappedNumber = {
  value: number;
  numWraps: number;
};

// const wrap = (value: number, lower: number, upper: number): wrappedNumber => {
//   let wraps: number = Math.trunc(Math.abs(value) / upper);
//   if (wraps === 0 && value < lower) wraps = 1;

//   let wrappedValue: number = value;
//   const offset = (upper + 1) * wraps;
//   wrappedValue += (value < lower ? offset : -offset) + lower;
//   // wrappedValue += lower;

//   return {
//     value: wrappedValue >= lower ? wrappedValue : wrappedValue + 1,
//     numWraps: wraps,
//   };
// };

const wrap = (value: number, lower: number, upper: number): wrappedNumber => {
  let lbound: number = lower;
  let ubound: number = upper;
  if (upper < lower) {
    lbound = upper;
    ubound = lower;
  }

  let val: number = value;

  const zeroOffset: number = 0 - lbound;

  lbound += zeroOffset;
  ubound += zeroOffset;
  val += zeroOffset;

  let wraps: number = Math.trunc(val / ubound);
  if (wraps === 0 && val < lbound) wraps = 1;

  const offset: number = (ubound + 1) * wraps;
  val -= offset;

  // add back the zeroOffset
  val -= zeroOffset;

  return {
    value: val,
    numWraps: wraps,
  };
};

export default wrap;
export type { wrappedNumber };
