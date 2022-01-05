/**
 * Maps note alterations to  their relative mathmatical value
 *@enum
 */
enum Modifier {
   FLAT = -1,
   NATURAL = 0,
   SHARP = 1,
}

/**
 * Parses modifier from string and returns the enum value
 * @internal
 */
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
