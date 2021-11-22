import wrap from "../utils/wrap";

const COctivable: Function = () => {
  return (target: any) => {
    target.prototype.octave = (octave?: number) => {
      if (target.prototype._octave === undefined) target.prototype._octave = 4;

      if (octave !== undefined) {
        target.prototype._octave = wrap(octave, 0, 12).value;
      }

      return target.prototype._octave;
    };
  };
};

export default COctivable;
