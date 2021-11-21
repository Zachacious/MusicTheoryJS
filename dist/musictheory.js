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

    var CTonable = function () {
        return function (target) {
            target.prototype.tone = function (tone) {
                if (target.prototype._tone === undefined)
                    target.prototype._tone = 4;
                if (tone) {
                    target.prototype._tone = tone;
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
                if (octave) {
                    target.prototype._octave = octave;
                }
                return target.prototype._octave;
            };
        };
    };

    var Halftone;
    (function (Halftone) {
        Halftone[Halftone["A"] = 1] = "A";
        Halftone[Halftone["A$"] = 2] = "A$";
        Halftone[Halftone["Bb"] = 2] = "Bb";
        Halftone[Halftone["B"] = 3] = "B";
        Halftone[Halftone["B$"] = 4] = "B$";
        Halftone[Halftone["Cb"] = 3] = "Cb";
        Halftone[Halftone["C"] = 4] = "C";
        Halftone[Halftone["C$"] = 5] = "C$";
        Halftone[Halftone["Db"] = 5] = "Db";
        Halftone[Halftone["D"] = 6] = "D";
        Halftone[Halftone["D$"] = 7] = "D$";
        Halftone[Halftone["Eb"] = 7] = "Eb";
        Halftone[Halftone["E"] = 8] = "E";
        Halftone[Halftone["E$"] = 9] = "E$";
        Halftone[Halftone["Fb"] = 8] = "Fb";
        Halftone[Halftone["F"] = 9] = "F";
        Halftone[Halftone["F$"] = 10] = "F$";
        Halftone[Halftone["Gb"] = 10] = "Gb";
        Halftone[Halftone["G"] = 11] = "G";
        Halftone[Halftone["G$"] = 12] = "G$";
        Halftone[Halftone["Ab"] = 12] = "Ab";
    })(Halftone || (Halftone = {}));
    var Halftone$1 = Halftone;

    var midiLookup = {};
    var midikeyStart = 21;
    var createMidiLookup = function () {
        var i = 0;
        var octaves = 12;
        var halftones = 12;
        for (i = 0; i < octaves; ++i) {
            for (var j = 0; j < halftones; ++j) {
                var key = "".concat(i, "-").concat(j);
                midiLookup[key] = midikeyStart + i * halftones + j;
            }
        }
    };
    // Lets go ahead and create the lookup table
    createMidiLookup();
    var getMidiKey = function (octave, halftone) {
        var key = "".concat(octave, "-").concat(halftone);
        var midiKey = midiLookup[key];
        if (midiKey === undefined) {
            throw new Error("Invalid midi key: ".concat(key));
        }
        return midiKey;
    };

    var Note = /** @class */ (function () {
        //   moctave: (octave?: number) => number = this.octave;
        //   mtone: (tone?: Halftone) => Halftone = this.tone;
        function Note(values) {
            var _a, _b;
            this.octave((_a = values === null || values === void 0 ? void 0 : values.octave) !== null && _a !== void 0 ? _a : 4);
            this.tone((_b = values === null || values === void 0 ? void 0 : values.tone) !== null && _b !== void 0 ? _b : 4);
        }
        Note.prototype.id = function (id) {
            return "";
        };
        Note.prototype.octave = function (octave) {
            return 0;
        };
        Note.prototype.tone = function (tone) {
            return Halftone$1.C;
        };
        Note.prototype.getMidikey = function () {
            return getMidiKey(this.tone(), this.octave());
        };
        Note = __decorate([
            CIdentifiable(),
            COctivable(),
            CTonable()
        ], Note);
        return Note;
    }());
    // @ts-expecct-error - ts doesn't recognize the prototype changes made by the decorators

    var Modifier;
    (function (Modifier) {
        Modifier[Modifier["NATURAL"] = 0] = "NATURAL";
        Modifier[Modifier["SHARP"] = 1] = "SHARP";
        Modifier[Modifier["FLAT"] = 2] = "FLAT";
    })(Modifier || (Modifier = {}));
    var Modifier$1 = Modifier;

    var wrap = function (value, lower, upper) {
        var wraps = Math.trunc(value / (upper + 1));
        var wrappedValue = value;
        wrappedValue -= upper * wraps;
        wrappedValue += lower - 1;
        return { wrappedValue: wrappedValue, wraps: wraps };
    };

    exports.Halftone = Halftone$1;
    exports.Modifier = Modifier$1;
    exports.Note = Note;
    exports.wrap = wrap;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
