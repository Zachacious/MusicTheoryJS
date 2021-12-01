//**********************************************************
/**
 * shifts an array by a given distance
 */
//**********************************************************
const shift = <T>(arr: T[], dist: number): T[] => {
   if (dist > 0) {
      const temp: T[] = arr.splice(arr.length - (dist + 1), Infinity);

      arr.unshift(...temp);
   }

   if (dist < 0) {
      const temp: T[] = arr.splice(0, dist);
      arr.push(...temp);
   }

   return arr;
};

export default shift;
