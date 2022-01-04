# MusicTheoryJS v2

Documentation

Music Theory Abstractions for analysis, synthesis, and real-time music composition. Designed for use with MIDI.

Includes nearly 70 pre-defined scale templates and over 40 pre-defined chords templates.

Designed to be an enterprise grade library that's easy to use and extend.

Examples:

```javascript
import { Scale, Chord, Note, Instrument } from "musictheoryjs";

// create a note
const note = new Note("D4");

// create a scale
const scale = new Scale("C5(major)");
console.log(scale.getNoteNames()); // --> ["C5", "D5", "E5", "F5", "G5", "A5", "B5"]

// create a chord
const chord = new Chord("(Ab3)maj7");
console.log(chord.notes); // --> array of notes in the chord

// get the frequency of the scales 3rd degree
const instrument = new Instrument();
const freq = instrument.getFrequency(scale.degree(3)); // --> 659.26

// get the midi key for the scales 3rd degree
const midiKey = instrument.getMidiKey(scale.degree(3)); // --> 76
```

---

## Installation

npm:<br>

```bash
npm i musictheoryjs@latest
```

yarn:<br>

```bash
yarn add musictheoryjs
```

---

## Usage

```javascript
import * as mt from "musictheoryjs";
// or
import {
   Chord,
   Scale,
   Note,
   Instrument,
   Semitone,
   Modifier,
} from "musictheoryjs";
```

---

---

## Semitones

Semitones are simple numbers that represent notes<br>
There are 12 in total ranging from 0(C) to 11(B)<br>
0 -> C<br>
1 -> C#<br>
2 -> D<br>
3 -> D#<br>
4 -> E<br>
5 -> F<br>
6 -> F#<br>
7 -> G<br>
8 -> G#<br>
9 -> A<br>
10 -> A#<br>
11 -> B<br>

---

## Modifiers

Modifiers are this library's way of representing alterations.<br>
Think of modifiers as the mathematical form.<br>
Flat is represented as -1,<br>
Sharp is represented as 1,<br>
Natural is represented as 0.<br>

You can import the Modifier enum or just create your own constants when needed.<br>

---

## Instruments

Instruments encapsulate tuning and methods for calculating the frequency and midi key notes.

the tuning is specified as the A4 frequency in Hertz. The default tuning is 440Hz.

---

## Notes

Notes encapsulate the semitone and octave of a musical note.

---

## Chords

Chords are made from a root semitone, octave, template(containing ChordIntervals), and a base scale(default is the Major scale).

The following Pre-defined templates are available:

  <table>
  <tr>
  <td>maj</td>
  <td>maj4</td>
  <td>maj6</td>
  <td>maj69</td>
  </tr><tr>
  <td>maj7</td>
  <td>maj9</td>
  <td>maj11</td>
  <td>maj13</td>
  </tr><tr>
  <td>maj7s11</td>
  <td>majb5</td>
  <td>min</td>
  <td>min4</td>
  </tr><tr>
  <td>min6</td>
  <td>min7</td>
  <td>minAdd9</td>
  <td>min69</td>
  </tr><tr>
  <td>min9</td>
  <td>min11</td>
  <td>min13</td>
  <td>min7b5</td>
  </tr><tr>
  <td>dom7</td>
  <td>dom9</td>
  <td>dom11</td>
  <td>dom13</td>
  </tr><tr>
  <td>dom7s5</td>
  <td>dom7b5</td>
  <td>dom7s9</td>
  <td>dom7b9</td>
  </tr><tr>
  <td>dom9b5</td>
  <td>dom9s5</td>
  <td>dom7s11</td>
  <td>dom7s5s9</td>
  </tr><tr>
  <td>dom7s5b9</td>
  <td>dim</td>
  <td>dim7</td>
  <td>aug</td>
  </tr><tr>
  <td>sus2</td>
  <td>sus4</td>
  <td>fifth</td>
  <td>b5</td>
  </tr><tr>
  <td>s11</td>
  </tr>
  </table>

---

## Scales

Scales are made from a key semitone, octave, template(a list of intervals).

The following Pre-defined templates are available:

  <table>
  <tr>
  <td>major</td>
  <td>minor</td>
  <td>ionian</td>
  <td>dorian</td>
  </tr><tr>
  <td>phrygian</td>
  <td>lydian</td>
  <td>mixolydian</td>
  <td>aeolian</td>
  </tr><tr>
  <td>locrian</td>
  <td>enigmaticMajor</td>
  <td>enigmaticMinor</td>
  <td>minor7b5</td>
  </tr><tr>
  <td>major7s4s5</td>
  <td>harmonicMajor</td>
  <td>harmonicMinor</td>
  <td>doubleHarmonic</td>
  </tr><tr>
  <td>melodicMinorAscending</td>
  <td>melodicMinorDescending</td>
  <td>majorPentatonic</td>
  <td>majorPentatonicBlues</td>
  </tr><tr>
  <td>minorPentatonic</td>
  <td>minorPentatonicBlues</td>
  <td>b5Pentatonic</td>
  <td>minor6Pentatonic</td>
  </tr><tr>
  <td>dim8Tone</td>
  <td>dom8Tone</td>
  <td>neopolitanMajor</td>
  <td>neopolitanMinor</td>
  </tr><tr>
  <td>hungarianMajor</td>
  <td>hungarianMinor</td>
  <td>hungarianGypsy</td>
  <td>spanish</td>
  </tr><tr>
  <td>spanish8Tone</td>
  <td>spanishGypsy</td>
  <td>augmented</td>
  <td>dominantSuspended</td>
  </tr><tr>
  <td>bebopMajor</td>
  <td>bebopDominant</td>
  <td>mystic</td>
  <td>overtone</td>
  </tr><tr>
  <td>leadingTone</td>
  <td>hirojoshi</td>
  <td>japaneseA</td>
  <td>japaneseB</td>
  </tr><tr>
  <td>oriental</td>
  <td>arabian</td>
  <td>persian</td>
  <td>balinese</td>
  </tr><tr>
  <td>kumoi</td>
  <td>pelog</td>
  <td>algerian</td>
  <td>chinese</td>
  </tr><tr>
  <td>mongolian</td>
  <td>egyptian</td>
  <td>hindu</td>
  <td>romanian</td>
  </tr><tr>
  <td>hindu</td>
  <td>insen</td>
  <td>iwato</td>
  <td>scottish</td>
  </tr><tr>
  <td>yo</td>
  <td>istrian</td>
  <td>ukranianDorian</td>
  <td>petrushka</td>
  </tr><tr>
  <td>ahavaraba</td>
  <td>halfDiminished</td>
  <td>jewish</td>
  <td>byzantine</td>
  </tr><tr>
  <td>acoustic</td>
  </table>

---

## Development

Step 1:<br>
Fork the project

Step 2:<br>
Create a new branch - Name it based on the work/feature your working on

Step 3:<br>
From the project root(after you checkout your branch), run:<br>

```bash
npm install
```

or

```bash
yarn install
```

Step 4:<br>
Submit a pull request

### Scripts:

Build:

```bash
npm run build
```

or

```bash
yarn build
```
