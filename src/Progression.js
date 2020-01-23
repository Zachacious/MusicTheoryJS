/*
Progression.js
*/

import Scale from './Scale';
import Chord from './Chord';

/**
 * Generate Chords from a scale and template - [1 ,4, 5]
 * @example
 * const chords = new Progression(Scale.major(Note.a()), [1, 4, 5, 7]);
 * console.log(chords.asString);
 * // returns Progression: (Chord: A C#/Db E ) (Chord: D F#/Gb A ) (Chord: E G#/Ab B ) (Chord: G#/Ab C D#/Eb )
 */
class Progression {
    /** @private */
    mScale;

    /** @private */
    mChords;

    /** @private */
    mTemplate;

    /**
     *Creates an instance of Progression.

     * @param {Scale} [pScale=new Scale()] pScale - The scale to build the chords upon
     * @param {Array} [pTemplate=[1, 4, 5]] pTemplate - An array containing the scale degrees from which to generate the chords
     */
    constructor(pScale = new Scale(), pTemplate = [1, 4, 5]) {
      this.mScale = pScale;
      this.template(pTemplate);
    }

    /**
     * Returns a string containing an array of notes for each chord in the progression
     *
     * @readonly
     * @returns {string}
     */
    get asString() {
      let chords = 'Progression: ';
      this.mChords.forEach((item) => {
        chords += `(${item.asString}) `;
      });
      return chords;
    }

    /**
     *Sets or returns the scale
     * CHAINABLE method
     *
     * @param {Scale} [pScale]
     * @returns {Scale|Progression} - The scale | Reference to this object
     * @memberof Progression
     */
    scale(pScale) {
      if (!pScale) {
        return this.mScale;
      }

      this.mScale = pScale;

      this.mComputeChords();

      return this;
    }

    /**
     *Sets or returns the template
     * CHAINABLE method
     *
     * @param {Array} [pTemplate] - An array of numbers denoting the scale degree to create the progression from. Ex: [1, 4, 5]
     * @returns {Array|Progression} - The template array | Reference to this object
     * @memberof Progression
     */
    template(pTemplate) {
      if (!pTemplate) {
        return this.mTemplate;
      }

      this.mTemplate = pTemplate;

      this.mComputeChords();

      return this;
    }


    /**
     * Uses the scale and the template to create the chords of the progression
     *
     * @private
     */
    mComputeChords() {
      this.mChords = [];

      let i = 0;
      const numChords = this.mTemplate.length;
      for (i; i < numChords; i++) {
        this.mChords.push(new Chord(this.mScale.degree(this.mTemplate[i])));
      }
    }


    /**
     * Check equality with another Progression
     *
     * @param {Progression} pProgression
     * @returns {Boolean} - True if the given Progression is equal
     */
    equals(pProgression) {
      return (pProgression.scale() === this.mScale
        && pProgression.template() === this.mTemplate);
    }

    /**
     * Creates a copy of this object
     *
     * @returns {Progression}
     */
    copy() {
      return new Progression(this.mScale, this.mTemplate);
    }
}

export default Progression;
