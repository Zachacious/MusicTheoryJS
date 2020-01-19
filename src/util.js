/* eslint-disable import/prefer-default-export */
/*
util.js
Author: Zach Moore
*/

const clampNumber = (num, a, b) => Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b));

// const wrapRange = function (pValue, pLower, pUpper) {
const wrapRange = (pValue, pLower, pUpper) => {
  let value = pValue;
  let wraps = 0;

  wraps = Math.trunc(value / pUpper); // must truncate the remainder
  value -= (pUpper * wraps);

  return { value, wraps };
};

export {
  wrapRange,
  clampNumber,
};
