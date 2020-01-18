/* eslint-disable import/prefer-default-export */
/*
util.js
Author: Zach Moore
*/

const clampNumber = (num, a, b) => Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b));

// const wrapRange = function (pValue, pLower, pUpper) {
const wrapRange = (pValue, pLower, pUpper) => {
  let value = pValue;
  let ltIter = 0; // less than iterations
  let gtIter = 0; // greater than iterations
  let wraps = 0;

  // If value < lower : add the upper
  // until value higher than lower
  while (value < pLower) {
    ltIter += 1;
    value += pUpper;
    // eslint-disable-next-line no-console
    console.log('lower');
  }

  // If value > upper : subtract the upper
  // until value less than upper
  while (value > pUpper) {
    gtIter += 1;
    value -= pUpper;
  }

  wraps -= clampNumber(ltIter, 0, 10);
  wraps += clampNumber(gtIter, 0, 10);

  return { value, wraps };
};

// eslint-disable import/prefer-default-export
export {
  wrapRange,
  clampNumber,
};
