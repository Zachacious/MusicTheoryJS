import { Scale } from "..";
import Semitone from "../Semitone";
import ChordInterval from "./ChordInterval";

type ChordInitializer = {
   root?: Semitone;
   octave?: number;
   template?: ChordInterval[];
   baseScale?: Scale;
};

export default ChordInitializer;
