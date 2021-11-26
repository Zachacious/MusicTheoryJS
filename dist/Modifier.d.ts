declare enum Modifier {
    FLAT = -1,
    NATURAL = 0,
    SHARP = 1
}
declare const parseModifier: (modifier: string) => Modifier;
export default Modifier;
export { parseModifier };
