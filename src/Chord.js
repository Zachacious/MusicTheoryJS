/*
Chord.js
*/

import Note from './Note';
import ChordInterval from './ChordInterval';
import Scale from './Scale';
// import { clampNumber } from './util';

// Alias
const CI = ChordInterval.create;

const mod = Note.modifier;

class Chord {
    mRootnote = null;

    mTemplate = []

    mScale = null;

    mNotes = [];

    mChordRE = /(?:(?:([A-G])([#b]*))|([mM])|(dim|aug|sus4|sus2)|(?:([b#]*)([4-9]|1[01])))/g;

    mRootNoteRE = /[A-G]/g;

    mModifierRE = /(#|b)*/g;

    constructor(pRootNote = new Note(), pTemplate = [CI(1), CI(3), CI(5)]/* Major Chord */, pScale = new Scale()) {
      let cRootNote = pRootNote;
      let cTemplate = pTemplate;

      // if the user typed a chord name as a string
      if (typeof pRootNote === 'string') {
        const { root, template } = Chord.mParseName(pRootNote);
        cRootNote = new Note(root);
        cTemplate = template;
      }

      this.mScale = pScale;
      this.mTemplate = cTemplate;
      this.root(cRootNote);
    }

    get notes() {
      return this.mNotes;
    }

    get asString() {
      const names = [];
      this.mNotes.forEach((item) => {
        names.push(item.asString);
      });

      return names;
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

    octave(pOctave) {
      if (!pOctave) {
        return this.mRootnote.octave();
      }

      this.root(new Note(this.mRootnote.tone(), pOctave));

      return this;
    }

    invert() {
      const templateSize = this.mTemplate.length;

      if (templateSize < 2) {
        throw new Error('Chord doesn\'t have enough notes to invert');
      }

      const newTemplate = [];

      let i;
      for (i = 1; i < templateSize; i++) {
        newTemplate.push(this.mTemplate[i]);
      }

      const scaleSize = this.mScale.length;

      const interval = this.mTemplate[0];
      interval.interval += scaleSize;
      newTemplate.push(interval);

      this.template(newTemplate);

      return this;
    }

    equals(pChord) {
      return (pChord.mRootnote.equals(this.mRootnote)
        && pChord.mScale.equals(this.mScale)
        && pChord.mTemplate === this.mTemplate);
    }

    copy() {
      return new Chord(this.mRootnote, this.mTemplate, this.mScale);
    }

    mComputeNotes() {
      this.mNotes = [];

      let i;
      for (i = 0; i < this.mTemplate.length; i++) {
        const deg = this.mScale.degree(this.mTemplate[i].interval);

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

    static mParseName(pName = '') {
      if (!pName) {
        throw new Error('Chord.byName(String) requires a chord name be given');
      }

      let root;

      const template = [CI(1)]; // all chords have the I

      // get all the segments -- EX: A#m | b5 | #11 from 'A#mb5#11'
      const segments = [...pName.matchAll(Chord.mChordRE)];

      // parse each segment
      const numSegments = segments.length;
      let i = 0;
      for (i; i < numSegments; i++) {
        const seg = segments[i];
        const cleanSeg = seg.filter((el) => el != null); // remove empty indexes from segment
        const typeIdentifier = String(cleanSeg[1].charAt(0));

        // if the segment contains a root note - EX: A# or C
        if (Chord.mRootNoteRE.test(typeIdentifier)) {
          switch (typeIdentifier) {
            case 'A': root = Note.tones.A; break; // semitones
            case 'B': root = Note.tones.B; break;
            case 'C': root = Note.tones.C; break;
            case 'D': root = Note.tones.D; break;
            case 'E': root = Note.tones.E; break;
            case 'F': root = Note.tones.F; break;
            case 'G': root = Note.tones.G; break;
            default: break;
          }
          // if the note has a modifier -- EX A#
          if (cleanSeg.length > 2) {
            // cleanSeg[2] should contain the string of modifiers -- EX: '##' or '#' or 'bb##'?...
            const chars = Array.from(cleanSeg[2]);
            // eslint-disable-next-line no-loop-func
            chars.forEach((item) => {
              // add or remove a semitone
              if (item === '#') {
                root += 1;
              } else if (item === 'b') {
                root -= 1;
              }
            });
          }
        } else if (typeIdentifier === 'm') { // minor - EX: A#(m)
          // check if the template already has a 3rd and 5th
          const thirdDegree = template.findIndex((el) => el.interval === 3);
          const fifthDegree = template.findIndex((el) => el.interval === 5);

          if (thirdDegree > -1) { // already has a 3rd
            template[thirdDegree].modifier = mod.FLAT;
          } else {
            template.push(CI(3, mod.FLAT)); // flat 3rd makes it minor
          }

          if (fifthDegree === -1) {
            template.push(CI(5));
          }
        } else if (typeIdentifier === 'M') { // major - EX: C#(M)
          // check if the template already has a 3rd and 5th
          const thirdDegree = template.findIndex((el) => el.interval === 3);
          const fifthDegree = template.findIndex((el) => el.interval === 5);

          if (thirdDegree > -1) { // already has a 3rd
            template[thirdDegree].modifier = mod.NATURAL;
          } else {
            template.push(CI(3));
          }

          if (fifthDegree === -1) {
            template.push(CI(5));
          }
        } else if (Chord.mModifierRE.test(typeIdentifier)) { // series of sharps and flats + scale degree - EX: A#m(b5)(##11)
          // note modifiers - range from -2(FLAT FLAT) to 2(SHARP SHARP) - 0 is NATURAL
          let noteMod = 0;
          const chars = Array.from(cleanSeg[1]); // second index should be the sequence of modifiers - EX: ##, b
          chars.forEach((item) => {
            if (item === '#') {
              noteMod++;
            } else {
              noteMod--;
            }
          });
          const degree = Math.round(cleanSeg[2]); // index 2 should be the scale degree - EX b(5) or ##(11)
          // check if the degree already exist in the template
          const degreeIndex = template.findIndex((el) => el.interval === degree);
          if (degreeIndex > -1) { // already exist in template
            template[degreeIndex].modifier = noteMod;
          } else {
            template.push(CI(degree, noteMod));
          }
        } else if (cleanSeg[0] === 'dim') { // segment contains dim - EX: A#m7(dim)
          // check if 5th degree already exist
          const fifthDegree = template.findIndex((el) => el.interval === 5);
          if (fifthDegree > -1) { // already exist
            template[fifthDegree].modifier = mod.FLAT;
          } else {
            template.push(CI(5, mod.FLAT));
          }
        } else if (cleanSeg[0] === 'aug') { // segment contains aug - EX: A#m7(aug)
          // check if 5th degree already exist
          const fifthDegree = template.findIndex((el) => el.interval === 5);
          if (fifthDegree > -1) { // already exist
            template[fifthDegree].modifier = mod.SHARP;
          } else {
            template.push(CI(5, mod.SHARP));
          }
        } else if (cleanSeg[0] === 'sus2') { // segment contains aug - EX: Am(sus2)
          // check if 3rd degree already exist
          const thirdDegree = template.findIndex((el) => el.interval === 3);
          if (thirdDegree > -1) { // already exist
            template[thirdDegree].interval = 2; // change 3rd to a 2nd
          } else {
            template.push(CI(2));
          }
        } else if (typeIdentifier === 'sus4') { // segment contains aug - EX: Am(sus4)
          // check if 3rd degree already exist
          const thirdDegree = template.findIndex((el) => el.interval === 3);
          if (thirdDegree > -1) { // already exist
            template[thirdDegree].interval = 4; // change 3rd to a 4th
            template[thirdDegree].modifier = mod.FLAT;
          } else {
            template.push(CI(4, mod.FLAT));
          }
        }
      }

      if (!root || template.length < 2) {
        throw new Error('Invalid chord name given');
      } else {
        // sort template by scale degree
        template.sort((a, b) => a.interval - b.interval);
        return { root, template };
        // return new Chord(new Note(root), template);
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
