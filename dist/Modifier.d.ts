/**
 * Maps note alterations to  their relative mathmatical value
 *@enum
 */
declare enum Modifier {
    FLAT = -1,
    NATURAL = 0,
    SHARP = 1
}
/**
 * Parses modifier from string and returns the enum value
 * @internal
 */
declare const parseModifier: (modifier: string) => Modifier;
export default Modifier;
export { parseModifier };
