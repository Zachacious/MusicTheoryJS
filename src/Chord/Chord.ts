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
import { debounce } from "ts-debounce";
import isEqual from "../utils/isEqual";
import parseChord from "./chordNameParser";

class Chord implements Entity {
   constructor(values?: ChordInitializer) {
      if (!values) {
         this._template = DEFAULT_CHORD_TEMPLATE;
         this.octave = DEFAULT_OCTAVE;
         this.root = DEFAULT_SEMITONE;
      } else if (typeof values === "string") {
         const parsed = parseChord(values);
         this._template = [...(parsed?.template ?? DEFAULT_CHORD_TEMPLATE)];
         this.octave = parsed?.octave ?? DEFAULT_OCTAVE;
         this.root = parsed?.root ?? DEFAULT_SEMITONE;
      } else {
         this._template = values.template ?? DEFAULT_CHORD_TEMPLATE;
         this.octave = values.octave ?? DEFAULT_OCTAVE;
         this.root = values.root ?? DEFAULT_SEMITONE;
      }

      this._baseScale = new Scale({ key: this._root });

      this.generateNotes();
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
      this.generateNotes();
   }

   _baseScale: Scale = DEFAULT_SCALE;
   get baseScale(): Scale {
      return this._baseScale;
   }

   set baseScale(value: Scale) {
      this._baseScale = value;
      this.generateNotes();
   }

   _octave: number = DEFAULT_OCTAVE;

   get octave(): number {
      return this._octave;
   }

   set octave(value: number) {
      this._octave = clamp(value, OCTAVE_MIN, OCTAVE_MAX);
      this._baseScale.octave = this._octave;
      this.generateNotes();
   }

   private _template: ChordInterval[] = [];
   public get template(): ChordInterval[] {
      return [...this._template];
   }

   public set template(value: ChordInterval[]) {
      this._template = [...value];
      this.generateNotes();
   }

   //**********************************************************
   /**
    * notes
    * notes are generated and cached as needed
    */
   //**********************************************************
   private _notes: Array<Note> = [];
   public get notes(): Array<Note> {
      return this._notes;
   }

   private _generateNotes(): Note[] {
      console.log("generating notes");
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

   protected generateNotes = debounce(this._generateNotes, 10, {
      isImmediate: true,
   });

   public getNoteNames(): string[] {
      const notes = [];
      const scaleNoteNames = this._baseScale.getNoteNames();
      for (const interval of this._template) {
         let tone = 0;
         if (Array.isArray(interval)) {
            tone = interval[0];
         } else {
            tone = interval;
         }
         const offset = tone;
         const note = scaleNoteNames[offset - 1];

         notes.push(note);
      }

      return notes;
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

      this.generateNotes();

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

      this.generateNotes();

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

      this.generateNotes();

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
      const newTemplate: ChordInterval[] = [];
      for (const interval of this._template) {
         if (Array.isArray(interval)) {
            newTemplate.push([interval[0], -interval[1]]);
         } else {
            newTemplate.push(-interval);
         }
      }

      this._template = newTemplate;
      this.generateNotes();

      return this;
   }
}

export default Chord;
