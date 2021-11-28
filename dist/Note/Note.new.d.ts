import NoteInitializer from "./NoteInitializer";
declare type CompositionObject = Record<string, unknown>;
declare const Note: (initializer?: string | NoteInitializer | undefined) => CompositionObject;
export default Note;
