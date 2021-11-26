enum Modifier {
   FLAT = -1,
   NATURAL = 0,
   SHARP = 1,
}

const parseModifier = (modifier: string): Modifier => {
   switch (modifier) {
      case "b":
      case "flat":
         return Modifier.FLAT;

      case "#":
      case "s":
      case "sharp":
         return Modifier.SHARP;

      default:
         return Modifier.NATURAL;
   }
};

export default Modifier;
export { parseModifier };
