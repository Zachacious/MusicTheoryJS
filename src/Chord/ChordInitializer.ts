import Semitone from "../Semitone";

type ChordInitializer = {
   root?: Semitone;
   octave?: number;
   template?: Array<number>;
};

export default ChordInitializer;
