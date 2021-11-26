(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.MusicTheory = {}));
})(this, (function (exports) { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __decorate(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    }

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

    const CIdentifiable = () => {
        return (target) => {
            target.prototype.id = (id) => {
                if (target.prototype._id === undefined)
                    target.prototype._id = uid();
                if (id) {
                    target.prototype._id = id;
                }
                return target.prototype._id;
            };
        };
    };

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
        if (!name || name.length === 0 || name.length > 2)
            throw new Error("Invalid name");
        const key = name[0].toUpperCase();
        return Semitone[key];
    };
    var Semitone$1 = Semitone;

    //**************************************************
    //Wraps a number between a min and max value.
    // ************************************************
    const wrap = (value, lower, upper) => {
        let lbound = lower;
        let ubound = upper;
        // if the bounds are inverted, swap them here
        if (upper < lower) {
            lbound = upper;
            ubound = lower;
        }
        let val = value;
        // the amount needed to move the range and value to zero
        const zeroOffset = 0 - lbound;
        // offset the values so that the lower bound is zero
        lbound += zeroOffset;
        ubound += zeroOffset;
        val += zeroOffset;
        // compute the number of times the value will wrap
        let wraps = Math.trunc(val / ubound);
        if (wraps === 0 && val < lbound)
            wraps = -1;
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

    //**********************************************************
    /**
     * Regex for matching note name, modifier, and octave
     */
    //**********************************************************
    const nameRegex = /([A-G])/g;
    const modifierRegex = /(#|s|b)/g;
    const octaveRegex = /([0-9]*)/g;
    //**********************************************************
    /**
     * attempts to parse a note from a string
     */
    //**********************************************************
    const parseNote = (note, supressWarning = false) => {
        try {
            const result = noteLookup[note];
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
        const nameMatch = note.match(nameRegex)?.join("").split("");
        const modifierMatch = note.match(modifierRegex)?.join("").split("");
        const octaveMatch = note.match(octaveRegex)?.join("").split("");
        // combine all modifiers
        if (modifierMatch) {
            if (modifierMatch.length > 1) {
                // TS seams to confuse the types here so use any for now
                noteModifier = modifierMatch.reduce((acc, curr) => {
                    if (typeof acc === "string")
                        acc = parseModifier(acc);
                    const modifier = parseModifier(curr);
                    return (acc + modifier);
                });
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
            let semitone = wrappedTone.value;
            let octave = 4;
            if (noteOctave)
                octave = clamp(parseInt(noteOctave), OCTAVE_MIN, OCTAVE_MAX);
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
    const createTable$1 = () => {
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
    const noteLookup = createTable$1();

    const UNKNOWN_MODIFIER_NOTE_STRINGS = [
        "B#/C",
        "C#/Db",
        "D",
        "D#/Eb",
        "E/Fb",
        "E#/F",
        "F#/Gb",
        "G",
        "G#/Ab",
        "A",
        "A#/Bb",
        "B/Cb",
    ];
    const SHARP_NOTE_STRINGS = ["B#", "C#", "D", "D#", "E", "E#", "F#", "G", "G#", "A", "A#", "B"];
    const FLAT_MODIFIER_NOTE_STRINGS = ["C", "Db", "D", "Eb", "Fb", "F", "Gb", "G", "Ab", "A", "Bb", "Cb"];
    const createTable = () => {
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
            case "-":
                return UNKNOWN_MODIFIER_NOTE_STRINGS[tone];
            case "#":
                return SHARP_NOTE_STRINGS[tone];
            case "b":
                return FLAT_MODIFIER_NOTE_STRINGS[tone];
            default:
                return `${Semitone$1[tone]}`;
        }
    };
    const noteStringLookup = createTable();

    var Note_1;
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
    let Note = Note_1 = class Note {
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
            return new Note_1({
                semitone: this.semitone + 1,
                octave: this.octave,
            });
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
            if (wrap(this.semitone + 1, TONES_MIN, TONES_MAX).value === this._prevSemitone)
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
            return new Note_1({
                semitone: this.semitone - 1,
                octave: this.octave,
            });
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
            if (wrap(this.semitone - 1, TONES_MIN, TONES_MAX).value === this._prevSemitone)
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
            return new Note_1({
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
            return noteStringLookup[`${this._tone}-${this._prevSemitone}`] + `${this._octave}`;
        }
        //**********************************************************
        /**
         * Static methods to create whole notes easily.
         * the default octave is 4
         */
        //**********************************************************
        static A(octave = 4) {
            return new Note_1({
                semitone: Semitone$1.A,
                octave,
            });
        }
        static B(octave) {
            return new Note_1({
                semitone: Semitone$1.B,
                octave,
            });
        }
        static C(octave) {
            return new Note_1({
                semitone: Semitone$1.C,
                octave,
            });
        }
        static D(octave) {
            return new Note_1({
                semitone: Semitone$1.D,
                octave,
            });
        }
        static E(octave) {
            return new Note_1({
                semitone: Semitone$1.E,
                octave,
            });
        }
        static F(octave) {
            return new Note_1({
                semitone: Semitone$1.F,
                octave,
            });
        }
        static G(octave) {
            return new Note_1({
                semitone: Semitone$1.G,
                octave,
            });
        }
    };
    Note = Note_1 = __decorate([
        CIdentifiable() // generates a unique id for each instance - retrieve with id()
    ], Note);
    var Note$1 = Note;

    exports.Modifier = Modifier$1;
    exports.Note = Note$1;
    exports.Semitone = Semitone$1;
    exports.wrap = wrap;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
