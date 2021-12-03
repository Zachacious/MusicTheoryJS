//**********************************************************
/**
 * shifts an array by a given distance
 */
//**********************************************************
const shift = <T>(arr: T[], dist: number = 1): T[] => {
   if (dist > arr.length || dist < 0 - arr.length)
      throw new Error("shift: distance is greater than array length");
   if (dist > 0) {
      const temp: T[] = arr.splice(arr.length - dist, Infinity);

      arr.unshift(...temp);
   }

   if (dist < 0) {
      const temp: T[] = arr.splice(0, dist);
      arr.push(...temp);
   }

   return arr;
};

export default shift;
