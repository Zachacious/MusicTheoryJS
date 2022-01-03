/**
 * The return type of the wrap function.
 * @internal
 */
declare type wrappedNumber = {
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
declare const wrap: (value: number, lower: number, upper: number) => wrappedNumber;
export default wrap;
export type { wrappedNumber };
