/**
 * Simple util to clamp a number to a range
 * @param pNum - the number to clamp
 * @param pLower - the lower bound
 * @param pUpper - the upper bound
 * @returns Number - the clamped number
 *
 * @internal
 */
const clamp = (pNum: number, pLower: number, pUpper: number): number =>
   Math.max(Math.min(pNum, Math.max(pLower, pUpper)), Math.min(pLower, pUpper));

export default clamp;
