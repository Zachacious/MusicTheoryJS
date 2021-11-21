const clamp = (pNum: number, pLower: number, pUpper: number): number =>
  Math.max(Math.min(pNum, Math.max(pLower, pUpper)), Math.min(pLower, pUpper));

export default clamp;
