import Semitone from "../Semitone";

//**********************************************************
/**
 * Describes the fields expected by the Note constrtuctor.
 */
//**********************************************************
type NoteInitializer = {
   semitone?: Semitone;
   octave?: number;
};

export default NoteInitializer;
