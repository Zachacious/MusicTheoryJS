/* eslint-disable import/prefer-default-export */
/*
util.js
*/

/**
 * Clamps the given number to the given range
 *
 * @private
 * @param {Number} pNum The number to clamp
 * @param {Number} pLower lower bound
 * @param {Number} pUpper upper bound
 * @returns {Number}
 */
const clampNumber = (pNum, pLower, pUpper) => Math.max(Math.min(pNum, Math.max(pLower, pUpper)), Math.min(pLower, pUpper));

/**
 * Wrap a value to a range
 * - if the value is higher than the upper bound then it wraps around and the wraps counter is inc'd
 * - bounds should be unsigned integers
 * @private
 * @param {Number} pValue value to wrap
 * @param {Number} pLower lower bound
 * @param {Number} pUpper upper bound
 * @returns {Number, Number} wraped value, number of wraps
 */
const wrapRange = (pValue, pLower, pUpper) => {
  let value = pValue;
  let wraps = 0;

  wraps = Math.trunc(value / (pUpper + 1)); // must truncate the remainder
  value -= (pUpper * wraps);
  value += pLower;

  return { value, wraps };
};

export {
  wrapRange,
  clampNumber,
};
