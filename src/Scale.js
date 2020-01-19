/*
Scale.js
Author: Zach Moore
*/

import Note from './Note';
import { wrapRange } from './util';

class Scale {
    static modes = {
      IONIAN: 1,
      LYDIAN: 2,
      MIXOLYDIAN: 3,
      DORIAN: 4,
      AEOLIAN: 5,
      PHRYGIAN: 6,
      LOCRIAN: 7,
      TOTAL_MODES: 7,
    }

    mTemplate = [];

    mRootNote = null;

    mNotes = [];

    constructor(pRootNote = new Note()/* C5 */, pTemplate = [2, 2, 1, 2, 2, 2] /* Major scale template */) {
      this.root(pRootNote);
      this.template(pTemplate);
    //   this.mComputeNotes();
    }

    root(pRootNote) {
      if (!pRootNote) {
        return this.mRootNote;
      }

      this.mRootNote = pRootNote;

      this.mComputeNotes();

      return this;
    }

    template(pTemplate) {
      if (!pTemplate) {
        return this.mTemplate;
      }

      // TODO: assert array with length > 1

      this.mTemplate = pTemplate;

      this.mComputeNotes();

      return this;
    }

    get length() {
      return this.mNotes.length;
    }

    get notes() {
      return this.mNotes;
    }

    get key() {
      return this.mRootNote.name;
    }

    degree(pDegree = 0) {
      if (pDegree === 0) { return this.mRootNote; }

      const { value, wraps } = wrapRange(pDegree, 1, this.mNotes.length);
      const note = this.mNotes[value - 1];

      return new Note(note.tone(), note.octave() + wraps);
    }

    relativeMajor() {
      return new Scale(this.degree(3), [2, 2, 1, 2, 2, 2]);
    }

    relativeMinor() {
      return new Scale(this.degree(6), [2, 1, 2, 2, 1, 2]);
    }

    relativeMode(pMode) {
      if (!(pMode >= this.modes.IONIAN && pMode <= this.modes.LOCRIAN)) {
        throw new Error('Invalid scale mode given');
      }

      const notes = this.mNotes;

      switch (pMode) {
        case this.modes.IONIAN: break;
        case this.modes.LYDIAN:
          notes[4].sharp();
          break;
        case this.modes.MIXOLYDIAN:
          notes[7].flat();
          break;
        case this.modes.DORIAN:
          notes[3].flat();
          notes[7].flat();
          break;
        case this.modes.AEOLIAN:
          notes[3].flat();
          notes[6].flat();
          notes[7].flat();
          break;
        case this.modes.PHRYGIAN:
          notes[2].flat();
          notes[3].flat();
          notes[6].flat();
          notes[7].flat();
          break;
        case this.modes.LOCRIAN:
          notes[2].flat();
          notes[3].flat();
          notes[5].flat();
          notes[6].flat();
          notes[7].flat();
          break;
        default: break;
      }

      return this;
    }

    parallelMode(pMode) {
      if (!(pMode >= this.modes.IONIAN && pMode <= this.modes.LOCRIAN)) {
        throw new Error('Invalid scale mode given');
      }

      switch (pMode) {
        case this.modes.IONIAN:
          this.template([2, 2, 1, 2, 2, 2]);
          break;
        case this.modes.LYDIAN:
          this.template([2, 2, 2, 1, 2, 2]);
          break;
        case this.modes.MIXOLYDIAN:
          this.template([2, 2, 1, 2, 2, 1]);
          break;
        case this.modes.DORIAN:
          this.template([2, 1, 2, 2, 2, 1]);
          break;
        case this.modes.AEOLIAN:
          this.template([2, 1, 2, 2, 1, 2]);
          break;
        case this.modes.PHRYGIAN:
          this.template([1, 2, 2, 2, 1, 2]);
          break;
        case this.modes.LOCRIAN:
          this.template([1, 2, 2, 1, 2, 2]);
          break;
        default: break;
      }

      return this;
    }

    mComputeNotes() {
      this.mNotes = [];

      this.mNotes.push(this.mRootNote);

      let iter = this.mRootNote.tone();
      const octave = this.mRootNote.octave();

      let i;
      for (i = 0; i < this.mTemplate.length; i++) {
        iter += this.mTemplate[i];
        this.mNotes.push(new Note(iter, octave));
      }
    }

    equals(pScale) {
      return (pScale.root() === this.root()
        && pScale.template() === this.template());
    }

    copy() {
      return new Scale(this.mRootNote, [...this.mTemplate]);
    }

    static wholeTone(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 2, 2, 2]); }

    static major(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 2, 2]); }

    static major7s4s5(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 2, 1, 2]); }

    static minor(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 2, 1, 2]); }

    static minor7b9(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 2, 2, 2, 1]); }

    static minor7b5(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 1, 2, 2]); }

    static halfDim = Scale.minor7b5;

    static harmonicMajor(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 1, 3]); }

    static harmonicMinor(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 2, 1, 3]); }

    static melodicMinorAscend(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 2, 2, 2]); }

    static melodicMinorDescend(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 2, 1]); }

    static enigmaticMajor(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 2, 2, 2, 1]); }

    static enigmaticMinor(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 3, 1, 3, 1]); }

    static pentatonicMajor(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 3, 2, 3]); }

    static pentatonicMajorBlues(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 1, 3, 2]); }

    static pentatonicMinor(pRootNote = new Note()) { return new Scale(pRootNote, [3, 2, 2, 3, 2]); }

    static pentatonicMinorBlues(pRootNote = new Note()) { return new Scale(pRootNote, [3, 2, 1, 1, 3]); }

    static b5Pentatonic(pRootNote = new Note()) { return new Scale(pRootNote, [3, 2, 1, 4, 2]); }

    static minor6Pentatonic(pRootNote = new Note()) { return new Scale(pRootNote, [3, 2, 2, 2, 3]); }

    static dim8Tone(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 1, 2, 1, 2]); }

    static dom8Tone(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 1, 2, 1, 2, 1]); }

    static neopolitanMajor(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 2, 2, 2, 2]); }

    static neopolitanMinor(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 2, 2, 1, 3]); }

    static hungarianMajor(pRootNote = new Note()) { return new Scale(pRootNote, [3, 1, 2, 1, 2, 1]); }

    static hungarianMinor(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 3, 1, 1, 3]); }

    static hungarianGypsy(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 1, 2, 1, 3]); }

    static spanish(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 1, 2, 2, 2]); }

    static spanishGypsy(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 1, 2, 1, 2]); }

    static spanish8Tone(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 1, 1, 1, 2, 2]); }

    static jewish = Scale.spanish8Tone;

    static augmented(pRootNote = new Note()) { return new Scale(pRootNote, [3, 1, 3, 1, 3, 1]); }

    static dominateSuspended(pRootNote = new Note()) { return new Scale(pRootNote, [2, 3, 2, 2, 1, 2]); }

    static bebopMajor(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 1, 1, 2]); }

    static bebopDominant(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 2, 1, 1]); }

    static mystic(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 3, 2]); }

    static overtone(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 1, 1, 2]); }

    static leadingTone(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 2, 2, 1]); }

    static doubleHarmonic(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 1, 2, 1, 3]); }

    static byzantine = Scale.doubleHarmonic;

    static hirojoshi(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 4, 1]); }

    static japaneseA(pRootNote = new Note()) { return new Scale(pRootNote, [1, 4, 1, 3]); }

    static japaneseB(pRootNote = new Note()) { return new Scale(pRootNote, [2, 3, 1, 3]); }

    static oriental(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 1, 1, 3, 1]); }

    static persian(pRootNote = new Note()) { return new Scale(pRootNote, [1, 4, 1, 2, 3]); }

    static arabian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 1, 2, 2]); }

    static balinese(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 4, 1]); }

    static kumoi(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 4, 2, 2]); }

    static pelog(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 3, 1, 1]); }

    static algerian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 1, 1, 1, 3]); }

    static chinese(pRootNote = new Note()) { return new Scale(pRootNote, [4, 2, 1, 4]); }

    static egyptian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 3, 2, 3]); }

    static romanian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 3, 1, 2, 1]); }

    static hindu(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 1, 2]); }

    static insen(pRootNote = new Note()) { return new Scale(pRootNote, [1, 4, 2, 3]); }

    static iwato(pRootNote = new Note()) { return new Scale(pRootNote, [1, 4, 1, 4]); }

    static scottish(pRootNote = new Note()) { return new Scale(pRootNote, [2, 3, 2, 2]); }

    static yo(pRootNote = new Note()) { return new Scale(pRootNote, [3, 2, 2, 3]); }

    static mongolian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 3, 2]); }

    static istrian(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 2, 2, 1, 2]); }

    static ukranianDorian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 3, 1, 2, 1]); }

    static petrushka(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 2, 1, 3]); }

    static dorian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 2, 2, 1]); }

    static phrygian(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 2, 2, 1, 2]); }

    static lydian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 1, 2, 2]); }

    static lydianDominate(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 1, 2, 1]); }

    static acoustic = Scale.lydianDominate;

    static mixolydian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 2, 1]); }

    static mixolydianFlat6(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 1, 2]); }

    static locrian(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 2, 1, 2, 2]); }

    static superLocrian(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 1, 2, 2, 2]); }

    static ahavaRaba(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 1, 2, 1, 2]); }
}

export default Scale;
