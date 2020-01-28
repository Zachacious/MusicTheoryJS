/*
Scale.js
*/

import Note from './Note';
import { wrapRange } from './util';

/**
 * Scales consist of a root note(tonic or key) and a template(array of integers) that
 * <br> represents the interval of steps between each note.
 * <br><br>Scale intervals are represented by an integer 1 - 4:
 * <br>1 = half step
 * <br>2 = whole step
 * <br>3 = one and one half steps
 * <br>4 = double step
 * <br>[2, 2, 1, 2, 2, 2] represents the major scale
 * <br><br> Scale templates may have arbitray lengths and do NOT include the root note
 * <br><br>
 * <strong>Built-ins</strong>
 * <br> Static factory methods for convinence
 * <br>
 * <table class="params">
 * <tbody>
 * <tr class="deep-level-0">
 * <td>Scale.WholeTone(Note)</td>
 * <td>Scale.Major(Note)</td>
 * <td>Scale.Major7s4s5(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Minor(Note)</td>
 * <td>Scale.Minor7b9(Note)</td>
 * <td>Scale.Minor7b5(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.HalfDim(Note)</td>
 * <td>Scale.HarmonicMajor(Note)</td>
 * <td>Scale.HarmonicMinor(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.MelodicMinorAscend(Note)</td>
 * <td>Scale.MelodicMinorDesend(Note)</td>
 * <td>Scale.EnigmaticMajor(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.EnigmaticMinor(Note)</td>
 * <td>Scale.PentatonicMajor(Note)</td>
 * <td>Scale.PentatonicMajorBlues(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.b5Pentatonic(Note)</td>
 * <td>Scale.Minor6Pentatonic(Note)</td>
 * <td>Scale.Dim8Tone(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Dom8Tone(Note)</td>
 * <td>Scale.NeopolitanMajor(Note)</td>
 * <td>Scale.NeopolitanMinor(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.HungarianMajor(Note)</td>
 * <td>Scale.HungarianMinor(Note)</td>
 * <td>Scale.HungarianGypsy(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Spanish(Note)</td>
 * <td>Scale.SpanishGypsy(Note)</td>
 * <td>Scale.Spanish8Tone(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Jewish(Note)</td>
 * <td>Scale.Augmented(Note)</td>
 * <td>Scale.DominantSuspended(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.BebopMajor(Note)</td>
 * <td>Scale.BebopDominant(Note)</td>
 * <td>Scale.Mystic(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Overtone(Note)</td>
 * <td>Scale.LeadingTone(Note)</td>
 * <td>Scale.DoubleHarmonic(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Byzantine(Note)</td>
 * <td>Scale.Hirojoshi(Note)</td>
 * <td>Scale.JapaneseA(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.JapaneseB(Note)</td>
 * <td>Scale.Oriental(Note)</td>
 * <td>Scale.Persian(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Arabian(Note)</td>
 * <td>Scale.Balinese(Note)</td>
 * <td>Scale.Kumoi(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Pelog(Note)</td>
 * <td>Scale.Algerian(Note)</td>
 * <td>Scale.Chinese(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Egyptian(Note)</td>
 * <td>Scale.Romanian(Note)</td>
 * <td>Scale.Hindu(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Insen(Note)</td>
 * <td>Scale.Iwato(Note)</td>
 * <td>Scale.Scottish(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Yo(Note)</td>
 * <td>Scale.Mongolian(Note)</td>
 * <td>Scale.Istrian(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.UkranianDorian(Note)</td>
 * <td>Scale.Petrushka(Note)</td>
 * <td>Scale.Dorian(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Phrygian(Note)</td>
 * <td>Scale.Lydian(Note)</td>
 * <td>Scale.LydianDominate(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Acoustic(Note)</td>
 * <td>Scale.Mixolydian(Note)</td>
 * <td>Scale.MixolydianFlat6(Note)</td>
 * </tr>
 * <tr class="deep-level-0">
 * <td>Scale.Locrian(Note)</td>
 * <td>Scale.SuperLocrian(Note)</td>
 * <td>Scale.AhavaRaba(Note)</td>
 * </tr>
 * </tbody>
 * </table>
 *
 * @memberof module:MT
 * @example
 * let scaleAM = MT.Scale(MT.Note.A(), [2, 2, 1, 2, 2, 2]);
 * let scaleCsm = MT.Scale(MT.Note.C().sharp(), [2, 1, 2, 2, 1, 2]);
 * let spanishScale = MT.Scale.Spanish(MT.Note.C());
 */
class Scale {
  /**
   * Scale modes enum
   *
   * @readonly
   * @enum {Number}
   *
   * @property {number} IONIAN 1
   * @property {number} LYDIAN 2
   * @property {number} MIXOLYDIAN 3
   * @property {number} DORIAN 4
   * @property {number} AEOLIAN 5
   * @property {number} PHRYGIAN 6
   * @property {number} LOCRIAN 7
   */
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

    /** @private */
    mTemplate = [];

    /** @private */
    mRootNote = null;

    /** @private */
    mNotes = [];

    /**
     *Creates an instance of Scale.

     * @param {Note} [pRootNote=new Note()] The root note of the scale - tonic
     * @param {Array} [pTemplate=[2, 2, 1, 2, 2, 2]] An array of integers representing the intervals between scale degrees(not including the root)
     * @memberof Scale
     */
    constructor(pRootNote = new Note()/* C5 */, pTemplate = [2, 2, 1, 2, 2, 2] /* Major scale template */) {
      this.root(pRootNote);
      this.template(pTemplate);
    }

    /**
     * Returns the number of notes in the scale
     *
     * @readonly
     * @returns {Number} the number of notes in the scale
     * @example
     * let CSpanish = MT.Scale.Spanish(MT.Note.C());
     * console.log(CSpanish.length);
     */
    get length() {
      return this.mNotes.length;
    }

    /**
     * Returns an array of Note objects generated by the scale
     *
     * @readonly
     * @returns {Notes[]} array of Notes created by the scale
     * @example
     * let CSpanish = MT.Scale.Spanish(MT.Note.C());
     * console.log(CSpanish.notes);
     */
    get notes() {
      return this.mNotes;
    }

    /**
     * Returns the root note of the scale
     *
     * @readonly
     * @returns {Note}
     * @example
     * let CSpanish = MT.Scale.Spanish(MT.Note.C());
     * console.log(CSpanish.key.asString);
     */
    get key() {
      return this.mRootNote;
    }

    /**
     * Returns a string representation of the scale
     *
     * @readonly
     * @returns {String}
     * @example
     * let CSpanish = MT.Scale.Spanish(MT.Note.C());
     * console.log(CSpanish.asString);
     */
    get asString() {
      let names = 'Scale: ';
      this.mNotes.forEach((item) => {
        names += `${item.asString} `;
      });

      return names;
    }

    /**
     * (chainable) Sets or returns the root note of the scale
     *
     * @chainable
     * @param {Note} [pRootNote]
     * @returns {(Note|Scale)} If root note is set returns this object otherwise returns the root note
     * @example
     * let CSpanish = MT.Scale.Spanish(MT.Note.C());
     * CSpanish.root(MT.Note.A());
     */
    root(pRootNote) {
      if (!pRootNote) {
        return this.mRootNote;
      }

      this.mRootNote = pRootNote;

      this.mComputeNotes();

      return this;
    }

    /**
     * (chainable) Sets or returns the template of the scale
     *
     * @chainable
     * @param {Array} [pTemplate]
     * @returns {(Array|Scale)} If template is set returns this object otherwise returns the template
     * @example
     * let CSpanish = MT.Scale.Spanish(MT.Note.C());
     * CSpanish.root(MT.Note.A()).template([2, 1, 2, 2, 2, 1, 2]);
     */
    template(pTemplate) {
      if (!pTemplate) {
        return this.mTemplate;
      }

      this.mTemplate = pTemplate;

      this.mComputeNotes();

      return this;
    }

    /**
     * Returns a Note object representing the given degree of the scale
     *
     * @param {number} [pDegree=0]
     * @returns {Note} the note generated for the given scale interval
     * @example
     * let CSpanish = MT.Scale.Spanish(MT.Note.C());
     * console.log(CSpanish.degree(3));
     */
    degree(pDegree = 0) {
      if (pDegree === 0) { return this.mRootNote; }

      const { value, wraps } = wrapRange(pDegree, 1, this.mNotes.length);
      const note = this.mNotes[value - 1];

      return new Note(note.tone(), note.octave() + wraps);
    }

    /**
     * Returns a new scale built from the 3rd degree of this scale
     *
     * @returns {Scale} the relativeMajor scale built from this scale
     * @example
     * let CSpanish = MT.Scale.Spanish(MT.Note.C());
     * let CSpanRelMaj = CSpanish.relativeMajor();
     */
    relativeMajor() {
      return new Scale(this.degree(3), [2, 2, 1, 2, 2, 2]);
    }

    /**
     * Returns a new scale built from the 6th degree of this scale
     *
     * @returns {Scale} the relativeMinor scale built from this scale
     * @example
     * let CSpanish = MT.Scale.Spanish(MT.Note.C());
     * let CSpanRelMin = CSpanish.relativeMinor();
     */
    relativeMinor() {
      return new Scale(this.degree(6), [2, 1, 2, 2, 1, 2]);
    }

    /**
     * Returns a new scale as the relative mode
     *
     * @returns {Scale}
     * @example
     * let s = MT.Scale.Major(MT.Note.C()).ionianMode();
     */
    ionianMode() { return Scale.Major(this.mRootNote); }

    /**
     * Returns a new scale as the relative mode
     *
     * @returns {Scale}
     * @example
     * let s = MT.Scale.Major(MT.Note.C()).dorianMode();
     */
    dorianMode() { return Scale.Dorian(this.degree(2)); }

    /**
     * Returns a new scale as the relative mode
     *
     * @returns {Scale}
     * @example
     * let s = MT.Scale.Major(MT.Note.C()).phrygianMode();
     */
    phrygianMode() { return Scale.Phrygian(this.degree(3)); }

    /**
     * Returns a new scale as the relative mode
     *
     * @returns {Scale}
     * @example
     * let s = MT.Scale.Major(MT.Note.C()).lydianMode();
     */
    lydianMode() { return Scale.Lydian(this.degree(4)); }

    /**
     * Returns a new scale as the relative mode
     *
     * @returns {Scale}
     * @example
     * let s = MT.Scale.Major(MT.Note.C()).mixolydianMode();
     */
    mixolydianMode() { return Scale.Mixolydian(this.degree(5)); }

    /**
     * Returns a new scale as the relative mode
     *
     * @returns {Scale}
     * @example
     * let s = MT.Scale.Major(MT.Note.C()).aeolianMode();
     */
    aeolianMode() { return Scale.Aeolian(this.degree(6)); }

    /**
     * Returns a new scale as the relative mode
     *
     * @returns {Scale}
     * @example
     * let s = MT.Scale.Major(MT.Note.C()).locrianMode();
     */
    locrianMode() { return Scale.Locrian(this.degree(7)); }

    /**
     * (chainable) Sets the mode to one of MT.Scale.modes enum.
     * <br> This operation converts the scale to the given mode no matter what(A Dorian is A Dorian)
     * <br> the root note stays the same.
     *
     * @see #modes
     * @param {Number} pMode The mode to transform into
     * @returns {Scale} Returns this object
     * @example
     * let s = MT.Scale.Major(MT.Note.C());
     * console.log(s.parallelMode(MT.Scale.modes.DORIAN).asString);
     */
    parallelMode(pMode) {
      if (!(pMode >= Scale.modes.IONIAN && pMode <= Scale.modes.LOCRIAN)) {
        throw new Error('Invalid scale mode given');
      }

      switch (pMode) {
        case Scale.modes.IONIAN:
          this.template([2, 2, 1, 2, 2, 2]);
          break;
        case Scale.modes.LYDIAN:
          this.template([2, 2, 2, 1, 2, 2]);
          break;
        case Scale.modes.MIXOLYDIAN:
          this.template([2, 2, 1, 2, 2, 1]);
          break;
        case Scale.modes.DORIAN:
          this.template([2, 1, 2, 2, 2, 1]);
          break;
        case Scale.modes.AEOLIAN:
          this.template([2, 1, 2, 2, 1, 2]);
          break;
        case Scale.modes.PHRYGIAN:
          this.template([1, 2, 2, 2, 1, 2]);
          break;
        case Scale.modes.LOCRIAN:
          this.template([1, 2, 2, 1, 2, 2]);
          break;
        default: break;
      }

      return this;
    }

    /**
     * Return the correct template index for the scale degree given
     *
     * @private
     * @param {number} [pDegree=0]
     * @returns {Number} The correct index into mTemplate
     */
    mTemplateDegreeIndex(pDegree = 0) {
      const { value } = wrapRange(pDegree - 1, 1, this.mNotes.length);
      return (value - 1);
    }

    /**
     * Creates the Note objects representing the scale
     *
     * @static
     * @private
     */
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

    /**
     * Returns true if this scale and the one given are equal
     *
     * @param {Scale} pScale The scale to compare
     * @returns {Boolean} true if the 2 are equal
     * @example
     * let s1 = MT.Scale.Major(MT.Note.C(4));
     * let s2 = MT.Scale.Major(MT.Note.B(4).sharp());
     * console.log(s1.equals(s2)); => true
     */
    equals(pScale) {
      return (pScale.root() === this.root()
        && pScale.template() === this.template());
    }

    /**
     * Returns a copy of the scale
     *
     * @returns {Scale}
     * @example
     * let s1 = MT.Scale.Major(MT.Note.C(4));
     * let s2 = s1.copy();
     */
    copy() {
      return new Scale(this.mRootNote, [...this.mTemplate]);
    }

    static WholeTone(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 2, 2, 2]); }

    static Major(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 2, 2]); }

    static Major7s4s5(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 2, 1, 2]); }

    static Minor(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 2, 1, 2]); }

    static Minor7b9(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 2, 2, 2, 1]); }

    static Minor7b5(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 1, 2, 2]); }

    static HalfDim = Scale.Minor7b5;

    static HarmonicMajor(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 1, 3]); }

    static HarmonicMinor(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 2, 1, 3]); }

    static MelodicMinorAscend(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 2, 2, 2]); }

    static MelodicMinorDescend(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 2, 1]); }

    static EnigmaticMajor(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 2, 2, 2, 1]); }

    static EnigmaticMinor(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 3, 1, 3, 1]); }

    static PentatonicMajor(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 3, 2, 3]); }

    static PentatonicMajorBlues(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 1, 3, 2]); }

    static PentatonicMinor(pRootNote = new Note()) { return new Scale(pRootNote, [3, 2, 2, 3, 2]); }

    static PentatonicMinorBlues(pRootNote = new Note()) { return new Scale(pRootNote, [3, 2, 1, 1, 3]); }

    static b5Pentatonic(pRootNote = new Note()) { return new Scale(pRootNote, [3, 2, 1, 4, 2]); }

    static Minor6Pentatonic(pRootNote = new Note()) { return new Scale(pRootNote, [3, 2, 2, 2, 3]); }

    static Dim8Tone(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 1, 2, 1, 2]); }

    static Dom8Tone(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 1, 2, 1, 2, 1]); }

    static NeopolitanMajor(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 2, 2, 2, 2]); }

    static NeopolitanMinor(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 2, 2, 1, 3]); }

    static HungarianMajor(pRootNote = new Note()) { return new Scale(pRootNote, [3, 1, 2, 1, 2, 1]); }

    static HungarianMinor(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 3, 1, 1, 3]); }

    static HungarianGypsy(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 1, 2, 1, 3]); }

    static Spanish(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 1, 2, 2, 2]); }

    static SpanishGypsy(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 1, 2, 1, 2]); }

    static Spanish8Tone(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 1, 1, 1, 2, 2]); }

    static Jewish = Scale.Spanish8Tone;

    static Augmented(pRootNote = new Note()) { return new Scale(pRootNote, [3, 1, 3, 1, 3, 1]); }

    static DominantSuspended(pRootNote = new Note()) { return new Scale(pRootNote, [2, 3, 2, 2, 1, 2]); }

    static BebopMajor(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 1, 1, 2]); }

    static BebopDominant(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 2, 1, 1]); }

    static Mystic(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 3, 2]); }

    static Overtone(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 1, 1, 2]); }

    static LeadingTone(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 2, 2, 1]); }

    static DoubleHarmonic(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 1, 2, 1, 3]); }

    static Byzantine = Scale.DoubleHarmonic;

    static Hirojoshi(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 4, 1]); }

    static JapaneseA(pRootNote = new Note()) { return new Scale(pRootNote, [1, 4, 1, 3]); }

    static JapaneseB(pRootNote = new Note()) { return new Scale(pRootNote, [2, 3, 1, 3]); }

    static Oriental(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 1, 1, 3, 1]); }

    static Persian(pRootNote = new Note()) { return new Scale(pRootNote, [1, 4, 1, 2, 3]); }

    static Arabian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 1, 2, 2]); }

    static Balinese(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 4, 1]); }

    static Kumoi(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 4, 2, 2]); }

    static Pelog(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 3, 1, 1]); }

    static Algerian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 1, 1, 1, 3]); }

    static Chinese(pRootNote = new Note()) { return new Scale(pRootNote, [4, 2, 1, 4]); }

    static Egyptian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 3, 2, 3]); }

    static Romanian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 3, 1, 2, 1]); }

    static Hindu(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 1, 2]); }

    static Insen(pRootNote = new Note()) { return new Scale(pRootNote, [1, 4, 2, 3]); }

    static Iwato(pRootNote = new Note()) { return new Scale(pRootNote, [1, 4, 1, 4]); }

    static Scottish(pRootNote = new Note()) { return new Scale(pRootNote, [2, 3, 2, 2]); }

    static Yo(pRootNote = new Note()) { return new Scale(pRootNote, [3, 2, 2, 3]); }

    static Mongolian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 3, 2]); }

    static Istrian(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 2, 2, 1, 2]); }

    static UkranianDorian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 3, 1, 2, 1]); }

    static Petrushka(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 2, 1, 3]); }

    static Dorian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 1, 2, 2, 2, 1]); }

    static Phrygian(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 2, 2, 1, 2]); }

    static Lydian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 1, 2, 2]); }

    static LydianDominate(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 2, 1, 2, 1]); }

    static Acoustic = Scale.LydianDominate;

    static Mixolydian(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 2, 1]); }

    static MixolydianFlat6(pRootNote = new Note()) { return new Scale(pRootNote, [2, 2, 1, 2, 1, 2]); }

    static Locrian(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 2, 1, 2, 2]); }

    static SuperLocrian(pRootNote = new Note()) { return new Scale(pRootNote, [1, 2, 1, 2, 2, 2]); }

    static AhavaRaba(pRootNote = new Note()) { return new Scale(pRootNote, [1, 3, 1, 2, 1, 2]); }
}

export default Scale;
