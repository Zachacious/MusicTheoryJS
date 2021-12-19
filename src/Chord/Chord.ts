import Entity from "../Entity";
import { uid } from "uid";
import { Modifier, Semitone } from "..";
import { DEFAULT_SEMITONE, TONES_MAX, TONES_MIN } from "../Note/noteConstants";
import { DEFAULT_OCTAVE, OCTAVE_MAX, OCTAVE_MIN } from "../Note/noteConstants";
import wrap from "../utils/wrap";
import clamp from "../utils/clamp";
import ChordInitializer from "./ChordInitializer";
import Note from "../Note/Note";
import { DEFAULT_CHORD_TEMPLATE } from "./ChordConstants";
import { getNameForSemitone, getWholeToneFromName } from "../Semitone";
import ChordInterval from "./ChordInterval";

class Chord implements Entity {
   constructor(values?: ChordInitializer) {
      if (!values) {
         this._template = DEFAULT_CHORD_TEMPLATE;
         this.octave = DEFAULT_OCTAVE;
         this.root = DEFAULT_SEMITONE;
      } else {
         this._template = values.template ?? DEFAULT_CHORD_TEMPLATE;
         this.octave = values.octave ?? DEFAULT_OCTAVE;
         this.root = values.root ?? DEFAULT_SEMITONE;
      }

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

   _octave: number = DEFAULT_OCTAVE;

   get octave(): number {
      return this._octave;
   }

   set octave(value: number) {
      this._octave = clamp(value, OCTAVE_MIN, OCTAVE_MAX);
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

   public generateNotes() {
      this._notes = [];
      const wholeNotes = ["C", "D", "E", "F", "G", "A", "B"];
      const rootWholeName: string = getNameForSemitone(this._root);
      const rootIndex: number = wholeNotes.indexOf(rootWholeName?.[0]);
      for (const interval of this._template) {
         let tone: Semitone = 0;
         let mod: Modifier = 0;
         if (Array.isArray(interval)) {
            tone = interval?.[0] ?? 0;
            mod = interval?.[1] ?? 0;
         } else {
            tone = interval;
         }
         const wrapped = wrap(rootIndex + tone, 0, 7);
         const note = new Note({
            semitone: getWholeToneFromName(wholeNotes[wrapped.value]) + mod,
            octave: this._octave + wrapped.numWraps,
         });
         this._notes.push(note);
      }
   }

   public copy(): Chord {
      return new Chord({ root: this.root, octave: this.octave });
   }

   public equals(other: Chord): boolean {
      return this.root === other.root && this.octave === other.octave;
   }
}

export default Chord;
