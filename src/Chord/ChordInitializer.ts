import Semitone from "../Semitone";
import ChordInterval from "./ChordInterval";

/**
 * Used to initialize a chord
 */
type ChordInitializer = {
   root?: Semitone;
   octave?: number;
   template?: ChordInterval[];
};

export default ChordInitializer;
