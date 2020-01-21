/*
note.js
*/

import { wrapRange, clampNumber } from './util';

const midiKeyOffset = 5;

class Note {
  static tones = {
    G_SHARP: 1,
    A_FLAT: this.G_SHARP,
    A: 2,
    A_SHARP: 3,
    B_FLAT: this.A_SHARP,
    B: 4,
    C_FLAT: this.B,
    C: 5,
    B_SHARP: this.C,
    C_SHARP: 6,
    D_FLAT: this.C_SHARP,
    D: 7,
    D_SHARP: 8,
    E_FLAT: this.D_SHARP,
    E: 9,
    F_FLAT: this.E,
    F: 10,
    E_SHARP: this.F,
    F_SHARP: 11,
    G_FLAT: this.F_SHARP,
    G: 12,
    TOTAL_HALF_TONES: 12,
  }

  static modifier = {
    NATURAL: 0,
    SHARP: 1,
    SHARP_SHARP: 2,
    FLAT: -1,
    FLAT_FLAT: -2,
    TOTAL_MODIFIERS: 5,
  }

    mTone = 0;

    mOctave = 0;

    constructor(pTone = 5, pOctave = 5) {
      this.tone(pTone);
      this.octave(pOctave);
    }

    get midiKey() {
      let key = (this.mOctave * 12) + (this.mTone - midiKeyOffset);
      key = clampNumber(key, 0, 127); // 128 midi keys
      return key;
    }

    get asString() {
      let ret = '';

      switch (this.mTone) {
        case Note.tones.A: ret = 'A'; break;
        case Note.tones.A_SHARP: ret = 'A#/Bb'; break;
        case Note.tones.B: ret = 'B'; break;
        case Note.tones.C: ret = 'C'; break;
        case Note.tones.C_SHARP: ret = 'C#/Db'; break;
        case Note.tones.D: ret = 'D'; break;
        case Note.tones.D_SHARP: ret = 'D#/Eb'; break;
        case Note.tones.E: ret = 'E'; break;
        case Note.tones.F: ret = 'F'; break;
        case Note.tones.F_SHARP: ret = 'F#/Gb'; break;
        case Note.tones.G: ret = 'G'; break;
        case Note.tones.G_SHARP: ret = 'G#/Ab'; break;
        default: ret = 'A'; break;
      }

      return ret;
    }

    tone(pTone) {
      if (!pTone) {
        return this.mTone;
      }

      const { value, wraps } = wrapRange(pTone, 1, 12);
      this.mTone = value;
      this.mOctave = clampNumber(this.mOctave + wraps, 0, 10);

      return this;
    }

    octave(pOctave) {
      if (!pOctave) {
        return this.mOctave;
      }

      this.mOctave = clampNumber(pOctave, 0, 10);

      return this;
    }

    sharp() {
      const { value, wraps } = wrapRange(this.mTone + 1, 1, 12);
      this.mTone = value;
      this.mOctave += wraps;

      return this;
    }

    isSharp() {
      if (this.mTone === 1 || this.mTone === 3
        || this.mTone === 6 || this.mTone === 8
        || this.mTone === 11) {
        return true;
      }

      return false;
    }

    flat() {
      const { value, wraps } = wrapRange(this.mTone - 1, 1, 12);
      this.mTone = value;
      this.mOctave += wraps;

      return this;
    }

    isFlat() {
      return this.isSharp();
    }

    equals(pNote) {
      return (pNote.tone() === this.mTone
      && pNote.octave() === this.mOctave);
    }

    copy() {
      return new Note(this.mTone, this.mOctave);
    }

    static a(pOctave = 5) { return new Note(2, pOctave); }

    static b(pOctave = 5) { return new Note(4, pOctave); }

    static c(pOctave = 5) { return new Note(5, pOctave); }

    static d(pOctave = 5) { return new Note(7, pOctave); }

    static e(pOctave = 5) { return new Note(9, pOctave); }

    static f(pOctave = 5) { return new Note(10, pOctave); }

    static g(pOctave = 5) { return new Note(12, pOctave); }
}

export default Note;
