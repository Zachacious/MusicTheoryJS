(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('uid')) :
    typeof define === 'function' && define.amd ? define(['exports', 'uid'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.MusicTheory = {}, global.uid));
})(this, (function (exports, uid) { 'use strict';

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

    var CIdentifiable = function () {
        return function (target) {
            return (target.prototype.id = function (id) {
                if (id === void 0) { id = ""; }
                id ? (target.prototype.id = id) : (target.prototype.id = uid.uid(10));
                return target.prototype.id;
            });
        };
    };

    var COctivable = function () {
        return function (target) {
            return (target.prototype.octave = function (octave) {
                octave
                    ? (target.prototype.octave = octave)
                    : (target.prototype.octave = 4);
                return target.prototype.octave;
            });
        };
    };

    var halftone;
    (function (halftone) {
        halftone[halftone["A"] = 1] = "A";
        halftone[halftone["A$"] = 2] = "A$";
        halftone[halftone["Bb"] = 2] = "Bb";
        halftone[halftone["B"] = 3] = "B";
        halftone[halftone["B$"] = 4] = "B$";
        halftone[halftone["Cb"] = 3] = "Cb";
        halftone[halftone["C"] = 4] = "C";
        halftone[halftone["C$"] = 5] = "C$";
        halftone[halftone["Db"] = 5] = "Db";
        halftone[halftone["D"] = 6] = "D";
        halftone[halftone["D$"] = 7] = "D$";
        halftone[halftone["Eb"] = 7] = "Eb";
        halftone[halftone["E"] = 8] = "E";
        halftone[halftone["E$"] = 9] = "E$";
        halftone[halftone["Fb"] = 8] = "Fb";
        halftone[halftone["F"] = 9] = "F";
        halftone[halftone["F$"] = 10] = "F$";
        halftone[halftone["Gb"] = 10] = "Gb";
        halftone[halftone["G"] = 11] = "G";
        halftone[halftone["G$"] = 12] = "G$";
        halftone[halftone["Ab"] = 12] = "Ab";
    })(halftone || (halftone = {}));
    var halftone$1 = halftone;

    var Note = /** @class */ (function () {
        function Note(tone, octave, id) {
            if (tone === void 0) { tone = halftone$1.A; }
            this.tone = tone;
            // this.octave = octave;
            // this.id(id);
            // this.octave(octave);
        }
        Note = __decorate([
            CIdentifiable(),
            COctivable()
        ], Note);
        return Note;
    }());

    exports.Note = Note;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
