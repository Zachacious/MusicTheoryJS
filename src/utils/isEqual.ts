/**
 * simple util to lazy check equality of objects and arrays
 * @internal
 */

const isEqual = <T>(a: T, b: T): boolean => {
   const stringA = JSON.stringify(a);
   const stringB = JSON.stringify(b);
   return stringA === stringB;
};

export default isEqual;
