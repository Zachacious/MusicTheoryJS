import Semitone from "../Tone";
import wrap from "../utils/wrap";

const CTonable: Function = () => {
  return (target: any) => {
    target.prototype.tone = (tone?: Semitone) => {
      if (target.prototype._tone === undefined) target.prototype._tone = 4;

      if (tone !== undefined) {
        target.prototype._tone = wrap(tone, 0, 11).value;
      }

      return target.prototype._tone;
    };
  };
};

export default CTonable;
