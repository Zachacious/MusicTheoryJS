import Halftone from "../Tone";

const CTonable: Function = () => {
  return (target: any) => {
    target.prototype.tone = (tone?: Halftone) => {
      if (target.prototype._tone === undefined) target.prototype._tone = 4;

      if (tone) {
        target.prototype._tone = tone;
      }

      return target.prototype._tone;
    };
  };
};

export default CTonable;
