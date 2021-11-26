import NoteInitializer from "./NoteInitializer";
/**
 * attempts to parse a note from a string
 */
declare const parseNote: (note: string, supressWarning?: boolean) => NoteInitializer;
export default parseNote;
