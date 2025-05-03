import Semitone from "../Semitone";

/**
 * The type used to initialize a scale
 */
type ScaleInitializer = {
   template?: Array<number>;
   key?: Semitone;
   octave?: number;
};

export default ScaleInitializer;
