/**
 * shifts an array by a given distance
 * @param arr the array to shift
 * @param distance the distance to shift
 * @returns the shifted array
 * @internal
 */
const shift = <T>(arr: T[], dist: number = 1): T[] => {
   arr = [...arr]; // copy
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
