/*
Chord.js
Author: Zach Moore
*/

import Note from './Note';
import ChordInterval from './ChordInterval';
import Scale from './Scale';

// Alias
const CI = ChordInterval;

const mod = Note.modifier;

class Chord {
    mRootnote = null;

    mTemplate = []

    mScale = null;

    mNotes = [];

    constructor(pRootNote = new Note(), pTemplate = [CI(1), CI(3), CI(5)]/* Major Chord */, pScale = new Scale()) {
      this.mScale = pScale;
      this.mTemplate = pTemplate;
      this.root(pRootNote);
    //   this.template(pTemplate);
    //   this.scale(pScale);
    }

    root(pRootNote) {
      if (!pRootNote) {
        return this.mRootnote;
      }

      this.mRootnote = pRootNote;

      this.scale(this.mScale); // reset for new root note

      return this;
    }

    template(pTemplate) {
      if (!pTemplate) {
        return this.pTemplate;
      }

      this.mTemplate = pTemplate;

      this.mComputeNotes();

      return this;
    }

    scale(pScale) {
      if (!pScale) {
        return this.mScale;
      }

      this.mScale = new Scale(this.mRootnote, pScale.template());

      this.mComputeNotes();

      return this;
    }

    get notes() {
      return this.mNotes;
    }

    mComputeNotes() {
      this.mNotes = [];

      let i;
      for (i = 0; i < this.mTemplate.length; i++) {
        const deg = this.mScale.degree(this.mTemplate[i].interval - 1); // -1 to include zero index - root note

        switch (this.mTemplate[i].modifier) {
          case mod.NATURAL:
            break;
          case mod.SHARP:
            deg.sharp();
            break;
          case mod.SHARP_SHARP:
            deg.sharp().sharp();
            break;
          case mod.FLAT:
            deg.flat();
            break;
          case mod.FLAT_FLAT:
            deg.flat().flat();
            break;
          default:
            break;
        }

        this.mNotes.push(deg);
      }
    }

    // major

    static M(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5)]); }

    static Madd4(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(4), CI(5)]); }

    static M6(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5), CI(6)]); }

    static M69(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5)], CI(6), CI(9)); }

    static M7(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5)], CI(7)); }

    static M9(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5), CI(7), CI(9)]); }

    static M11(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5), CI(7), CI(9), CI(11)]); }

    static M13(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5), CI(7), CI(9), CI(11), CI(13)]); }

    static M7s11(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5), CI(7), CI(11, mod.SHARP)]); }

    static Mb5(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5, mod.FLAT)]); }

    // minor

    static m(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3, mod.FLAT), CI(5)]); }

    static madd4(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3, mod.FLAT), CI(4), CI(5)]); }

    static m6(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3, mod.FLAT), CI(5), CI(6)]); }

    static m7(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3, mod.FLAT), CI(5), CI(7, mod.FLAT)]); }

    static madd9(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3, mod.FLAT), CI(5), CI(9)]); }

    static m6add9(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3, mod.FLAT), CI(5), CI(6), CI(9)]); }

    static m9(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3, mod.FLAT), CI(5), CI(7, mod.FLAT), CI(9)]); }

    static m11(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3, mod.FLAT), CI(5), CI(7, mod.FLAT), CI(9), CI(11)]); }

    static m13(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3, mod.FLAT), CI(5), CI(7, mod.FLAT), CI(9), CI(11), CI(13)]); }

    static m7b5(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3, mod.FLAT), CI(5, mod.FLAT), CI(7, mod.FLAT)]); }

    // dominant

    static dom7(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5), CI(7, mod.FLAT)]); }

    static dom9(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5), CI(7, mod.FLAT), CI(9)]); }

    static dom11(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5), CI(7, mod.FLAT), CI(9), CI(11)]); }

    static dom13(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5), CI(7, mod.FLAT), CI(9), CI(11), CI(13)]); }

    static dom7s5(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5, mod.SHARP), CI(7, mod.FLAT)]); }

    static dom7b5(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5, mod.FLAT), CI(7, mod.FLAT)]); }

    static dom7b9(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5), CI(7, mod.FLAT), CI(9, mod.FLAT)]); }

    static dom7s9(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5), CI(7, mod.FLAT), CI(9, mod.SHARP)]); }

    static dom9s5(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5, mod.SHARP), CI(7, mod.FLAT), CI(9)]); }

    static dom9b5(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5, mod.FLAT), CI(7, mod.FLAT), CI(9)]); }

    static dom7s5s9(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5, mod.SHARP), CI(7, mod.FLAT), CI(9, mod.SHARP)]); }

    static dom7s5b9(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5, mod.SHARP), CI(7, mod.FLAT), CI(9, mod.FLAT)]); }

    static dom7s11(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5), CI(7, mod.FLAT), CI(11, mod.SHARP)]); }

    // symetrical

    static dim(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3, mod.FLAT), CI(5, mod.FLAT)]); }

    static dim7(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3, mod.FLAT), CI(5, mod.FLAT), CI(7, mod.FLAT_FLAT)]); }

    static aug(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(3), CI(5, mod.SHARP)]); }

    // misc

    static fifth(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(5)]); }

    static b5(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(5, mod.FLAT)]); }

    static sus4(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(4, mod.FLAT), CI(5)]); }

    static sus2(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(2), CI(5)]); }

    static s11(pRootNote = new Note()) { return new Chord(pRootNote, [CI(1), CI(5), CI(11, mod.SHARP)]); }
}

export default Chord;
