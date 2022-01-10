import Entity from "../Entity";
import { uid } from "uid";
import Semitone from "../Semitone";
import { DEFAULT_SEMITONE, TONES_MAX, TONES_MIN } from "../Note/noteConstants";
import { DEFAULT_OCTAVE, OCTAVE_MAX, OCTAVE_MIN } from "../Note/noteConstants";
import wrap from "../utils/wrap";
import clamp from "../utils/clamp";
import ChordInitializer from "./ChordInitializer";
import ChordTemplates from "./chordTemplates";
import Note from "../Note/Note";
import { DEFAULT_CHORD_TEMPLATE, DEFAULT_SCALE } from "./ChordConstants";
import ChordInterval from "./ChordInterval";
import Scale from "../Scale/Scale";
import isEqual from "../utils/isEqual";
import parseChord from "./chordNameParser";
import shift from "../utils/shift";

/**
 * Chords consist of a root note, octave, chord template, and a base scale.<br><br>
 * The chord template is an array of integers, each integer representing<br>
 *  a scale degree from the base scale(defaults to major).<br>
 * The default template is the I,III,V denoted as [1,3,5]<br>
 * ChordIntervals used in templates can also contain a modifier,<br>
 * for a particular scale degree, such as [1,3,[5, -1]]<br>
 * where -1 is flat, 0 is natural, and 1 is sharp.<br>
 * It could also be written as [1,3,[5, modifier.flat]]<br>
 * if you import modifier.
 *
 * The following predefined templates are available:<br>
 * <table>
 * <tr>
 * <td>maj</td>
 * <td>maj4</td>
 * <td>maj6</td>
 * <td>maj69</td>
 * </tr><tr>
 * <td>maj7</td>
 * <td>maj9</td>
 * <td>maj11</td>
 * <td>maj13</td>
 * </tr><tr>
 * <td>maj7s11</td>
 * <td>majb5</td>
 * <td>min</td>
 * <td>min4</td>
 * </tr><tr>
 * <td>min6</td>
 * <td>min7</td>
 * <td>minAdd9</td>
 * <td>min69</td>
 * </tr><tr>
 * <td>min9</td>
 * <td>min11</td>
 * <td>min13</td>
 * <td>min7b5</td>
 * </tr><tr>
 * <td>dom7</td>
 * <td>dom9</td>
 * <td>dom11</td>
 * <td>dom13</td>
 * </tr><tr>
 * <td>dom7s5</td>
 * <td>dom7b5</td>
 * <td>dom7s9</td>
 * <td>dom7b9</td>
 * </tr><tr>
 * <td>dom9b5</td>
 * <td>dom9s5</td>
 * <td>dom7s11</td>
 * <td>dom7s5s9</td>
 * </tr><tr>
 * <td>dom7s5b9</td>
 * <td>dim</td>
 * <td>dim7</td>
 * <td>aug</td>
 * </tr><tr>
 * <td>sus2</td>
 * <td>sus4</td>
 * <td>fifth</td>
 * <td>b5</td>
 * </tr><tr>
 * <td>s11</td>
 * </tr>
 * </table>
 *
 * @example
 * ```javascript
 * import { Chord } from "musictheoryjs";
 * import {ChordTemplate} from "musictheoryjs";
 * import {ChordInterval} from "musictheoryjs";
 * import {Modifier} from "musictheoryjs";
 * import {ChordInitializer} from "musictheoryjs";// Typescript only if needed
 * ```
 */
class Chord implements Entity {
   /**
    * @example
    * ```javascript
    * import { Chord, ChordTemplates, Modifier } from "musictheoryjs";
    *
    * //creates a chord with the default(1,3,5) template, root of C, in the 4th octave
    * const chord = new Chord();
    *
    * // creates a chord with the pre-defined diminished template, root of Eb, in the 5th octave
    * const chord = new Chord({root: 3, octave: 5, template: ChordTemplates.dim});
    *
    * // String parsing should follow the format: (root-note-name[s,#,b][octave])[chord-template-name|[chord-quality][modifiers]]
    * // creates a chord from a string
    * const chord = new Chord('(D4)min4');
    * ```
    */
   constructor(values?: ChordInitializer | string) {
      if (!values) {
         this._template = [...DEFAULT_CHORD_TEMPLATE];
         this.octave = DEFAULT_OCTAVE;
         this.root = DEFAULT_SEMITONE;
      } else if (typeof values === "string") {
         const parsed = parseChord(values);
         this._template = [...(parsed?.template ?? DEFAULT_CHORD_TEMPLATE)];
         this.octave = parsed?.octave ?? DEFAULT_OCTAVE;
         this.root = parsed?.root ?? DEFAULT_SEMITONE;
      } else {
         this._template = [...(values.template ?? DEFAULT_CHORD_TEMPLATE)];
         this.octave = values.octave ?? DEFAULT_OCTAVE;
         this.root = values.root ?? DEFAULT_SEMITONE;
      }

      this._baseScale = new Scale({ key: this._root, octave: this._octave });

      this._notesDirty = true;
   }

   /**
    * unique id for this instance
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.id); // hal8934hll
    * ```
    */
   id: string = uid();

   /**
    * root
    */
   protected _root: Semitone = DEFAULT_SEMITONE;
   /**
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.root); // 0(semitone)
    * ```
    */
   get root(): Semitone {
      return this._root;
   }
   /**
    * Setting the root to a value outside of the range [0, 11](semitone) will<br/>
    * wrap the semitone to the range [0, 11] and change the octave depending<br/>
    * on how many times the semitone has been wrapped.
    * @example
    * ```javascript
    * const chord = new Chord();
    * chord.root = 4; // sets the root to 4th semitone(E)
    * console.log(chord.root); // 4(semitone)
    * ```
    */
   set root(value: Semitone) {
      // this._root = value;
      const wrapped = wrap(value, TONES_MIN, TONES_MAX);
      this._root = wrapped.value;
      this._octave = this._octave + wrapped.numWraps;
      this._notesDirty = true;
   }

   /**
    * base scale
    */
   protected _baseScale: Scale = DEFAULT_SCALE;
   /**
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.baseScale); // prints the default scale(major)
    * ```
    */
   get baseScale(): Scale {
      return this._baseScale;
   }
   /**
    * Not a lot of good reasons to change this except for experimentation
    * @example
    * ```javascript
    * const chord = new Chord();
    * chord.baseScale = new Scale({ key: 3, octave: 5, template: [1, [3, Modifier.flat], 5] });
    * console.log(chord.baseScale); // prints the minor scale
    * ```
    */
   set baseScale(value: Scale) {
      this._baseScale = value;
      this._baseScale.octave = this._octave;
      this._notesDirty = true;
   }

   /**
    * octave
    */
   protected _octave: number = DEFAULT_OCTAVE;
   /**
    * The octave is clamped to the range [0, 9].
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.octave); // 4(octave)
    * ```
    */
   get octave(): number {
      return this._octave;
   }
   /**
    * @example
    * ```javascript
    * const chord = new Chord();
    * chord.octave = 5; // sets the octave to 5th
    * console.log(chord.octave); // 5(octave)
    * ```
    */
   set octave(value: number) {
      this._octave = clamp(value, OCTAVE_MIN, OCTAVE_MAX);
      this._baseScale.octave = this._octave;
      this._notesDirty = true;
   }

   /**
    * template
    */
   protected _template: ChordInterval[] = [];
   /**
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.template); // prints the default template
    * ```
    */
   public get template(): ChordInterval[] {
      return [...this._template];
   }
   /**
    * The following predefined templates are available:<br>
    * <table>
    * <tr>
    * <td>maj</td>
    * <td>maj4</td>
    * <td>maj6</td>
    * <td>maj69</td>
    * </tr><tr>
    * <td>maj7</td>
    * <td>maj9</td>
    * <td>maj11</td>
    * <td>maj13</td>
    * </tr><tr>
    * <td>maj7s11</td>
    * <td>majb5</td>
    * <td>min</td>
    * <td>min4</td>
    * </tr><tr>
    * <td>min6</td>
    * <td>min7</td>
    * <td>minAdd9</td>
    * <td>min69</td>
    * </tr><tr>
    * <td>min9</td>
    * <td>min11</td>
    * <td>min13</td>
    * <td>min7b5</td>
    * </tr><tr>
    * <td>dom7</td>
    * <td>dom9</td>
    * <td>dom11</td>
    * <td>dom13</td>
    * </tr><tr>
    * <td>dom7s5</td>
    * <td>dom7b5</td>
    * <td>dom7s9</td>
    * <td>dom7b9</td>
    * </tr><tr>
    * <td>dom9b5</td>
    * <td>dom9s5</td>
    * <td>dom7s11</td>
    * <td>dom7s5s9</td>
    * </tr><tr>
    * <td>dom7s5b9</td>
    * <td>dim</td>
    * <td>dim7</td>
    * <td>aug</td>
    * </tr><tr>
    * <td>sus2</td>
    * <td>sus4</td>
    * <td>fifth</td>
    * <td>b5</td>
    * </tr><tr>
    * <td>s11</td>
    * </tr>
    * </table>
    * @example
    * ```javascript
    * const chord = new Chord();
    * chord.template = [1, [3, Modifier.flat], 5]; // sets the template to a minor chord
    * console.log(chord.template); // prints the new template
    * ```
    */
   public set template(value: ChordInterval[]) {
      this._template = [...value];
      this._notesDirty = true;
   }

   /**
    * notes
    * notes are generated and cached as needed
    */
   protected _notes: Array<Note> = [];
   protected _notesDirty: boolean = true;
   /**
    * will generate notes if needed or return the cached notes
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.notes); // prints the default notes
    * ```
    */
   public get notes(): Array<Note> {
      if (this._notesDirty) {
         this.generateNotes();
         this._notesDirty = false;
      }
      return this._notes;
   }

   /**
    * generate notes(internal)
    * generates the notes for this scale
    */
   protected generateNotes(): Note[] {
      this._notes = [];
      for (const interval of this._template) {
         let tone = 0;
         let mod = 0;
         if (Array.isArray(interval)) {
            tone = interval[0];
            mod = interval[1];
         } else {
            tone = interval;
         }
         const offset = tone;
         const note = this._baseScale.degree(offset);
         const noteTone = note.semitone;
         note.semitone = noteTone + mod;
         this._notes.push(note);
      }

      return this._notes;
   }

   /**
    * @returns the note names -> ['C4', 'E4', 'G4']
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.getNoteNames()); // ['C4', 'E4', 'G4']
    * ```
    */
   public getNoteNames(): string[] {
      const noteNames: string[] = [];
      for (const note of this.notes) {
         noteNames.push(note.toString());
      }
      return noteNames;
   }

   /**
    * @chainable
    * @returns a copy of the chord
    * @example
    * ```javascript
    * const chord = new Chord();
    * const copy = chord.copy();
    * console.log(chord.equals(copy)); // true
    * ```
    */
   public copy(): Chord {
      return new Chord({
         root: this.root,
         octave: this.octave,
         template: [...this._template],
      });
   }

   /**
    * @param other the other chord to compare to
    * @returns true if the two chords are equal
    * @example
    * ```javascript
    * const chord = new Chord();
    * const copy = chord.copy();
    * console.log(chord.equals(copy)); // true
    * ```
    */
   public equals(other: Chord): boolean {
      return (
         this.root === other.root &&
         this.octave === other.octave &&
         isEqual(this._template, other.template)
      );
   }

   /**
    * mutates the chord in place
    * @chainable
    * @returns the chord with a natrual 3rd
    * @example
    * ```javascript
    * const chord = new Chord();
    * chord.minor();
    * chord.major();
    * console.log(chord.template); // [1,3,5]
    * ```
    */
   public major(): Chord {
      let index = -1;
      for (let i = 0; i < this._template.length; ++i) {
         if (this._template[i] === 3) {
            index = i;
            break;
         }
         const interval: ChordInterval = this._template[i];
         if (Array.isArray(interval)) {
            if ((interval[0] ?? 0) === 3) {
               index = i;
               break;
            }
         }
      }

      if (index === -1) {
         this._template.push(3);
      } else {
         this._template[index] = 3;
      }

      this._notesDirty = true;

      return this;
   }

   /**
    * @chainable
    * @returns a copy of the chord with a natural 3rd
    * @example
    * ```javascript
    * const chord = new Chord();
    * chord.minor();
    * const copy = chord.majored();
    * console.log(copy.template); // [1,3,5]
    * ```
    */
   public majored(): Chord {
      return this.copy().major();
   }

   /**
    * @returns true if the chord has a natural 3rd
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.isMajor()); // true
    * ```
    */
   public isMajor(): boolean {
      for (const interval of this._template) {
         if (Array.isArray(interval)) {
            if ((interval[0] ?? 0) === 3 && (interval[1] ?? 0) === 0) {
               return true;
            }
         } else {
            if (interval === 3) {
               return true;
            }
         }
      }

      return false;
   }

   /**
    *  mutates the chord in place
    * @chainable
    * @returns the chord with a flat 3rd
    * @example
    * ```javascript
    * const chord = new Chord();
    * chord.minor();
    * console.log(chord.template); // [1,[3,-1],5]
    * ```
    */
   public minor(): Chord {
      let index = -1;
      for (let i = 0; i < this._template.length; ++i) {
         if (this._template[i] === 3) {
            index = i;
            break;
         }
         const interval: ChordInterval = this._template[i];
         if (Array.isArray(interval)) {
            if ((interval[0] ?? 0) === 3) {
               index = i;
               break;
            }
         }
      }

      if (index === -1) {
         this._template.push([3, -1]);
      } else {
         this._template[index] = [3, -1];
      }

      this._notesDirty = true;

      return this;
   }

   /**
    * @chainable
    * @returns a copy of the chord with a flat 3rd
    * @example
    * ```javascript
    * const chord = new Chord();
    * const copy = chord.minored();
    * console.log(copy.template); // [1,[3,-1],5]
    * ```
    */
   public minored(): Chord {
      return this.copy().minor();
   }

   /**
    * @returns true if the chord has a flat 3rd
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.isMinor()); // false
    * chord.minor();
    * console.log(chord.isMinor()); // true
    * ```
    */
   public isMinor(): boolean {
      for (const interval of this._template) {
         if (Array.isArray(interval)) {
            if ((interval[0] ?? 0) === 3 && (interval[1] ?? 0) === -1) {
               return true;
            }
         }
      }

      return false;
   }

   /**
    * Mutates the chord in place
    * @chainable
    * @returns the chord with a sharp 5th
    * @example
    * ```javascript
    * const chord = new Chord();
    * chord.augment();
    * console.log(chord.template); // [1, 3, [5, Modifier.sharp]]
    * ```
    */
   public augment(): Chord {
      let index = -1;
      for (let i = 0; i < this._template.length; ++i) {
         if (this._template[i] === 5) {
            index = i;
            break;
         }
         const interval: ChordInterval = this._template[i];
         if (Array.isArray(interval)) {
            if ((interval[0] ?? 0) === 5) {
               index = i;
               break;
            }
         }
      }

      if (index === -1) {
         this._template.push([5, 1]);
      } else {
         this._template[index] = [5, 1];
      }

      this._notesDirty = true;

      return this;
   }

   /**
    * @chainable
    * @returns a copy of the chord with a sharp 5th
    * @example
    * ```javascript
    * const chord = new Chord();
    * const copy = chord.augmented();
    * console.log(copy.template); // [1, 3, [5, Modifier.sharp]]
    * ```
    */
   public augmented(): Chord {
      return this.copy().augment();
   }

   /**
    * @returns true if the chord has a sharp 5th
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.isAugmented()); // false
    * chord.augment();
    * console.log(chord.isAugmented()); // true
    * ```
    */
   public isAugmented(): boolean {
      for (const interval of this._template) {
         if (Array.isArray(interval)) {
            if ((interval[0] ?? 0) === 5 && (interval[1] ?? 0) === 1) {
               return true;
            }
         }
      }

      return false;
   }

   /**
    * Mutates the chord in place
    * @chainable
    * @returns the chord with a flat 5th
    * @example
    * ```javascript
    * const chord = new Chord();
    * chord.diminish();
    * console.log(chord.template); // [1, 3, [5, Modifier.flat]]
    * ```
    */
   public diminish(): Chord {
      let index = -1;
      for (let i = 0; i < this._template.length; ++i) {
         if (this._template[i] === 5) {
            index = i;
            break;
         }
         const interval: ChordInterval = this._template[i];
         if (Array.isArray(interval)) {
            if ((interval[0] ?? 0) === 5) {
               index = i;
               break;
            }
         }
      }

      if (index === -1) {
         this._template.push([5, -1]);
      } else {
         this._template[index] = [5, -1];
      }

      this._notesDirty = true;

      return this;
   }

   /**
    * @chainable
    * @returns a copy of the chord with a flat 5th
    * @example
    * ```javascript
    * const chord = new Chord();
    * const copy = chord.diminished();
    * console.log(copy.template); // [1, 3, [5, Modifier.flat]]
    * ```
    */
   public diminished(): Chord {
      return this.copy().diminish();
   }

   /**
    * @returns true if the chord has a flat 5th
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.isDiminished()); // false
    * chord.diminish();
    * console.log(chord.isDiminished()); // true
    * ```
    */
   public isDiminished(): boolean {
      for (const interval of this._template) {
         if (Array.isArray(interval)) {
            if ((interval[0] ?? 0) === 5 && (interval[1] ?? 0) === -1) {
               return true;
            }
         }
      }

      return false;
   }

   /**
    * Mutates the chord in place
    * @chainable
    * @returns the chord with a flat 3,5, and 7th
    * @example
    * ```javascript
    * const chord = new Chord();
    * chord.halfDiminish();
    * console.log(chord.template); // [1, [3, Modifier.flat], [5, Modifier.flat], [7, Modifier.flat]]
    *
    */
   public halfDiminish(): Chord {
      this.minor(); // get flat 3rd
      this.diminish(); // get flat 5th

      let index = -1;
      for (let i = 0; i < this._template.length; ++i) {
         if (this._template[i] === 7) {
            index = i;
            break;
         }
         const interval: ChordInterval = this._template[i];
         if (Array.isArray(interval)) {
            if ((interval[0] ?? 0) === 7) {
               index = i;
               break;
            }
         }
      }

      if (index === -1) {
         this._template.push([7, -1]);
      } else {
         this._template[index] = [7, -1];
      }

      this._notesDirty = true;

      return this;
   }

   /**
    * @chainable
    * @returns a copy of the chord with a flat 3,5, and 7th
    * @example
    * ```javascript
    * const chord = new Chord();
    * const copy = chord.halfDiminished();
    * console.log(copy.template); // [1, 3, [5, Modifier.flat], [7, Modifier.flat]]
    */
   public halfDiminished(): Chord {
      return this.copy().halfDiminish();
   }

   /**
    * @returns true if the chord has a flat 3,5, and 7th
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.isHalfDiminished()); // false
    * chord.halfDiminish();
    * console.log(chord.isHalfDiminished()); // true
    */
   public isHalfDiminished(): boolean {
      let third = false;
      let fifth = false;
      let seventh = false;
      for (const interval of this._template) {
         if (Array.isArray(interval)) {
            if ((interval[0] ?? 0) === 7 && (interval[1] ?? 0) === -1) {
               seventh = true;
            } else if ((interval[0] ?? 0) === 5 && (interval[1] ?? 0) === -1) {
               fifth = true;
            } else if ((interval[0] ?? 0) === 3 && (interval[1] ?? 0) === -1) {
               third = true;
            }
         }
      }

      return third && fifth && seventh;
   }

   /**
    * Mutates the chord in place
    * @chainable
    * @returns the chord with with the first note moved to the end up one octave
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.template); // [1,3,5]
    * console.log(chord.getNoteNames()); // ['C4', 'E4', 'G4']
    * chord.invert();
    * console.log(chord.template); // [3,5,1]
    * console.log(chord.getNoteNames()); // ['E4', 'G4', 'C5']
    * ```
    */
   public invert(): Chord {
      console.log(this._template[0]);
      if (Array.isArray(this._template[0])) {
         this._template[0][0] += this._baseScale.template.length;
      } else {
         this._template[0] += this._baseScale.template.length;
      }

      const newTemplate: ChordInterval[] = shift(
         this._template,
         this._template.length - 1
      );

      this._template = newTemplate;
      this._notesDirty = true;

      return this;
   }

   /**
    * @chainable
    * @returns a copy of the chord with with the first note moved to the end up one octave
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.template); // [1,3,5]
    * console.log(chord.getNoteNames()); // ['C4', 'E4', 'G4']
    * const copy = chord.inverted();
    * console.log(copy.template); // [3,5,1]
    * console.log(copy.getNoteNames()); // ['E4', 'G4', 'C5']
    * ```
    */
   public inverted(): Chord {
      return this.copy().invert();
   }

   /**
    * @returns the string form of the chord
    * @example
    * ```javascript
    * const chord = new Chord();
    * console.log(chord.toString()); // '(C4)maj'
    * ```
    */
   public toString(): string {
      const keys = Object.keys(ChordTemplates);
      const values = Object.values(ChordTemplates).map((template) =>
         JSON.stringify(template)
      );
      const index = values.indexOf(JSON.stringify(this._template));

      const prefix = `(${Semitone[this._root]}${this._octave})`;

      const str =
         index > -1 ? prefix + keys[index] : this.getNoteNames().join(",");
      return str;
   }
}

export default Chord;
