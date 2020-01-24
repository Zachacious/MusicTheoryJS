/*
Chord.js
*/

import Note from './Note';
import ChordInterval from './ChordInterval';
import Scale from './Scale';

/** @alias ChordInterval.create */
const CI = ChordInterval.create;

/** @alias Note.modifier */
const mod = Note.modifier;


/**
 * Chords are created from a root note, template, and a scale.
 * <br>The template is created from an array of Chord Interval objects representing the scale degree and alterations of each note in the chord.
 * <br><br>
 * <strong>Built-ins</strong>
 * <br> Static factory methods for convienence
 * <br>
 * <table class="params">
 * <tbody>
 * <tr class="deep-level-0">
 * <td>Chord.M(Note)</td>
 * <td>Chord.Madd4(Note)</td>
 * <td>Chord.M6(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Chord.M69(Note)</td>
 * <td>Chord.M7(Note)</td>
 * <td>Chord.M9(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Chord.M11(Note)</td>
 * <td>Chord.M13(Note)</td>
 * <td>Chord.M7s11(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Chord.Mb5(Note)</td>
 * <td>Chord.m(Note)</td>
 * <td>Chord.madd4(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Chord.m6(Note)</td>
 * <td>Chord.m7(Note)</td>
 * <td>Chord.madd9(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Chord.m6add9(Note)</td>
 * <td>Chord.m9(Note)</td>
 * <td>Chord.m11(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Chord.m13(Note)</td>
 * <td>Chord.m7b5(Note)</td>
 * <td>Chord.dom7(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Chord.dom9(Note)</td>
 * <td>Chord.dom11(Note)</td>
 * <td>Chord.dom13(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Chord.dom7s5(Note)</td>
 * <td>Chord.dom7b5(Note)</td>
 * <td>Chord.dom7b9(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Chord.dom7s9(Note)</td>
 * <td>Chord.dom7s9(Note)</td>
 * <td>Chord.dom9s5(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Chord.dom9b5(Note)</td>
 * <td>Chord.dom7s5s9(Note)</td>
 * <td>Chord.dom7s5b9(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Chord.dom7s11(Note)</td>
 * <td>Chord.dim(Note)</td>
 * <td>Chord.dim7(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Chord.aug(Note)</td>
 * <td>Chord.fifth(Note)</td>
 * <td>Chord.b5(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Chord.sus4(Note)</td>
 * <td>Chord.sus2(Note)</td>
 * <td>Chord.s11(Note)</td>
 * </tr>
 * </tbody>
 * </table>
 *
 * @memberof module:MT
 * @example
 * const mod = MT.Note.modifier; // alias
 *
 * let AbM7s11 = new MT.Chord('AbM7s11'); // from string - slowest method
 * let Cm = new MT.Chord(MT.Note.C(), [CI(1), CI(3, mod.FLAT), CI(5)]);
 * let Fdom7s11 = MT.Chord.dom7s11(MT.Note.F()); // from built in
 */
class Chord {
    /** @private */
    mRootnote = null;

    /** @private */
    mTemplate = []

    /** @private */
    mScale = null;

    /** @private */
    mNotes = [];

    /**
     *Creates an instance of Chord.

     * @param {(Note|String)} [pRootNote=new Note()] The root note OR a string representation
     * @param {ChordInterval[]} [pTemplate=[CI(1), CI(3), CI(5)]] Array of ChordInterval objects
     * @param {Scale} [pScale=new Scale()] The scale to pull the chords from
     * @memberof Chord
     */
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

    /**
     * Returns an array of Note objects representing the notes in the chord
     *
     * @readonly
     * @returns {Note[]}
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * console.log(c.notes);
     */
    get notes() {
      return this.mNotes;
    }

    /**
     * Returns a string representation of the notes of the chord
     *
     * @readonly
     * @returns {String}
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * console.log(c.asString);
     */
    get asString() {
      let names = 'Chord: ';
      this.mNotes.forEach((item) => {
        names += `${item.asString} `;
      });

      return names;
    }

    /**
     * (chainable) Sets or returns the root note
     *
     * @chainable
     * @param {Note} [pRootNote] the new root note
     * @returns {(Note|Chord)} If set, returns this object OR returns the root note
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * c.root(MT.Note.F(4)).template([CI(1), CI(3), CI(5)]);
     */
    root(pRootNote) {
      if (!pRootNote) {
        return this.mRootnote;
      }

      this.mRootnote = pRootNote;

      this.scale(this.mScale); // reset for new root note

      return this;
    }

    /**
     * (chainable) Sets or returns the template
     *
     * @chainable
     * @param {ChordInterval[]} [pTemplate] the new template
     * @returns {(ChordInterval[]|Chord)} If set, returns this object OR returns the template
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * c.root(MT.Note.F(4)).template([CI(1), CI(3), CI(5)]);
     */
    template(pTemplate) {
      if (!pTemplate) {
        return this.pTemplate;
      }

      this.mTemplate = pTemplate;

      this.mComputeNotes();

      return this;
    }

    /**
     * (chainable) Sets or returns the scale
     *
     * @chainable
     * @param {Scale} [pScale] the new scale
     * @returns {(Scale|Chord)} If set, returns this object OR returns the scale
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * c.root(MT.Note.F(4)).template([CI(1), CI(3), CI(5)]).scale(MT.Scale.Jewish());
     */
    scale(pScale) {
      if (!pScale) {
        return this.mScale;
      }

      this.mScale = new Scale(this.mRootnote, pScale.template());

      this.mComputeNotes();

      return this;
    }

    /**
     * (chainable) Sets or returns the octave
     * <br> Sets the octave of each note relative to the root
     *
     * @chainable
     * @param {Number} [pOctave] the new octave - clamped 0 - 10
     * @returns {(Number|Chord)} If set returns this object OR returns the octave
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * c.root(MT.Note.F(4)).template([CI(1), CI(3), CI(5)]).scale(MT.Scale.Jewish()).octave(7);
     */
    octave(pOctave) {
      if (!pOctave) {
        return this.mRootnote.octave();
      }

      this.root(new Note(this.mRootnote.tone(), pOctave));

      return this;
    }

    /**
     * (chainable) Inverts the chord - moves the root note up an octave and shifts it to the end
     *
     * @chainable
     * @returns {Chord} Returns this object
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * c.root(MT.Note.F(4)).template([CI(1), CI(3), CI(5)]).scale(MT.Scale.Jewish()).octave(7).invert().invert();
     */
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

    /**
     * (chainable) modifies or creates a natural 3rd
     *
     * @chainable
     * @returns {Chord} Returns this object
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * c.invert().major().invert();
     */
    major() {
      const degree = this.mTemplate.findIndex((el) => el.interval === 3); // find the III interval if exist

      if (degree > -1) { // the III exist
        this.mTemplate[degree].modifier = mod.NATURAL;
      } else {
        this.mTemplate.push(CI(3, mod.NATURAL));
      }

      // sort template by scale degree
      this.mTemplate.sort((a, b) => a.interval - b.interval);

      this.mComputeNotes();

      return this;
    }

    /**
     * (chainable) modifies or creates a flat 3rd
     *
     * @chainable
     * @returns {Chord} Returns this object
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * c.invert().minor().invert();
     */
    minor() {
      const degree = this.mTemplate.findIndex((el) => el.interval === 3); // find the III interval if exist

      if (degree > -1) { // the III exist
        this.mTemplate[degree].modifier = mod.FLAT;
      } else {
        this.mTemplate.push(CI(3, mod.FLAT));
      }

      // sort template by scale degree
      this.mTemplate.sort((a, b) => a.interval - b.interval);

      this.mComputeNotes();

      return this;
    }

    /**
     * (chainable) modifies or creates a flat 5
     *
     * @chainable
     * @returns {Chord} Returns this object
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * c.invert().major().invert().diminish();
     */
    diminish() {
      const degree = this.mTemplate.findIndex((el) => el.interval === 5); // find the V interval if exist

      if (degree > -1) { // the V exist
        this.mTemplate[degree].modifier = mod.FLAT;
      } else {
        this.mTemplate.push(CI(5, mod.FLAT));
      }

      // sort template by scale degree
      this.mTemplate.sort((a, b) => a.interval - b.interval);

      this.mComputeNotes();

      return this;
    }

    /**
     * (chainable) modifies or creates a flat 7
     *
     * @chainable
     * @returns {Chord} Returns this object
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * c.invert().major().invert().haldDiminish();
     */
    halfDiminish() {
      const degree = this.mTemplate.findIndex((el) => el.interval === 7); // find the VII interval if exist

      if (degree > -1) { // the V exist
        this.mTemplate[degree].modifier = mod.FLAT;
      } else {
        this.mTemplate.push(CI(7, mod.FLAT));
      }

      // sort template by scale degree
      this.mTemplate.sort((a, b) => a.interval - b.interval);

      this.mComputeNotes();

      return this;
    }

    /**
     * (chainable) modifies or creates a sharp 5
     *
     * @chainable
     * @returns {Chord} Returns this object
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * c.invert().major().invert().augment();
     */
    augment() {
      const degree = this.mTemplate.findIndex((el) => el.interval === 5); // find the V interval if exist

      if (degree > -1) { // the V exist
        this.mTemplate[degree].modifier = mod.SHARP;
      } else {
        this.mTemplate.push(CI(5, mod.SHARP));
      }

      // sort template by scale degree
      this.mTemplate.sort((a, b) => a.interval - b.interval);

      this.mComputeNotes();

      return this;
    }

    /**
     * Returns true if the given chord is equal to this one
     *
     * @param {Chord} pChord The chord to compare
     * @returns {Boolean} True if the 2 are equal
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * let c2 = MT.Chord.m(MT.Note.F());
     * console.log(c.equals(c2)); // => false
     */
    equals(pChord) {
      return (pChord.mRootnote.equals(this.mRootnote)
        && pChord.mScale.equals(this.mScale)
        && pChord.mTemplate === this.mTemplate);
    }

    /**
     * Creates a copy of this chord
     *
     * @returns {Chord} a copy of this chord
     * @example
     * let c = MT.Chord.M7(MT.Note.C());
     * let copy = c.copy();
     */
    copy() {
      return new Chord(this.mRootnote, this.mTemplate, this.mScale);
    }

    /**
     * Generates the Note object that represent the chord based on the scale and template
     *
     * @private
     */
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

    /**
     * Parses a string representation of a chord name and
     * <br> returns the root note and template
     *
     * @static
     * @private
     * @param {string} pName The string representation of a chord name
     * @returns {Note} The root note
     * @returns {ChordInterval[]} The chord template
     */
    static mParseName(pName) {
      if (!pName) {
        throw new Error('Chord.byName(String) requires a chord name be given');
      }

      let root;

      const template = [CI(1)]; // all chords have the I

      const chordRE = /(?:(?:([A-G])([#b]*))|([mM])|(dim|aug|sus4|sus2)|(?:([b#]*)([4-9]|1[01])))/g;

      const rootNoteRE = /[A-G]/g;

      const modifierRE = /(#|b)*/g;

      // get all the segments -- EX: A#m | b5 | #11 from 'A#mb5#11'
      const segments = [...pName.matchAll(chordRE)];

      // parse each segment
      const numSegments = segments.length;
      let i = 0;
      for (i; i < numSegments; i++) {
        const seg = segments[i];
        const cleanSeg = seg.filter((el) => el != null); // remove empty indexes from segment
        const typeIdentifier = String(cleanSeg[1].charAt(0));

        // if the segment contains a root note - EX: A# or C
        if (rootNoteRE.test(typeIdentifier)) {
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
        } else if (modifierRE.test(typeIdentifier)) { // series of sharps and flats + scale degree - EX: A#m(b5)(##11)
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
