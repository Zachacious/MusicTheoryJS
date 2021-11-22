const flatTones = [1, 3, 4, 6, 8, 10];

const CFlattable: Function = () => {
  return (target: any) => {
    target.prototype.flatten = (): void => {
      if (!target.prototype.tone) {
        throw new Error("Tone doesn't exist on the object");
      }

      const tone = target.prototype.tone;
      const currentTone = tone();
      tone(currentTone - 1);
    };

    target.prototype.isFlat = (): boolean => {
      if (!target.prototype.tone) {
        throw new Error("Tone doesn't exist on the object");
      }

      const tone = target.prototype.tone();
      return flatTones.includes(tone);
    };
  };
};

export default CFlattable;
