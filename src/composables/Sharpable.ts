const sharpTones = [1, 3, 4, 6, 8, 10];

const CSharpable: Function = () => {
  return (target: any) => {
    target.prototype.sharpen = (): void => {
      if (!target.prototype.tone) {
        throw new Error("Tone doesn't exist on the object");
      }

      const tone = target.prototype.tone;
      const currentTone = tone();
      tone(currentTone + 1);
    };

    target.prototype.isSharp = (): boolean => {
      if (!target.prototype.tone) {
        throw new Error("Tone doesn't exist on the object");
      }

      const tone = target.prototype.tone();
      return sharpTones.includes(tone);
    };
  };
};

export default CSharpable;
