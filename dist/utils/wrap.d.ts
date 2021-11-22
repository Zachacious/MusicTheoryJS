declare type wrappedNumber = {
    value: number;
    numWraps: number;
};
declare const wrap: (value: number, lower: number, upper: number) => wrappedNumber;
export default wrap;
