import Scale from "./Scale";
/**
 * attempts to lookup the note name for a scale efficiently
 */
declare const scaleNoteNameLookup: (scale: Scale, preferSharpKey?: boolean) => string[];
export default scaleNoteNameLookup;
