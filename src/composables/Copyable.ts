import uid from "uid";

const Copyable = <T extends { id: string }>(target: T): (() => T) => {
   return () => {
      const copy = JSON.parse(JSON.stringify(target)) as T;
      copy.id = uid() as string;
      return copy;
   };
};

export default Copyable;
