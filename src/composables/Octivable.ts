import clamp from "../utils/clamp";

const COctivable: Function = () => {
  return (target: any) => {
    target.prototype.octave = (octave?: number) => {
      if (target.prototype._octave === undefined) target.prototype._octave = 4;

      if (octave !== undefined) {
        target.prototype._octave = clamp(octave, 0, 9);
      }

      return target.prototype._octave;
    };
  };
};

export default COctivable;
