/*
Progression.js
*/

import Scale from './Scale';
import Chord from './Chord';

class Progression {
    mScale;

    mChords;

    mTemplate;

    constructor(pScale = new Scale(), pTemplate = [1, 4, 5]) {
      this.mScale = pScale;
      //   this.mTemplate = pTemplate;
      this.template(pTemplate);
    //   this.scale(pScale);
    }

    get asString() {
      const chords = [];
      this.mChords.forEach((item) => {
        chords.push(item.asString);
      });
      return chords;
    }

    scale(pScale) {
      if (!pScale) {
        return this.mScale;
      }

      this.mScale = pScale;

      this.mComputeChords();

      return this;
    }

    template(pTemplate) {
      if (!pTemplate) {
        return this.mTemplate;
      }

      this.mTemplate = pTemplate;

      this.mComputeChords();

      return this;
    }

    mComputeChords() {
      this.mChords = [];

      let i = 0;
      const numChords = this.mTemplate.length;
      for (i; i < numChords; i++) {
        this.mChords.push(new Chord(this.mScale.degree(this.mTemplate[i])));
      }
    }

    equals(pProgression) {
      return (pProgression.scale() === this.mScale
        && pProgression.template() === this.mTemplate);
    }

    copy() {
      return new Progression(this.mScale, this.mTemplate);
    }
}

export default Progression;
