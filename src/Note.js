/* eslint-disable no-console */
/*
note.js
Author: Zach Moore
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
    NATURAL: 1,
    SHARP: 2,
    SHARP_SHARP: 3,
    FLAT: 4,
    FLAT_FLAT: 5,
    TOTAL_MODIFIERS: 5,
  }

    mTone = 0;

    mOctave = 0;

    constructor(pTone = 5, pOctave = 5) {
      this.tone(pTone);
      this.octave(pOctave);
    }

    tone(pTone) {
      if (!pTone) {
        return this.mTone;
      }

      const { value, wraps } = wrapRange(pTone, 1, 12);
      this.mTone = value;
      this.mOctave += wraps;

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
      const { value, octave } = wrapRange(this.mTone - 1, 1, 12);
      this.mTone = value;
      this.mOctave += octave;

      return this;
    }

    isFlat() {
      return this.isSharp();
    }

    get midiKey() {
      let key = (this.mOctave * 12) + (this.mTone - midiKeyOffset);
      key = clampNumber(key, 0, 127); // 128 midi keys
      return key;
    }

    get name() {
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

    equals(pNote) {
      return (pNote.tone() === this.mTone
      && pNote.octave() === this.mOctave);
    }

    copy() {
      return new Note(this.mTone, this.mOctave);
    }

    // createFromName(pName){

    //   let name = String(pName);
    //   let tone = 0;

    //   switch (name) {
    //     case 'Ab': tone = Note.tones.A_FLAT; break;
    //     case 'A': tone = Note.tones.A; break;
    //     case 'A#': tone = Note.tones.A_SHARP; break;
    //     case 'Bb': tone = Note.tones.B_FLAT; break;
    //     case 'B': tone = Note.tones.B; break;
    //     case 'B#': tone = Note.tones.B_SHARP; break;
    //     case 'Cb': tone = Note.tones.C_FLAT; break;
    //     case 'C': tone = Note.tones.C; break;
    //     case 'C#': tone = Note.tones.C_SHARP; break;
    //     case 'Db': tone = Note.tones.D_FLAT; break;
    //     case 'D': tone = Note.tones.D; break;
    //     case 'D#': tone = Note.tones.D_SHARP; break;
    //     case 'Eb': tone = Note.tones.E_FLAT; break;
    //     case 'E': tone = Note.tones.E; break;
    //     case 'E#': tone = Note.tones.E_SHARP; break;
    //     case 'Fb': tone = Note.tones.F_FLAT; break;
    //     case 'F': tones = Note.tones.F; break;
    //     case 'F#': tones = Note.tones.F_SHARP; break;
    //     case 'Gb': tones = Note.tones.G_FLAT; break;
    //     case 'G': tones = Note.tones.G; break;
    //     case 'G#': tones = Note.tones.G_SHARP; break;
    //     default: tone = 0; break;
    //   }

    //   this.

    // }

    static a() { return new Note(2); }

    static b() { return new Note(4); }

    static c() { return new Note(5); }

    static d() { return new Note(7); }

    static e() { return new Note(9); }

    static f() { return new Note(10); }

    static g() { return new Note(12); }
}

export default Note;
