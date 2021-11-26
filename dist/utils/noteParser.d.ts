import { NoteInitializer } from "../Note";
/**
 * attempts to parse a note from a string
 */
declare const noteParser: (note: string, supressWarning?: boolean) => NoteInitializer;
export default noteParser;
