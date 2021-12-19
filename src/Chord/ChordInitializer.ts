import Semitone from "../Semitone";
import ChordInterval from "./ChordInterval";

type ChordInitializer = {
   root?: Semitone;
   octave?: number;
   template?: ChordInterval[];
};

export default ChordInitializer;
