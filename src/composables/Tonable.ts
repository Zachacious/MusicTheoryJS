import Semitone from "../Tone";
import wrap, { wrappedNumber } from "../utils/wrap";

const CTonable: Function = () => {
  return (target: any) => {
    target.prototype.tone = (tone?: Semitone) => {
      if (target.prototype._tone === undefined) target.prototype._tone = 4;

      if (tone !== undefined) {
        const wrappedTone: wrappedNumber = wrap(tone, 0, 11);
        target.prototype._tone = wrappedTone.value;
        const octave = target.prototype.octave;
        if (octave !== undefined) {
          const currentOctave: number = octave();
          octave(currentOctave + wrappedTone.numWraps);
        }
      }

      return target.prototype._tone;
    };
  };
};

export default CTonable;
