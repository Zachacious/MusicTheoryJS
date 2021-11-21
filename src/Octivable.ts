const COctivable: Function = () => {
  return (target: any) => {
    return (target.prototype.octave = (octave: number) => {
      octave
        ? (target.prototype.octave = octave)
        : (target.prototype.octave = 4);
      return target.prototype.octave;
    });
  };
};

export default COctivable;
