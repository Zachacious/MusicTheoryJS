/**************************************************
 * Return type for wrap.
 *
 * @typedef {Object} wrappedNumber
 * @property {number} value - The wrapped value.
 * @property {number} numWraps - The number of times the value wrapped.
 */
declare type wrappedNumber = {
    value: number;
    numWraps: number;
};
/**************************************************
 * Wraps a number between a min and max value.
 *
 * @param value - The value to wrap.
 * @param lower - The lower bound of the range.
 * @param upper - The upper bound of the range.
 * @returns - The wrapped value.
 */
declare const wrap: (value: number, lower: number, upper: number) => wrappedNumber;
export default wrap;
export type { wrappedNumber };
