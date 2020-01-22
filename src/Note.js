/*
note.js
*/

import { wrapRange, clampNumber } from './util';

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

    mA4Tuning = 440;

    constructor(pTone = 5, pOctave = 5) {
      let cTone = pTone;
      let cOctave = pOctave;

      if (typeof pTone === 'string') {
        const { tone, octave } = Note.mParseName(pTone);
        cTone = tone;
        if (octave) cOctave = octave;
      }
      this.tone(cTone);
      this.octave(cOctave);
    }

    get midiKey() {
      let key = 21 + (this.mOctave * 12) + (this.mTone - 2); // - 2 because our semitones start at G# instead of A
      key = clampNumber(key, 0, 127); // 128 midi keys
      return key;
    }

    get freq() {
      return 2 ** ((this.midiKey - 69) / 12) * this.A4Tuning;
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

    A4Tuning(pFreq) {
      if (!pFreq) {
        return this.mA4Tuning;
      }

      this.A4Tuning = pFreq;

      return this;
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

    static mParseName(pName = '') {
      let tone;
      let octave = null;

      const mRootNoteRE = /(?:[A-G])|(?:(#|b)+)|([0-9]|10)/g;
      const modRE = /(#|b)/g;
      const octaveRE = /([0-9]|10)/g;

      // split into segments - EX: C##7 = 'C' '##' '7'
      const segments = [...pName.matchAll(mRootNoteRE)];

      if (!segments.length) throw new Error('Invalid Note Name Given');

      const cleanSegs = segments.filter((el) => el != null); // remove empty indexes from segment

      const cleanNoteSeg = segments[0].filter((el) => el != null); // remove empty indexes from segment

      switch (cleanNoteSeg[0]) {
        case 'A': tone = Note.tones.A; break;
        case 'B': tone = Note.tones.B; break;
        case 'C': tone = Note.tones.C; break;
        case 'D': tone = Note.tones.D; break;
        case 'E': tone = Note.tones.E; break;
        case 'F': tone = Note.tones.F; break;
        case 'G': tone = Note.tones.G; break;
        default: break;
      }

      // process anything after the Root -- sharp flat or octave
      const numSegments = cleanSegs.length;
      let i = 1;
      for (i; i < numSegments; i++) {
        const seg = cleanSegs[i];
        const cleanSeg = seg.filter((el) => el != null);// remove empty indexes from segment
        if (modRE.test(cleanSeg[0])) { // is a modifier or series of modifiers -- # or b
          const chars = Array.from(cleanSeg[0]);
          // eslint-disable-next-line no-loop-func
          chars.forEach((item) => {
            if (item === '#') {
              tone++;
            } else if (item === 'b') {
              tone--;
            }
          });
        } else if (octaveRE.test(cleanSeg[0])) { // is a number -- octave
          octave = Number(cleanSeg[0]);
        }
      }

      return { tone, octave };
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
