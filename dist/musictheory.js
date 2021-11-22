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

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __decorate(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    }

    var wrap = function (value, lower, upper) {
        var wraps = Math.trunc(value / (upper + 1));
        var wrappedValue = value;
        wrappedValue -= upper * wraps;
        wrappedValue += lower;
        return { value: wrappedValue, numWraps: wraps };
    };

    var CTonable = function () {
        return function (target) {
            target.prototype.tone = function (tone) {
                if (target.prototype._tone === undefined)
                    target.prototype._tone = 4;
                if (tone !== undefined) {
                    target.prototype._tone = wrap(tone, 0, 11).value;
                }
                return target.prototype._tone;
            };
        };
    };

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

    var CIdentifiable = function () {
        return function (target) {
            target.prototype.id = function (id) {
                if (target.prototype._id === undefined)
                    target.prototype._id = uid();
                if (id) {
                    target.prototype._id = id;
                }
                return target.prototype._id;
            };
        };
    };

    var COctivable = function () {
        return function (target) {
            target.prototype.octave = function (octave) {
                if (target.prototype._octave === undefined)
                    target.prototype._octave = 4;
                if (octave !== undefined) {
                    target.prototype._octave = wrap(octave, 0, 12).value;
                }
                return target.prototype._octave;
            };
        };
    };

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
    var Semitone$1 = Semitone;

    var _tuning = {
        a4: 440
    };
    var tuning = function (tuning) {
        if (tuning) {
            _tuning = __assign(__assign({}, _tuning), tuning);
        }
        return _tuning;
    };

    var freqLookup = {};
    var midiLookup = {};
    var midikeyStart = 12;
    var octaves = 12;
    var semitones = 12;
    var calcMidiKey = function (octave, semitone) {
        return midikeyStart + octave * semitones + semitone;
    };
    var calcFrequency = function (midiKey) {
        return Math.pow(2, ((midiKey - 69) / 12)) * tuning().a4;
    };
    var createTables = function () {
        var iOctave = 0;
        var iSemitone = 0;
        for (iOctave = 0; iOctave < octaves; ++iOctave) {
            for (iSemitone = 0; iSemitone < semitones; ++iSemitone) {
                var key = "".concat(iOctave, "-").concat(iSemitone);
                var mkey = calcMidiKey(iOctave, iSemitone);
                var freq = calcFrequency(mkey);
                midiLookup[key] = mkey;
                freqLookup[key] = freq;
            }
        }
    };
    createTables();
    console.log("lookup", freqLookup);

    var getMidiKey = function (octave, semitone) {
        var key = "".concat(octave, "-").concat(semitone); // -1 because list of semitones is not zero indexed
        var midiKey = midiLookup[key];
        if (midiKey === undefined) {
            throw new Error("Invalid midi key: ".concat(key));
        }
        return midiKey;
    };

    var getFrequency = function (octave, semitone) {
        var key = "".concat(octave, "-").concat(semitone); // -1 because list of semitones is not zero indexed
        var freq = freqLookup[key];
        if (freq === undefined) {
            throw new Error("Invalid frequency key: ".concat(key));
        }
        return freq;
    };

    var Note = /** @class */ (function () {
        function Note(values) {
            var _a, _b;
            this.octave((_a = values === null || values === void 0 ? void 0 : values.octave) !== null && _a !== void 0 ? _a : 4);
            this.tone((_b = values === null || values === void 0 ? void 0 : values.tone) !== null && _b !== void 0 ? _b : 4);
        }
        // must set defaults for interface props
        Note.prototype.id = function (id) {
            return "";
        };
        Note.prototype.octave = function (octave) {
            return 0;
        };
        Note.prototype.tone = function (tone) {
            return Semitone$1.C;
        };
        Note.prototype.midiKey = function () {
            return getMidiKey(this.octave(), this.tone());
        };
        Note.prototype.frequency = function () {
            return getFrequency(this.octave(), this.tone());
        };
        Note = __decorate([
            CIdentifiable(),
            COctivable(),
            CTonable()
        ], Note);
        return Note;
    }());

    var Modifier;
    (function (Modifier) {
        Modifier[Modifier["NATURAL"] = 0] = "NATURAL";
        Modifier[Modifier["SHARP"] = 1] = "SHARP";
        Modifier[Modifier["FLAT"] = 2] = "FLAT";
    })(Modifier || (Modifier = {}));
    var Modifier$1 = Modifier;

    exports.Modifier = Modifier$1;
    exports.Note = Note;
    exports.Semitone = Semitone$1;
    exports.wrap = wrap;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
