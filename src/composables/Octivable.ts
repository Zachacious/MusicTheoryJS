const COctivable: Function = () => {
  return (target: any) => {
    target.prototype.octave = (octave?: number) => {
      if (target.prototype._octave === undefined) target.prototype._octave = 4;

      if (octave) {
        target.prototype._octave = octave;
      }

      return target.prototype._octave;
    };
  };
};

export default COctivable;
