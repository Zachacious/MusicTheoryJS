import Semitone from "../Semitone";
import wrap from "../utils/wrap";
import clamp from "../utils/clamp";
import parseNote from "./noteParser";
import NoteInitializer from "./NoteInitializer";
import {
   MODIFIED_SEMITONES,
   TONES_MAX,
   TONES_MIN,
   OCTAVE_MAX,
   OCTAVE_MIN,
   DEFAULT_OCTAVE,
   DEFAULT_SEMITONE,
} from "./noteConstants";
import noteStringLookup from "./stringTable";
import { uid } from "uid";

type Props = Record<string, unknown>;
type CompositionObject = Record<string, unknown>;

type OptionalPropertyNames<T> = {
   [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never;
}[keyof T];

type SpreadProperties<L, R, K extends keyof L & keyof R> = {
   [P in K]: L[P] | Exclude<R[P], undefined>;
};

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type SpreadTwo<L, R> = Id<
   Pick<L, Exclude<keyof L, keyof R>> &
      Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>> &
      Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>> &
      SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>;

type Spread<A extends readonly [...any]> = A extends [infer L, ...infer R]
   ? SpreadTwo<L, Spread<R>>
   : unknown;

// type Foo = Spread<[{ a: string }, { a?: number }]>

function merge<A extends object[]>(...a: [...A]) {
   return Object.assign({}, ...a) as Spread<A>;
}

const compose = (self: Props, ...composables: Props[]) => {
   return Object.assign(self, ...composables);
};

const Identifiable = (self?: Props): Props => ({
   id: uid() as string,
});

type reqOctave = { octave: (octave?: number) => number | Props };
const Octave = (self: Props): Props => {
   const _this: Props = {
      _octave: DEFAULT_OCTAVE as number,
      octave: () => null,
   };

   _this.octave = (octave?: number): number | Props => {
      if (octave) {
         _this._octave = clamp(octave, OCTAVE_MIN, OCTAVE_MAX);
         return self;
      }

      return _this._octave as number;
   };

   return _this;
};

const Tonable = (self: NoteSchema): Props => {
   const _this: Props = {
      _semitone: DEFAULT_SEMITONE as Semitone,
      _prevSemitone: DEFAULT_SEMITONE as Semitone,
      semitone: () => null,
   };

   _this.semitone = (
      semitone?: Semitone
   ): Semitone | Record<string, unknown> => {
      if (semitone) {
         const wrapped = wrap(semitone, TONES_MIN, TONES_MAX);
         _this._prevSemitone = _this._semitone;
         _this._semitone = wrapped.value;
         if (self.octave)
            self.octave((self.octave() as number) + wrapped.numWraps);
         return self;
      }

      return _this._semitone as Semitone;
   };

   return _this;
};

type NoteSchema = {
   _semitone?: Semitone;
   _octave?: number;
   _prevSemitone?: Semitone;
   id?: string;
   octave?: (octave?: number) => number | Props;
   semitone?: (semitone?: Semitone) => Semitone | Props;
};

const Note = (initializer?: NoteInitializer | string) => {
   const self: NoteSchema = {
      octave: () => 0,
   };

   const note: NoteSchema = merge(
      self,
      Identifiable(),
      Octave(self),
      Tonable(self)
   );

   if (!initializer) {
      return note;
   } else if (typeof initializer === "string") {
      initializer = parseNote(initializer);
      // note.octave(initializer?.octave ?? DEFAULT_OCTAVE);
      // note.semitone = initializer?.semitone ?? DEFAULT_SEMITONE;
      // note._prevSemitone = note._tone;
   } else {
      // important that octave is set first so that
      // setting the semitone can change the octave
      // note.octave = initializer?.octave ?? DEFAULT_OCTAVE;
      // note.semitone = initializer?.semitone ?? DEFAULT_SEMITONE;
      // note._prevSemitone = note._tone;
   }

   return note;
};

export default Note;
