# 🎵MusicTheoryJS 
[![CircleCI](https://circleci.com/gh/Zachacious/MusicTheoryJS/tree/master.svg?style=svg)](https://circleci.com/gh/Zachacious/MusicTheoryJS/tree/master)
![npm](https://img.shields.io/npm/v/musictheoryjs)
![npm](https://img.shields.io/npm/dw/musictheoryjs)
[![Inline docs](http://inch-ci.org/github/zachacious/musictheoryjs.svg?branch=master)](http://inch-ci.org/github/zachacious/musictheoryjs)
[![ISC license](http://img.shields.io/badge/license-ISC-brightgreen.svg)](http://opensource.org/licenses/ISC)

MusicTheoryJS is a fully documented, lightweight(5kb gzip), chainable music theory library for realtime procedural music generation, analysis and computer aided music composition.

Includes nearly 70 built in scales and over 40 built in chords

📘[Documentation](https://zachacious.github.io/MusicTheoryJS/)

- - -
## Install

npm:

```
npm i musictheoryjs@latest
```
```javascript
import * as MT from 'musictheoryjs';
```

CDN:

```
https://unpkg.com/musictheoryjs@latest/dist/musictheory.min.js
```
- - -

## Classes

MusicTheoryJS is comprised of 3 main classes:

### Note

Notes consist of a semitone interval (G#(1) - G(12)) and an octave(0-10).

```Javascript
// Notes can be created from a string
// 'note[alterations][octave]'
let A4 = new MT.Note('A#4');

// ... or created directly from a semiton and octave
let A5 = new MT.Note(2, 5); // A semitone = 2 -- octave 5

// ... or from the tones enum
let A6 = new MT.Note(MT.Note.tones.A, 6);

// ... or from a builtin
let A7 = MT.Note.A(7); // built in

// modifiers can be chained
A4.tone(MT.Note.tones.D_FLAT).octave(7).sharp(); // A4 becomes D7
A4.tone(2).octave(4); // change back to A4

// The tuning can be altered by changing the A4 base frequency
// Note: this will change the frequency returned by every note 
MT.Note.A4Tuning(432); // default is 440

// other methods
console.log(A7.asString); // A7
console.log(A4.midiKey); // 69
console.log(A7.isFlat()); // false
console.log(A4.freq); // 432 - because we changed it above
```

### Scale

Scales consist of a root note(tonic or key) and a template(array of integers) that
represents the interval of steps between each note.

Scale intervals are represented by an integer 1 - 4:
* 1 = half step
* 2 = whole step
* 3 = one and one half steps
* 4 = double step

[2, 2, 1, 2, 2, 2] represents the major scale

Scale templates may have arbitray lengths and do NOT include the root note

Check the docs - nearly 70 built in scales

```Javascript
// Create from a root note and a template
let aMajor = MT.Scale(MT.Note.A(), [2, 2, 1, 2, 2, 2]);

// ... or from a builtin
let aPentatonicMajorBlues = MT.Scale.PentatonicMajorBlues(MT.Note.A());

// relative modes
// returns a new scale
let aMDor = aMajor.dorianMode();
let aMLoc = aMajor.locrianMode(); 

// parallel modes
aMajor.parallelMode(MT.Scale.modes.PHRYGIAN);

// chainable
aMajor.minor().tone(MT.Note.tones.F);

// relativeMajor/relativeMinor
let s = aMajor.relativeMajor();
```

### Chord

Chords are created from a root note, template, and a scale.
The template is created from an array of Chord Interval objects representing the scale degree and alterations of each note in the chord.

Over 40 builtin chords

```Javascript
const CI = MT.ChordInterval.create; // alias
const mod = MT.Note.modifier; // alias

// Create from string
// If performance matters, avoid this method
let AbM7s11 = new MT.Chord('AbM7s11'); 

// ... or from root note and template
let Cm = new MT.Chord(MT.Note.C(), [CI(1), CI(3, mod.FLAT), CI(5)]);

// ... or from a builtin
let Fdom7s11 = MT.Chord.dom7s11(MT.Note.F()); 

// chains
Cm.root(new MT.Note(2)).octave(2).diminish().major();

// invert
Cm.invert().invert();

// create chord progressions

let s = MT.Scale.HarmonicMajor(MT.Note.A(4));

let progression = [];
progression.push(MT.Chord.M(s.degree(1))); // creates I chord 
progression.push(MT.Chord.M7b5(s.degree(4))); // creates IV chord 
progression.push(MT.Chord.M7s11(s.degree(5))); // creates V chord 
```

- - -

## Dev Setup

Clone the project

Install Deps:

```
npm install
```

Build:

```
npm run build
```

Dev Server:

```
npm start
```

Build Docs:

```
npm run docs
```