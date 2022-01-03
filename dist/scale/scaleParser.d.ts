import ScaleInitializer from "./ScaleInitializer";
/**
 * attempts to parse a note from a string
 * @param scale - the string to parse
 * @param supressWarning - supress the warning for ineffeciency if true
 * @internal
 */
declare const parseScale: (scale: string, supressWarning?: boolean) => ScaleInitializer;
export default parseScale;
