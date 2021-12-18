(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
   typeof define === 'function' && define.amd ? define(['exports'], factory) :
   (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.MusicTheory = {}));
})(this, (function (exports) { 'use strict';

   //**********************************************************
   /**
    * Notes starting at C0 - zero index - 12 total
    */
   //**********************************************************
   var Semitone;
   (function (Semitone) {
       Semitone[Semitone["A"] = 9] = "A";
       Semitone[Semitone["As"] = 10] = "As";
       Semitone[Semitone["Bb"] = 10] = "Bb";
       Semitone[Semitone["B"] = 11] = "B";
       Semitone[Semitone["Bs"] = 0] = "Bs";
       Semitone[Semitone["Cb"] = 11] = "Cb";
       Semitone[Semitone["C"] = 0] = "C";
       Semitone[Semitone["Cs"] = 1] = "Cs";
       Semitone[Semitone["Db"] = 1] = "Db";
       Semitone[Semitone["D"] = 2] = "D";
       Semitone[Semitone["Ds"] = 3] = "Ds";
       Semitone[Semitone["Eb"] = 3] = "Eb";
       Semitone[Semitone["E"] = 4] = "E";
       Semitone[Semitone["Es"] = 5] = "Es";
       Semitone[Semitone["Fb"] = 4] = "Fb";
       Semitone[Semitone["F"] = 5] = "F";
       Semitone[Semitone["Fs"] = 6] = "Fs";
       Semitone[Semitone["Gb"] = 6] = "Gb";
       Semitone[Semitone["G"] = 7] = "G";
       Semitone[Semitone["Gs"] = 8] = "Gs";
       Semitone[Semitone["Ab"] = 8] = "Ab";
   })(Semitone || (Semitone = {}));
   //**********************************************************
   /**
    * Returns the whole note name (e.g. C, D, E, F, G, A, B) for
    * the given string
    */
   //**********************************************************
   const getWholeToneFromName = (name) => {
       if (!name || name.length === 0 || name.length > 1)
           throw new Error("Invalid name");
       const key = name[0].toUpperCase();
       return Semitone[key];
   };
   var Semitone$1 = Semitone;

   //**************************************************
   //Wraps a number between a min and max value.
   // ************************************************
   const wrap = (value, lower, upper) => {
       // copies
       let val = value;
       let lbound = lower;
       let ubound = upper;
       // if the bounds are inverted, swap them here
       if (upper < lower) {
           lbound = upper;
           ubound = lower;
       }
       // the amount needed to move the range and value to zero
       const zeroOffset = 0 - lbound;
       // offset the values so that the lower bound is zero
       lbound += zeroOffset;
       ubound += zeroOffset;
       val += zeroOffset;
       // compute the number of times the value will wrap
       let wraps = Math.trunc(val / ubound);
       // case: -1 / ubound(>0) will equal 0 although it wraps once
       if (wraps === 0 && val < lbound)
           wraps = -1;
       // case: ubound and value are the same val/ubound = 1 but actually doesnt wrap
       if (wraps === 1 && val === ubound)
           wraps = 0;
       // needed to handle the case where the num of wraps is 0 or 1 or -1
       let valOffset = 0;
       let wrapOffset = 0;
       if (wraps >= -1 && wraps <= 1)
           wrapOffset = 1;
       // if the value is below the range
       if (val < lbound) {
           valOffset = (val % ubound) + wrapOffset;
           val = ubound + valOffset;
           // if the value is above the range
       }
       else if (val > ubound) {
           valOffset = (val % ubound) - wrapOffset;
           val = lbound + valOffset;
       }
       // add the offset from zero back to the value
       val -= zeroOffset;
       return {
           value: val,
           numWraps: wraps,
       };
   };

   const clamp = (pNum, pLower, pUpper) => Math.max(Math.min(pNum, Math.max(pLower, pUpper)), Math.min(pLower, pUpper));

   //**********************************************************
   // Constants
   //**********************************************************
   const MODIFIED_SEMITONES = [1, 3, 4, 6, 8, 10];
   const TONES_MAX = 11;
   const TONES_MIN = 0;
   const OCTAVE_MAX = 9;
   const OCTAVE_MIN = 0;
   const DEFAULT_OCTAVE = 4;
   const DEFAULT_SEMITONE = 0;

   var Modifier;
   (function (Modifier) {
       Modifier[Modifier["FLAT"] = -1] = "FLAT";
       Modifier[Modifier["NATURAL"] = 0] = "NATURAL";
       Modifier[Modifier["SHARP"] = 1] = "SHARP";
   })(Modifier || (Modifier = {}));
   const parseModifier = (modifier) => {
       switch (modifier) {
           case "b":
           case "flat":
               return Modifier.FLAT;
           case "#":
           case "s":
           case "sharp":
               return Modifier.SHARP;
           default:
               return Modifier.NATURAL;
       }
   };
   var Modifier$1 = Modifier;

   const initializers = [];
   const registerInitializer = (initializer) => {
       if (!initializer)
           throw new Error("Initializer must be a function");
       initializers.push(initializer);
   };
   const init = (initCB) => {
       for (const initializer of initializers) {
           initializer();
       }
       // initializers.forEach(async (initializer) => await initializer());
       if (initCB)
           initCB();
   };
   const initAsync = async (initCB) => {
       for (const initializer of initializers) {
           initializer();
       }
       // initializers.forEach(async (initializer) => await initializer());
       if (initCB)
           initCB();
   };

   //**********************************************************
   /**
    * Regex for matching note name, modifier, and octave
    */
   //**********************************************************
   const nameRegex$1 = /([A-G])/g;
   const modifierRegex$1 = /(#|s|b)/g;
   const octaveRegex$1 = /([0-9]+)/g;
   //**********************************************************
   /**
    * attempts to parse a note from a string
    */
   //**********************************************************
   const parseNote = (note, supressWarning = false) => {
       try {
           const result = noteLookup(note);
           if (result) {
               return result;
           }
           if (!supressWarning)
               console.warn(`Ineffecient note string formatting - ${note}. Get a performanc increase by using the format [A-G][#|s|b][0-9]`);
       }
       catch (err) {
           if (!supressWarning)
               console.warn(`Ineffecient note string formatting - ${note}. Get a performanc increase by using the format [A-G][#|s|b][0-9]`);
       }
       let noteIdenifier = "";
       let noteModifier = 0;
       let noteOctave = "";
       const nameMatch = note.match(nameRegex$1)?.join("").split("");
       const modifierMatch = note.match(modifierRegex$1)?.join("").split("");
       const octaveMatch = note.match(octaveRegex$1)?.join("").split("");
       // combine all modifiers
       if (modifierMatch) {
           if (modifierMatch.length > 1) {
               // combine all modifiers into an offeset value to be added to the semitone
               noteModifier = modifierMatch
                   .map((item) => parseModifier(item))
                   .reduce((a, b) => a + b);
           }
           else {
               noteModifier = parseModifier(modifierMatch[0]);
           }
       }
       if (octaveMatch) {
           const [octave] = octaveMatch;
           noteOctave = octave;
       }
       if (nameMatch) {
           const [noteName] = nameMatch;
           noteIdenifier = noteName;
           let modifier = 0;
           if (noteModifier)
               modifier = noteModifier;
           const wrappedTone = wrap(getWholeToneFromName(noteIdenifier) + modifier, TONES_MIN, TONES_MAX);
           const semitone = wrappedTone.value;
           let octave = 4;
           if (noteOctave)
               octave = clamp(parseInt(noteOctave, 10), OCTAVE_MIN, OCTAVE_MAX);
           return {
               semitone: semitone,
               octave: octave,
           };
       }
       throw new Error(`Invalid note: ${note}`);
   };
   //**********************************************************
   /**
    * creates a lookup table for all notes formatted as [A-G][#|b|s][0-9]
    */
   //**********************************************************
   const createTable$3 = () => {
       const noteTable = {};
       const noteLetters = ["A", "B", "C", "D", "E", "F", "G"];
       const noteModifiers = ["b", "#", "s"];
       for (const noteLabel of noteLetters) {
           noteTable[noteLabel] = parseNote(noteLabel, true); // 'C' for example
           for (let iModifierOuter = 0; iModifierOuter < noteModifiers.length; ++iModifierOuter) {
               const key = `${noteLabel}${noteModifiers[iModifierOuter]}`;
               noteTable[key] = parseNote(key, true); // 'C#' for example
           }
           for (let iOctave = OCTAVE_MIN; iOctave < OCTAVE_MAX; ++iOctave) {
               const key = `${noteLabel}${iOctave}`;
               noteTable[key] = parseNote(key, true); // 'C4' for example
               for (let iModifier = 0; iModifier < noteModifiers.length; ++iModifier) {
                   const key = `${noteLabel}${noteModifiers[iModifier]}${iOctave}`;
                   noteTable[key] = parseNote(key, true); // 'C#4' for example
               }
           }
       }
       return noteTable;
   };
   //**********************************************************
   /**
    * creates the lookup table as soon as the module is loaded
    */
   //**********************************************************
   let _noteLookup = {};
   const noteLookup = (key) => {
       if (!_noteLookup) {
           _noteLookup = createTable$3();
       }
       return _noteLookup[key];
   };
   registerInitializer(() => {
       _noteLookup = createTable$3();
   });

   const UNKNOWN_MODIFIER_NOTE_STRINGS = [
       "C",
       "C#/Db",
       "D",
       "D#/Eb",
       "E",
       "F",
       "F#/Gb",
       "G",
       "G#/Ab",
       "A",
       "A#/Bb",
       "B",
   ];
   const SHARP_NOTE_STRINGS = [
       "C",
       "C#",
       "D",
       "D#",
       "E",
       "F",
       "F#",
       "G",
       "G#",
       "A",
       "A#",
       "B",
   ];
   const FLAT_MODIFIER_NOTE_STRINGS = [
       "C",
       "Db",
       "D",
       "Eb",
       "E",
       "F",
       "Gb",
       "G",
       "Ab",
       "A",
       "Bb",
       "B",
   ];
   const createTable$2 = () => {
       const table = {};
       for (let iTone = TONES_MIN; iTone <= TONES_MAX; ++iTone) {
           for (let iPrev = TONES_MIN; iPrev <= TONES_MAX; ++iPrev) {
               // for (let iOctave = OCTAVE_MIN; iOctave <= OCTAVE_MAX; iOctave++) {
               let modifier = "";
               if (MODIFIED_SEMITONES.includes(iTone)) {
                   modifier = "-"; // has an unknown modifier
                   // if is flat
                   if (wrap(iTone + 1, TONES_MIN, TONES_MAX).value === iPrev)
                       modifier = "b";
                   // is sharp
                   if (wrap(iTone - 1, TONES_MIN, TONES_MAX).value === iPrev)
                       modifier = "#";
               }
               // get note name from table
               table[`${iTone}-${iPrev}`] = getNoteLabel(iTone, modifier);
           }
           // }
       }
       return table;
   };
   const getNoteLabel = (tone, modifier) => {
       switch (modifier) {
           case "#":
               return SHARP_NOTE_STRINGS[tone];
           case "b":
               return FLAT_MODIFIER_NOTE_STRINGS[tone];
           case "-":
           default:
               return UNKNOWN_MODIFIER_NOTE_STRINGS[tone];
           // default:
           //    return `${Semitone[tone]}`;
       }
   };
   let _noteStringLookup = {};
   const noteStringLookup = (key) => {
       if (!_noteStringLookup) {
           _noteStringLookup = createTable$2();
       }
       return _noteStringLookup[key];
   };
   registerInitializer(() => {
       _noteStringLookup = createTable$2();
   });

   var IDX=256, HEX=[], SIZE=256, BUFFER;
   while (IDX--) HEX[IDX] = (IDX + 256).toString(16).substring(1);

   function uid(len) {
   	var i=0, tmp=(len || 11);
   	if (!BUFFER || ((IDX + tmp) > SIZE*2)) {
   		for (BUFFER='',IDX=0; i < SIZE; i++) {
   			BUFFER += HEX[Math.random() * 256 | 0];
   		}
   	}

   	return BUFFER.substring(IDX, IDX++ + tmp);
   }

   // import Identifiable from "../composables/Identifiable";
   //**********************************************************
   /**
    * A musical note.
    * The primary fields are the semitone and octave.
    * The octave is clamped to the range [0, 9].
    * Setting the semitone to a value outside of the range [0, 11] will
    * wrap the semitone to the range [0, 11] and change the octave depending
    * on how many times the semitone has been wrapped.
    */
   //**********************************************************
   // @Identifiable() // generates a unique id for each instance - retrieve with id()
   class Note {
       //**********************************************************
       /**
        * Creates a new Note instance.
        */
       //**********************************************************
       constructor(values) {
           if (!values) {
               this.octave = DEFAULT_OCTAVE;
               this.semitone = DEFAULT_SEMITONE;
           }
           else if (typeof values === "string") {
               values = parseNote(values);
               this.octave = values?.octave ?? DEFAULT_OCTAVE;
               this.semitone = values?.semitone ?? DEFAULT_SEMITONE;
               this._prevSemitone = this._tone;
           }
           else {
               // important that octave is set first so that
               // setting the semitone can change the octave
               this.octave = values?.octave ?? DEFAULT_OCTAVE;
               this.semitone = values?.semitone ?? DEFAULT_SEMITONE;
               this._prevSemitone = this._tone;
           }
       }
       //**********************************************************
       /**
        * unique id for this instance
        */
       //**********************************************************
       id = uid();
       //**********************************************************
       /**
        * semitone
        */
       //**********************************************************
       _tone = DEFAULT_SEMITONE;
       _prevSemitone = DEFAULT_SEMITONE;
       get semitone() {
           return this._tone;
       }
       //**********************************************************
       /**
        * setting the semitone with a number outside the
        * range of 0-11 will wrap the value around and
        * change the octave accordingly
        */
       //**********************************************************
       set semitone(semitone) {
           const wrapped = wrap(semitone, TONES_MIN, TONES_MAX);
           this._prevSemitone = this._tone;
           this._tone = wrapped.value;
           this._octave = this._octave + wrapped.numWraps;
       }
       //**********************************************************
       /**
        * octave
        */
       //**********************************************************
       _octave = DEFAULT_OCTAVE;
       get octave() {
           return this._octave;
       }
       //**********************************************************
       /**
        * The octave is clamped to the range [0, 9].
        */
       //**********************************************************
       set octave(octave) {
           this._octave = clamp(octave, OCTAVE_MIN, OCTAVE_MAX);
       }
       //**********************************************************
       /**
        * Returns a new note that is a sharpened version of this note.
        * This is chainable - A().sharp().flat()
        */
       //**********************************************************
       sharp() {
           return new Note({
               semitone: this.semitone,
               octave: this.octave,
           }).sharpen();
       }
       //**********************************************************
       /**
        * Sharpens the note in place.
        * Returns itself for chaining - A().sharpen().sharp()
        */
       //**********************************************************
       sharpen() {
           this.semitone = this.semitone + 1;
           return this;
       }
       //**********************************************************
       /**
        *  attempts to determine if the note is sharp
        */
       //**********************************************************
       isSharp() {
           // if note is whole, it can't be sharp
           const modified = MODIFIED_SEMITONES.includes(this.semitone);
           if (!modified)
               return false;
           // if note is flat, it can't be sharp
           if (wrap(this.semitone + 1, TONES_MIN, TONES_MAX).value ===
               this._prevSemitone)
               return false; //is flat
           // Doesn't neccecarily mean it's sharp, but it's a good guess at this point
           return true;
       }
       //**********************************************************
       /**
        * Returns a new note that is a flattened version of this note.
        * This is chainable - A().flat().flat()
        */
       //**********************************************************
       flat() {
           return new Note({
               semitone: this.semitone,
               octave: this.octave,
           }).flatten();
       }
       //**********************************************************
       /**
        * Flattens the note in place.
        * Returns itself for chaining - A().flatten().flat()
        */
       //**********************************************************
       flatten() {
           this.semitone = this.semitone - 1;
           return this;
       }
       //**********************************************************
       /**
        *  attempts to determine if the note is flat
        */
       //**********************************************************
       isFlat() {
           // if note is whole, it can't be sharp
           const modified = MODIFIED_SEMITONES.includes(this.semitone);
           if (!modified)
               return false;
           // if note is sharp, it can't be flat
           if (wrap(this.semitone - 1, TONES_MIN, TONES_MAX).value ===
               this._prevSemitone)
               return false; //is sharp
           // Doesn't neccecarily mean it's flat, but it's a good guess at this point
           return true;
       }
       //**********************************************************
       /**
        * Returns true if this note is equal to the given note
        */
       //**********************************************************
       equals(note) {
           return this.semitone === note.semitone && this.octave === note.octave;
       }
       //**********************************************************
       /**
        * Returns a copy of this note
        */
       //**********************************************************
       copy() {
           return new Note({
               semitone: this.semitone,
               octave: this.octave,
           });
       }
       //**********************************************************
       /**
        * Returns a string version of this note
        */
       //**********************************************************
       toString() {
           // console.log(noteStringLookup);
           return (noteStringLookup(`${this._tone}-${this._prevSemitone}`) +
               `${this._octave}`);
       }
       //**********************************************************
       /**
        * Static methods to create whole notes easily.
        * the default octave is 4
        */
       //**********************************************************
       static A(octave = 4) {
           return new Note({
               semitone: Semitone$1.A,
               octave,
           });
       }
       static B(octave = 4) {
           return new Note({
               semitone: Semitone$1.B,
               octave,
           });
       }
       static C(octave = 4) {
           return new Note({
               semitone: Semitone$1.C,
               octave,
           });
       }
       static D(octave = 4) {
           return new Note({
               semitone: Semitone$1.D,
               octave,
           });
       }
       static E(octave = 4) {
           return new Note({
               semitone: Semitone$1.E,
               octave,
           });
       }
       static F(octave = 4) {
           return new Note({
               semitone: Semitone$1.F,
               octave,
           });
       }
       static G(octave = 4) {
           return new Note({
               semitone: Semitone$1.G,
               octave,
           });
       }
   }

   //**********************************************************
   /**
    * Constants
    */
   //**********************************************************
   const MIDIKEY_START = 12;
   const NUM_OCTAVES = 10;
   const NUM_SEMITONES = 12;
   //**********************************************************
   /**
    * Calculates the midi key for a given octave and semitone.
    */
   //**********************************************************
   const calcMidiKey = (octave, semitone) => MIDIKEY_START + octave * NUM_SEMITONES + semitone;
   //**********************************************************
   /**
    * Calculates the frequency for a given octave and semitone given
    * a tuning for a4.
    */
   //**********************************************************
   const calcFrequency = (midiKey, a4Tuning) => 2 ** ((midiKey - 69) / 12) * a4Tuning;
   //**********************************************************
   /**
    * Creates and return lookup tables for midikey and frequency.
    */
   //**********************************************************
   const createTables = (a4Tuning = 440) => {
       //**********************************************************
       /**
        * Maps octave and semitone to note frequency(hertz).
        * requires a key in the form of `<octave>-<semitone>`
        */
       //**********************************************************
       const freqTable = {};
       //**********************************************************
       /**
        * Maps octave and semitone to midi key.
        * requires a key in the form of `<octave>-<semitone>`
        */
       //**********************************************************
       const midiTable = {};
       let iOctave = 0;
       let iSemitone = 0;
       for (iOctave = 0; iOctave < NUM_OCTAVES; ++iOctave) {
           for (iSemitone = 0; iSemitone < NUM_SEMITONES; ++iSemitone) {
               const key = `${iOctave}-${iSemitone}`;
               const mkey = calcMidiKey(iOctave, iSemitone);
               const freq = calcFrequency(mkey, a4Tuning);
               midiTable[key] = mkey;
               freqTable[key] = freq;
           }
       }
       return {
           freqLookup: freqTable,
           midiLookup: midiTable,
       };
   };

   // import Identifiable from "../composables/Identifiable";
   //**********************************************************
   /**
    * Tuning component used by Instrument class
    * - containes the a4 tuning - default is 440Hz
    * - builds lookup tables for midi key and frequency
    * - based on the tuning
    */
   //**********************************************************
   // @Identifiable()
   class Tuning {
       /**
        * Creates the object and builds the lookup tables.
        */
       constructor(a4Freq = 440) {
           this._a4 = a4Freq;
           this.buildTables();
       }
       //**********************************************************
       /**
        * unique id for this instance
        */
       //**********************************************************
       id = uid();
       copy() {
           return new Tuning(this._a4);
       }
       equals(other) {
           return this._a4 === other._a4;
       }
       //**********************************************************
       /**
        * a4 Tuning
        */
       //**********************************************************
       _a4 = 440;
       get a4() {
           return this._a4;
       }
       //**********************************************************
       /**
        * setting the tuning will rebuild the lookup tables
        */
       //**********************************************************
       set a4(value) {
           this._a4 = value;
           this.buildTables();
       }
       //**********************************************************
       /**
        * lookup table for midi key
        */
       //**********************************************************
       _midiKeyTable = {};
       midiKeyLookup(octave, semitone) {
           const key = `${octave}-${semitone}`;
           return this._midiKeyTable[key];
       }
       //**********************************************************
       /**
        * lookup table for frequency
        */
       //**********************************************************
       _freqTable = {};
       freqLookup(octave, semitone) {
           const key = `${octave}-${semitone}`;
           return this._freqTable[key];
       }
       //**********************************************************
       /**
        * Builds the lookup tables for midi key and frequency
        */
       //**********************************************************
       buildTables() {
           const tables = createTables(this._a4);
           this._midiKeyTable = tables.midiLookup;
           this._freqTable = tables.freqLookup;
       }
       //**********************************************************
       /**
        * returns the tuning as a string
        */
       //**********************************************************
       toString() {
           return `Tuning(${this._a4})`;
       }
   }

   //**********************************************************
   /**
    * Instrument class - used to represent an instrument
    * used to encapsulate the tuning and retrieving midi keys
    * and frequencies for notes
    */
   //**********************************************************
   // @Identifiable() // generates a unique id for each instance - use id() to get it
   class Instrument {
       tuning;
       //**********************************************************
       /**
        * creates a new instance of an instrument with the given tuning or 440hz
        */
       //**********************************************************
       constructor(a4Freq = 440) {
           this.tuning = new Tuning(a4Freq);
       }
       //**********************************************************
       /**
        * unique id for this instance
        */
       //**********************************************************
       id = uid();
       copy() {
           return new Instrument(this.tuning.a4);
       }
       equals(other) {
           return this.tuning.equals(other.tuning);
       }
       //**********************************************************
       /**
        * returns the frequency of the given note
        */
       //**********************************************************
       getFrequency(note) {
           return this.tuning.freqLookup(note.octave, note.semitone);
       }
       //**********************************************************
       /**
        * returns the midi key of the given note
        */
       //**********************************************************
       getMidiKey(note) {
           return this.tuning.midiKeyLookup(note.octave, note.semitone);
       }
       //**********************************************************
       /**
        * returns the tuning as a string
        */
       //**********************************************************
       toString() {
           return `Instrument Tuning(${this.tuning.a4})`;
       }
   }

   const DEFAULT_SCALE_TEMPLATE = [0, 2, 2, 1, 2, 2, 2]; // major
   Object.freeze(DEFAULT_SCALE_TEMPLATE);

   const ScaleTemplates = {
       wholeTone: [0, 2, 2, 2, 2, 2, 2],
       // major
       major: [0, 2, 2, 1, 2, 2, 2],
       major7s4s5: [0, 2, 2, 2, 2, 1, 2],
       // modes
       // ionian: [], // set below - same as major
       // aeolian: [], // set below - same as minor
       dorian: [0, 2, 1, 2, 2, 2, 1],
       phrygian: [0, 1, 2, 2, 2, 1, 2],
       lydian: [0, 2, 2, 2, 1, 2, 2],
       lydianDominant: [0, 2, 2, 2, 1, 2, 1],
       // acoustic: [], // set below - same as lydianDominant
       mixolydian: [0, 2, 2, 1, 2, 2, 1],
       mixolydianFlat6: [0, 2, 2, 1, 2, 1, 2],
       locrian: [0, 1, 2, 2, 1, 2, 2],
       superLocrian: [0, 1, 2, 1, 2, 2, 2],
       // minor
       minor: [0, 2, 1, 2, 2, 1, 2],
       minor7b9: [0, 1, 2, 2, 2, 2, 1],
       minor7b5: [0, 2, 1, 2, 1, 2, 2],
       // halfDiminished: [], // set below - same as minor7b5
       // harmonic
       harmonicMajor: [0, 2, 2, 1, 2, 1, 3],
       harmonicMinor: [0, 2, 1, 2, 2, 1, 3],
       doubleHarmonic: [0, 1, 3, 1, 2, 1, 3],
       // byzantine: [], // set below - same as doubleHarmonic
       // melodic
       melodicMinorAscending: [0, 2, 1, 2, 2, 2, 2],
       melodicMinorDescending: [0, 2, 2, 1, 2, 2, 1],
       // pentatonic
       majorPentatonic: [0, 2, 2, 3, 2],
       majorPentatonicBlues: [0, 2, 1, 1, 3, 2],
       minorPentatonic: [0, 3, 2, 2, 3],
       minorPentatonicBlues: [0, 3, 2, 1, 1, 3],
       b5Pentatonic: [0, 3, 2, 1, 4, 2],
       minor6Pentatonic: [0, 3, 2, 2, 2, 3],
       // enigmatic
       enigmaticMajor: [0, 1, 3, 2, 2, 2, 1],
       enigmaticMinor: [0, 1, 2, 3, 1, 3, 1],
       // 8Tone
       dim8Tone: [0, 2, 1, 2, 1, 2, 1, 2],
       dom8Tone: [0, 1, 2, 1, 2, 1, 2, 1],
       // neapolitan
       neapolitanMajor: [0, 1, 2, 2, 2, 2, 2],
       neapolitanMinor: [0, 1, 2, 2, 2, 1, 3],
       // hungarian
       hungarianMajor: [0, 3, 1, 2, 1, 2, 1],
       hungarianMinor: [0, 2, 1, 3, 1, 1, 3],
       hungarianGypsy: [0, 1, 3, 1, 2, 1, 3],
       // spanish
       spanish: [0, 1, 2, 1, 2, 2, 2],
       spanish8Tone: [0, 1, 2, 1, 1, 1, 2, 2],
       // jewish: [], // set below - same as spanish8Tone
       spanishGypsy: [0, 1, 3, 1, 2, 1, 2],
       // aug dom
       augmented: [0, 3, 1, 3, 1, 3, 1],
       dominantSuspended: [0, 2, 3, 2, 2, 1, 2],
       // bebop
       bebopMajor: [0, 2, 2, 1, 2, 1, 1, 2],
       bebopDominant: [0, 2, 2, 1, 2, 2, 1, 1],
       mystic: [0, 2, 2, 2, 3, 2],
       overtone: [0, 2, 2, 2, 1, 1, 2],
       leadingTone: [0, 2, 2, 2, 2, 2, 1],
       // japanese
       hirojoshi: [0, 2, 1, 4, 1],
       japaneseA: [0, 1, 4, 1, 3],
       japaneseB: [0, 2, 3, 1, 3],
       // cultures
       oriental: [0, 1, 3, 1, 1, 3, 1],
       persian: [0, 1, 4, 1, 2, 3],
       arabian: [0, 2, 2, 1, 1, 2, 2],
       balinese: [0, 1, 2, 4, 1],
       kumoi: [0, 2, 1, 4, 2, 2],
       pelog: [0, 1, 2, 3, 1, 1],
       algerian: [0, 2, 1, 2, 1, 1, 1, 3],
       chinese: [0, 4, 2, 1, 4],
       mongolian: [0, 2, 2, 3, 2],
       egyptian: [0, 2, 3, 2, 3],
       romainian: [0, 2, 1, 3, 1, 2, 1],
       hindu: [0, 2, 2, 1, 2, 1, 2],
       insen: [0, 1, 4, 2, 3],
       iwato: [0, 1, 4, 1, 4],
       scottish: [0, 2, 3, 2, 2],
       yo: [0, 3, 2, 2, 3],
       istrian: [0, 1, 2, 2, 2, 1, 2],
       ukranianDorian: [0, 2, 1, 3, 1, 2, 1],
       petrushka: [0, 1, 3, 2, 1, 3],
       ahavaraba: [0, 1, 3, 1, 2, 1, 2],
   };
   // duplicates with aliases
   ScaleTemplates.halfDiminished = ScaleTemplates.minor7b5;
   ScaleTemplates.jewish = ScaleTemplates.spanish8Tone;
   ScaleTemplates.byzantine = ScaleTemplates.doubleHarmonic;
   ScaleTemplates.acoustic = ScaleTemplates.lydianDominant;
   ScaleTemplates.aeolian = ScaleTemplates.minor;
   ScaleTemplates.ionian = ScaleTemplates.major;
   Object.keys(ScaleTemplates).forEach((element) => Object.freeze(ScaleTemplates[element]));

   //**********************************************************
   /**
    * Regex for matching note name, modifier, and octave
    */
   //**********************************************************
   const nameRegex = /([A-G])(?![^(]*\))/g;
   const modifierRegex = /(#|s|b)(?![^(]*\))/g;
   const octaveRegex = /([0-9]+)(?![^(]*\))/g;
   const scaleNameRegex = /(\([a-zA-Z]{2,}\))/g;
   //**********************************************************
   /**
    * attempts to parse a note from a string
    */
   //**********************************************************
   const parseScale = (scale, supressWarning = false) => {
       try {
           const result = scaleLookup(scale);
           if (result) {
               return result;
           }
           if (!supressWarning)
               console.warn(`Ineffecient scale string formatting - ${scale}. Get a performanc increase by using a valid format`);
       }
       catch (err) {
           if (!supressWarning)
               console.warn(`Ineffecient scale string formatting - ${scale}. Get a performanc increase by using a valid format`);
       }
       let noteIdenifier = "";
       let noteModifier = 0;
       let noteOctave = "";
       let scaleName = "";
       const nameMatch = scale.match(nameRegex)?.join("").split("");
       const modifierMatch = scale.match(modifierRegex)?.join("").split("");
       const octaveMatch = scale.match(octaveRegex)?.join("").split("");
       const scaleNameMatch = scale.match(scaleNameRegex)?.join("").split("");
       // combine all modifiers
       if (modifierMatch) {
           if (modifierMatch.length > 1) {
               // combine all modifiers into an offeset value to be added to the semitone
               noteModifier = modifierMatch
                   .map((item) => parseModifier(item))
                   .reduce((a, b) => a + b);
           }
           else {
               noteModifier = parseModifier(modifierMatch[0]);
           }
       }
       if (octaveMatch) {
           const [octave] = octaveMatch;
           noteOctave = octave;
       }
       if (scaleNameMatch) {
           const sName = scaleNameMatch.join("");
           // console.log(sName);
           scaleName = sName;
       }
       if (nameMatch) {
           const [noteName] = nameMatch;
           noteIdenifier = noteName;
           let modifier = 0;
           if (noteModifier)
               modifier = noteModifier;
           const wrappedTone = wrap(getWholeToneFromName(noteIdenifier) + modifier, TONES_MIN, TONES_MAX);
           const semitone = wrappedTone.value;
           let octave = 4;
           if (noteOctave)
               octave = clamp(parseInt(noteOctave, 10), OCTAVE_MIN, OCTAVE_MAX);
           let templateIndex = 1; // default major scale
           if (scaleName) {
               templateIndex = Object.keys(ScaleTemplates).findIndex((template) => template
                   .toLowerCase()
                   .includes(scaleName.toLowerCase().replace(/\(|\)/g, "")));
           }
           // console.log(Object.keys(ScaleTemplates)[templateIndex]);
           if (templateIndex === -1) {
               console.log("UNKNOWN TEMPLATE", scaleName);
               throw new Error(`Unable to find template for scale ${scaleName}`);
           }
           const template = ScaleTemplates[Object.keys(ScaleTemplates)[templateIndex]];
           return {
               key: semitone,
               octave: octave,
               template: template,
           };
       }
       throw new Error(`Invalid Scale: ${scale}`);
   };
   //**********************************************************
   /**
    * creates a lookup table for all notes formatted as [A-G][#|b|s][0-9]
    */
   //**********************************************************
   const createTable$1 = () => {
       const scaleTable = {};
       const noteLetters = ["A", "B", "C", "D", "E", "F", "G"];
       const noteModifiers = ["b", "#", "s"];
       const templates = Object.keys(ScaleTemplates);
       for (const template of templates) {
           for (const noteLabel of noteLetters) {
               //ex A(minor)
               scaleTable[`${noteLabel}(${template})`] = parseScale(noteLabel, true); // 'C' for example
               for (const mod of noteModifiers) {
                   const key = `${noteLabel}${mod}(${template})`;
                   // ex A#(minor)
                   scaleTable[key] = parseScale(key, true); // 'C#' for example
               }
               for (let iOctave = OCTAVE_MIN; iOctave < OCTAVE_MAX; ++iOctave) {
                   const key = `${noteLabel}${iOctave}(${template})`;
                   // ex A4(minor)
                   scaleTable[key] = parseScale(key, true); // 'C4' for example
                   for (const mod of noteModifiers) {
                       const key = `${noteLabel}${mod}${iOctave}(${template})`;
                       // ex A#4(minor)
                       scaleTable[key] = parseScale(key, true); // 'C#4' for example
                   }
               }
           }
       }
       return scaleTable;
   };
   //**********************************************************
   /**
    * creates the lookup table as soon as the module is loaded
    */
   //**********************************************************
   let _scaleLookup = {};
   const scaleLookup = (key) => {
       if (!_scaleLookup) {
           _scaleLookup = createTable$1();
       }
       return _scaleLookup[key];
   };
   registerInitializer(() => {
       _scaleLookup = createTable$1();
   });

   //**********************************************************
   /**
    * shifts an array by a given distance
    */
   //**********************************************************
   const shift = (arr, dist = 1) => {
       arr = [...arr]; // copy
       if (dist > arr.length || dist < 0 - arr.length)
           throw new Error("shift: distance is greater than array length");
       if (dist > 0) {
           const temp = arr.splice(arr.length - dist, Infinity);
           arr.unshift(...temp);
       }
       if (dist < 0) {
           const temp = arr.splice(0, dist);
           arr.push(...temp);
       }
       return arr;
   };

   //**********************************************************
   /**
    *  Simple util to lazy clone an object
    */
   //**********************************************************
   const clone = (obj) => {
       return JSON.parse(JSON.stringify(obj));
   };

   //**********************************************************
   /**
    * simple util to lazy check equality of objects and arrays
    */
   //**********************************************************
   const isEqual = (a, b) => {
       const stringA = JSON.stringify(a);
       const stringB = JSON.stringify(b);
       return stringA === stringB;
   };

   const scaleNameLookup = (template, supressWarning = false) => {
       try {
           const result = nameTable(JSON.stringify(template));
           if (result)
               return result;
       }
       catch (e) {
           if (!supressWarning)
               console.warn(e);
       }
       const keys = Object.keys(ScaleTemplates);
       const values = Object.values(ScaleTemplates);
       const scaleNames = [];
       for (let i = 0; i < keys.length; ++i) {
           if (isEqual(values[i], template)) {
               scaleNames.push(keys[i].charAt(0).toUpperCase() + keys[i].slice(1));
           }
       }
       const scaleNamesString = scaleNames.join(" AKA ");
       return scaleNamesString;
   };
   const createTable = () => {
       const table = {};
       for (const template of Object.values(ScaleTemplates)) {
           table[JSON.stringify(template)] = scaleNameLookup(template, true);
       }
       return table;
   };
   let _nameTable = {};
   const nameTable = (key) => {
       if (!_nameTable[key]) {
           _nameTable = createTable();
       }
       return _nameTable[key];
   };
   registerInitializer(() => {
       _nameTable = createTable();
   });

   // import scaleNoteNameLookup from "./scaleNoteNameLookup";
   //**********************************************************
   /**
    * A musical scale.
    * The primary fields are the semitone and octave.
    * The octave is clamped to the range [0, 9].
    * Setting the semitone to a value outside of the range [0, 11] will
    * wrap the semitone to the range [0, 11] and change the octave depending
    * on how many times the semitone has been wrapped.
    */
   //**********************************************************
   class Scale {
       constructor(values) {
           if (!values) {
               this.template = DEFAULT_SCALE_TEMPLATE;
               this.key = DEFAULT_SEMITONE;
               this.octave = DEFAULT_OCTAVE;
           }
           else if (typeof values === "string") {
               values = parseScale(values);
               this.template = clone(values.template) || DEFAULT_SCALE_TEMPLATE;
               this.key = values.key || DEFAULT_SEMITONE;
               this.octave = values.octave || DEFAULT_OCTAVE;
           }
           else {
               // important that octave is set first so that
               // setting the semitone can change the octave
               this.template = clone(values.template) || DEFAULT_SCALE_TEMPLATE;
               this.key = values.key || DEFAULT_SEMITONE;
               this.octave = values.octave || DEFAULT_OCTAVE;
           }
           this.generateNotes();
       }
       //**********************************************************
       /**
        *  unique id for this scale
        */
       //**********************************************************
       id = uid();
       //**********************************************************
       /**
        * Returns true if this scale is equal to the given scale
        */
       //**********************************************************
       equals(scale) {
           return (this._key === scale._key &&
               this._octave === scale._octave &&
               isEqual(this._template, scale._template));
       }
       //**********************************************************
       /**
        * Returns a copy of this Scale
        */
       //**********************************************************
       copy() {
           const scale = new Scale({
               key: this.key,
               octave: this.octave,
               template: clone(this.template),
           });
           if (this._shiftedInterval !== 0)
               scale.shift(this._shiftedInterval);
           return scale;
       }
       //**********************************************************
       /**
        * key
        */
       //**********************************************************
       _key = 0;
       get key() {
           return this._key;
       }
       set key(value) {
           const wrapped = wrap(value, TONES_MIN, TONES_MAX);
           this.octave = this.octave + wrapped.numWraps;
           this._key = wrapped.value;
           this.generateNotes();
       }
       //**********************************************************
       /**
        * octave
        */
       //**********************************************************
       _octave = DEFAULT_OCTAVE;
       get octave() {
           return this._octave;
       }
       set octave(value) {
           this._octave = clamp(value, OCTAVE_MIN, OCTAVE_MAX);
           this.generateNotes();
       }
       //**********************************************************
       /**
        * template
        */
       //**********************************************************
       _template = [];
       get template() {
           return clone(this._template);
       }
       set template(value) {
           this._template = clone(value);
           this._shiftedInterval = 0;
           this.generateNotes();
       }
       //**********************************************************
       /**
        * notes
        * notes are generated and cached as needed
        */
       //**********************************************************
       _notes = [];
       get notes() {
           return this._notes;
       }
       //**********************************************************
       /**
        * generate notes(internal)
        * generates the notes for this scale
        */
       //**********************************************************
       generateNotes() {
           // use the template unshifted for simplicity
           const unshiftedTemplate = shift(this._template, -this._shiftedInterval);
           // if allowing this to change the octave is undesirable
           // then may need to pre wrap the tone and use
           // the final value
           const notes = [];
           let accumulator = this.key;
           for (const interval of unshiftedTemplate) {
               const tone = interval === 0
                   ? (accumulator = this.key)
                   : (accumulator += interval);
               const note = new Note({
                   semitone: tone,
                   octave: this.octave,
               });
               notes.push(note);
           }
           // this._notes = shift(notes, this._shiftedInterval + 1);
           // shift notes back to original position
           if (this._shiftedInterval > 0) {
               const temp = notes.splice(notes.length - (this._shiftedInterval + 1), Infinity);
               notes.unshift(...temp);
           }
           if (this._shiftedInterval < 0) {
               const temp = notes.splice(0, this._shiftedInterval);
               notes.push(...temp);
           }
           this._notes = notes;
       }
       //**********************************************************
       /**
        * returns the names of the notes in the scale
        */
       //**********************************************************
       getNoteNames(preferSharpKey = true) {
           const names = Scale.scaleNoteNameLookup(this, preferSharpKey);
           return names;
       }
       //**********************************************************
       /**
        * degree
        * returns a note that represents the given degree
        */
       //**********************************************************
       degree(degree) {
           const wrapped = wrap(degree - 1 /*zero index */, 0, this.notes.length - 1);
           const note = this.notes[wrapped.value].copy();
           note.octave = this.octave + wrapped.numWraps;
           return note;
       }
       //**********************************************************
       /**
        * relative major
        * returns a new scale that is the relative major of this scale
        */
       //**********************************************************
       relativeMajor() {
           const major = new Scale({
               template: ScaleTemplates.major,
               key: this.degree(3).semitone,
               octave: this.octave,
           });
           return major;
       }
       //**********************************************************
       /**
        * relative minor
        * returns a new scale that is the relative minor of this scale
        */
       //**********************************************************
       relativeMinor() {
           const minor = new Scale({
               template: ScaleTemplates.minor,
               key: this.degree(6).semitone,
               octave: this.octave,
           });
           return minor;
       }
       //**********************************************************
       /**
        * shift
        * shifts the scale by the given number of degrees
        */
       //**********************************************************
       _shiftedInterval = 0;
       _originalTemplate = [];
       shift(degrees = 1) {
           if (this._shiftedInterval === 0) {
               this._originalTemplate = clone(this._template);
           }
           this._template = shift(this._template, degrees);
           this._shiftedInterval += degrees;
           this.generateNotes();
           return this;
       }
       //**********************************************************
       /**
        * shifted
        * returns a copy of this scale shifted by the given number of degrees
        */
       //**********************************************************
       shifted(degrees = 1) {
           const scale = this.copy();
           scale.shift(degrees);
           return scale;
       }
       //**********************************************************
       /**
        * unshift
        * shifts the original root back to the root position
        */
       //**********************************************************
       unshift() {
           if (this._shiftedInterval !== 0) {
               if (this._originalTemplate.length > 0) {
                   this._template = this._originalTemplate;
               }
               // this.shift(this._shiftedInterval * -1);
               this._shiftedInterval = 0;
               this._originalTemplate = [];
               this.generateNotes();
           }
           return this;
       }
       //**********************************************************
       /**
        * unshifted
        * returns a copy of this scale with the tonic shifted back
        * to the root position
        */
       //**********************************************************
       unshifted() {
           const scale = this.copy();
           if (this._originalTemplate.length)
               scale.template = this._originalTemplate;
           scale.unshift();
           return scale;
       }
       //**********************************************************
       /**
        * returns the amount that the scale has shifted
        * (0 if not shifted)
        */
       //**********************************************************
       shiftedInterval() {
           return this._shiftedInterval;
       }
       //**********************************************************
       /**
        * Scale modes
        */
       //**********************************************************
       ionian() {
           const scale = this.copy();
           scale.template = ScaleTemplates.ionian;
           return scale;
       }
       dorian() {
           const scale = this.copy();
           scale.template = ScaleTemplates.dorian;
           return scale;
       }
       phrygian() {
           const scale = this.copy();
           scale.template = ScaleTemplates.phrygian;
           return scale;
       }
       lydian() {
           const scale = this.copy();
           scale.template = ScaleTemplates.lydian;
           return scale;
       }
       mixolydian() {
           const scale = this.copy();
           scale.template = ScaleTemplates.mixolydian;
           return scale;
       }
       aeolian() {
           const scale = this.copy();
           scale.template = ScaleTemplates.aeolian;
           return scale;
       }
       locrian() {
           const scale = this.copy();
           scale.template = ScaleTemplates.locrian;
           return scale;
       }
       //**********************************************************
       /**
        * returns string version of the scale
        */
       //**********************************************************
       toString() {
           let scaleNames = scaleNameLookup(this._template);
           if (!scaleNames)
               scaleNames = this.getNoteNames().join(", ");
           return `${Semitone$1[this._key]}${this._octave}(${scaleNames})`;
       }
       //**********************************************************
       /**
        * attempts to lookup the note name for a scale efficiently
        */
       //**********************************************************
       static scaleNoteNameLookup(scale, preferSharpKey = true) {
           try {
               const key = `${scale.key}-${scale.octave}-${JSON.stringify(scale.template)}`;
               const notes = this._notesLookup[key];
               if (notes) {
                   return notes;
               }
           }
           catch (e) {
               // do nothing
           }
           let notes = [...scale.notes];
           notes = shift(notes, -scale.shiftedInterval()); //unshift back to key = 0 index
           const notesParts = notes.map((note) => note.toString().split("/"));
           const removables = ["B#", "Bs", "Cb", "E#", "Es", "Fb"];
           const noteNames = [];
           for (const noteParts of notesParts) {
               //remove Cb B# etc
               for (const part of noteParts) {
                   if (removables.includes(part)) {
                       const index = noteNames.indexOf(part);
                       noteNames.splice(index, 1);
                   }
               }
               if (noteNames.length === 0) {
                   noteNames.push(preferSharpKey ? noteParts[0] : noteParts[noteParts.length - 1]);
                   continue;
               }
               if (noteParts.length === 1) {
                   noteNames.push(noteParts[0]);
                   continue;
               }
               const wholeNotes = [
                   "A",
                   "B",
                   "C",
                   "D",
                   "E",
                   "F",
                   "G",
                   "A",
                   "B",
                   "C",
                   "D",
                   "E",
                   "F",
                   "G",
               ];
               const lastWholeNote = noteNames[noteNames.length - 1][0];
               const lastIndex = wholeNotes.indexOf(lastWholeNote);
               const nextNote = wholeNotes[lastIndex + 1];
               if (noteParts[0].includes(nextNote)) {
                   noteNames.push(noteParts[0]);
                   continue;
               }
               noteNames.push(noteParts[noteParts.length - 1]);
           }
           const shiftedNoteNames = shift(noteNames, scale.shiftedInterval());
           return shiftedNoteNames;
       }
       //**********************************************************
       /**
        * creates a lookup table for all notes formatted as [A-G][#|b|s][0-9]
        */
       //**********************************************************
       static createNotesLookupTable() {
           const scaleTable = {};
           for (let itone = TONES_MIN; itone < TONES_MIN + OCTAVE_MAX; itone++) {
               for (let ioctave = OCTAVE_MIN; ioctave <= OCTAVE_MAX; ioctave++) {
                   for (const template of Object.values(ScaleTemplates)) {
                       const scale = new Scale({
                           key: itone,
                           template: template,
                           octave: ioctave,
                       });
                       scaleTable[`${itone}-${ioctave}-${JSON.stringify(template)}`] =
                           Scale.scaleNoteNameLookup(scale);
                   }
               }
           }
           return scaleTable;
       }
       //**********************************************************
       /**
        * creates the lookup table as soon as the module is loaded
        */
       //**********************************************************
       static _notesLookup = {};
       // this.createNotesLookupTable();
       //**********************************************************
       /**
        * used to initialize the lookup table
        */
       //**********************************************************
       static async init() {
           Scale._notesLookup = Scale.createNotesLookupTable();
       }
   }
   registerInitializer(Scale.init);
   // look at order of initialized - not working correctly

   class Chord {
       constructor(values) {
           if (!values) {
               this.root = DEFAULT_SEMITONE;
               this.octave = DEFAULT_OCTAVE;
           }
       }
       //**********************************************************
       /**
        * unique id for this instance
        */
       //**********************************************************
       id = uid();
       _root = DEFAULT_SEMITONE;
       get root() {
           return this._root;
       }
       set root(value) {
           // this._root = value;
           const wrapped = wrap(value, TONES_MIN, TONES_MAX);
           this._root = wrapped.value;
           this._octave = this._octave + wrapped.numWraps;
       }
       _octave = DEFAULT_OCTAVE;
       get octave() {
           return this._octave;
       }
       set octave(value) {
           this._octave = clamp(value, OCTAVE_MIN, OCTAVE_MAX);
       }
       _template = [];
       get template() {
           return [...this._template];
       }
       set template(value) {
           this._template = [...value];
           // this.generateNotes();
       }
       //**********************************************************
       /**
        * notes
        * notes are generated and cached as needed
        */
       //**********************************************************
       _notes = [];
       get notes() {
           return this._notes;
       }
       generateNotes() {
           this._notes = [];
           let accumulator = this._root;
           for (const interval of this._template) {
               const tone = interval === 0
                   ? (accumulator = this._root)
                   : (accumulator += interval);
               const note = new Note({
                   semitone: tone,
                   octave: this.octave,
               });
               this._notes.push(note);
           }
       }
       copy() {
           return new Chord({ root: this.root, octave: this.octave });
       }
       equals(other) {
           return this.root === other.root && this.octave === other.octave;
       }
   }

   exports.Chord = Chord;
   exports.Instrument = Instrument;
   exports.Modifier = Modifier$1;
   exports.Note = Note;
   exports.Scale = Scale;
   exports.ScaleTemplates = ScaleTemplates;
   exports.Semitone = Semitone$1;
   exports.init = init;
   exports.initAsync = initAsync;

   Object.defineProperty(exports, '__esModule', { value: true });

}));
