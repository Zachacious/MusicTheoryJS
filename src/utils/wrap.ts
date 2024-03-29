/**
 * The return type of the wrap function.
 * @internal
 */
type wrappedNumber = {
   value: number;
   numWraps: number;
};

/**
 * Wraps a number between a min and max value.
 * @param value - the number to wrap
 * @param lower  - the lower bound
 * @param upper - the upper bound
 * @returns wrappedNumber - the wrapped number
 * @internal
 */
const wrap = (value: number, lower: number, upper: number): wrappedNumber => {
   // copies
   let val: number = value;
   let lbound: number = lower;
   let ubound: number = upper;

   // if the bounds are inverted, swap them here
   if (upper < lower) {
      lbound = upper;
      ubound = lower;
   }

   // the amount needed to move the range and value to zero
   const zeroOffset: number = 0 - lbound;

   // offset the values so that the lower bound is zero
   lbound += zeroOffset;
   ubound += zeroOffset;
   val += zeroOffset;

   // compute the number of times the value will wrap
   let wraps: number = Math.trunc(val / ubound);
   // case: -1 / ubound(>0) will equal 0 although it wraps once
   if (wraps === 0 && val < lbound) wraps = -1;
   // case: ubound and value are the same val/ubound = 1 but actually doesnt wrap
   if (wraps === 1 && val === ubound) wraps = 0;

   // needed to handle the case where the num of wraps is 0 or 1 or -1
   let valOffset = 0;
   let wrapOffset = 0;
   if (wraps >= -1 && wraps <= 1) wrapOffset = 1;

   // if the value is below the range
   if (val < lbound) {
      valOffset = (val % ubound) + wrapOffset;
      val = ubound + valOffset;

      // if the value is above the range
   } else if (val > ubound) {
      valOffset = (val % ubound) - wrapOffset;
      val = lbound + valOffset;
   }

   // add the offset from zero back to the value
   val -= zeroOffset;

   return {
      value: val,
      numWraps: wraps,
   };
};

export default wrap;
export type { wrappedNumber };
