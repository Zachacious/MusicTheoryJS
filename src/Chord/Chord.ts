import Entity from "../Entity";
import { uid } from "uid";
import { Semitone } from "..";
import { DEFAULT_SEMITONE, TONES_MAX, TONES_MIN } from "../Note/noteConstants";
import { DEFAULT_OCTAVE, OCTAVE_MAX, OCTAVE_MIN } from "../Note/noteConstants";
import wrap from "../utils/wrap";
import clamp from "../utils/clamp";
import ChordInitializer from "./ChordInitializer";
import Note from "../Note/Note";
import { DEFAULT_CHORD_TEMPLATE, DEFAULT_SCALE } from "./ChordConstants";
// import { getNameForSemitone, getWholeToneFromName } from "../Semitone";
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

   //**********************************************************
   /**
    * unique id for this instance
    */
   //**********************************************************
   id: string = uid();

   _root: Semitone = DEFAULT_SEMITONE;

   get root(): Semitone {
      return this._root;
   }

   set root(value: Semitone) {
      // this._root = value;
      const wrapped = wrap(value, TONES_MIN, TONES_MAX);
      this._root = wrapped.value;
      this._octave = this._octave + wrapped.numWraps;
      this._notesDirty = true;
   }

   _baseScale: Scale = DEFAULT_SCALE;
   get baseScale(): Scale {
      return this._baseScale;
   }

   set baseScale(value: Scale) {
      this._baseScale = value;
      this._baseScale.octave = this._octave;
      this._notesDirty = true;
   }

   _octave: number = DEFAULT_OCTAVE;

   get octave(): number {
      return this._octave;
   }

   set octave(value: number) {
      this._octave = clamp(value, OCTAVE_MIN, OCTAVE_MAX);
      this._baseScale.octave = this._octave;
      this._notesDirty = true;
   }

   protected _template: ChordInterval[] = [];
   public get template(): ChordInterval[] {
      return [...this._template];
   }

   public set template(value: ChordInterval[]) {
      this._template = [...value];
      this._notesDirty = true;
   }

   //**********************************************************
   /**
    * notes
    * notes are generated and cached as needed
    */
   //**********************************************************
   protected _notes: Array<Note> = [];
   protected _notesDirty: boolean = true;
   public get notes(): Array<Note> {
      if (this._notesDirty) {
         this.generateNotes();
         this._notesDirty = false;
      }
      return this._notes;
   }

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

   public getNoteNames(): string[] {
      const noteNames: string[] = [];
      for (const note of this.notes) {
         noteNames.push(note.toString());
      }
      return noteNames;
   }

   public copy(): Chord {
      return new Chord({
         root: this.root,
         octave: this.octave,
         template: [...this._template],
      });
   }

   public equals(other: Chord): boolean {
      return (
         this.root === other.root &&
         this.octave === other.octave &&
         isEqual(this._template, other.template)
      );
   }

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

   public augmented(): Chord {
      return this.copy().augment();
   }

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

   public diminished(): Chord {
      return this.copy().diminish();
   }

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

   public halfDiminish(): Chord {
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

   public halfDiminished(): Chord {
      return this.copy().halfDiminish();
   }

   public isHalfDiminished(): boolean {
      for (const interval of this._template) {
         if (Array.isArray(interval)) {
            if ((interval[0] ?? 0) === 7 && (interval[1] ?? 0) === -1) {
               return true;
            }
         }
      }

      return false;
   }

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
}

export default Chord;
