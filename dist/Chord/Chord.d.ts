import Entity from "../Entity";
import Semitone from "../Semitone";
import ChordInitializer from "./ChordInitializer";
import Note from "../Note/Note";
import ChordInterval from "./ChordInterval";
import Scale from "../Scale/Scale";
/**
 * Chords consist of a root note, octave, chord template, and a base scale.<br><br>
 * The chord template is an array of integers, each integer representing<br>
 *  a scale degree from the base scale(defaults to major).<br>
 * The default template is the I,III,V denoted as [1,3,5]<br>
 * ChordIntervals used in templates can also contain a modifier,<br>
 * for a particular scale degree, such as [1,3,[5, -1]]<br>
 * where -1 is flat, 0 is natural, and 1 is sharp.<br>
 * It could also be written as [1,3,[5, modifier.flat]]<br>
 * if you import modifier.
 *
 * The following predefined templates are available:<br>
 * <table>
 * <tr>
 * <td>maj</td>
 * <td>maj4</td>
 * <td>maj6</td>
 * <td>maj69</td>
 * </tr><tr>
 * <td>maj7</td>
 * <td>maj9</td>
 * <td>maj11</td>
 * <td>maj13</td>
 * </tr><tr>
 * <td>maj7s11</td>
 * <td>majb5</td>
 * <td>min</td>
 * <td>min4</td>
 * </tr><tr>
 * <td>min6</td>
 * <td>min7</td>
 * <td>minAdd9</td>
 * <td>min69</td>
 * </tr><tr>
 * <td>min9</td>
 * <td>min11</td>
 * <td>min13</td>
 * <td>min7b5</td>
 * </tr><tr>
 * <td>dom7</td>
 * <td>dom9</td>
 * <td>dom11</td>
 * <td>dom13</td>
 * </tr><tr>
 * <td>dom7s5</td>
 * <td>dom7b5</td>
 * <td>dom7s9</td>
 * <td>dom7b9</td>
 * </tr><tr>
 * <td>dom9b5</td>
 * <td>dom9s5</td>
 * <td>dom7s11</td>
 * <td>dom7s5s9</td>
 * </tr><tr>
 * <td>dom7s5b9</td>
 * <td>dim</td>
 * <td>dim7</td>
 * <td>aug</td>
 * </tr><tr>
 * <td>sus2</td>
 * <td>sus4</td>
 * <td>fifth</td>
 * <td>b5</td>
 * </tr><tr>
 * <td>s11</td>
 * </tr>
 * </table>
 *
 * @example
 * ```javascript
 * import { Chord } from "musictheoryjs";
 * import {ChordTemplate} from "musictheoryjs";
 * import {ChordInterval} from "musictheoryjs";
 * import {Modifier} from "musictheoryjs";
 * import {ChordInitializer} from "musictheoryjs";// Typescript only if needed
 * ```
 */
declare class Chord implements Entity {
    /**
     * @example
     * ```javascript
     * import { Chord, ChordTemplates, Modifier } from "musictheoryjs";
     *
     * //creates a chord with the default(1,3,5) template, root of C, in the 4th octave
     * const chord = new Chord();
     *
     * // creates a chord with the pre-defined diminished template, root of Eb, in the 5th octave
     * const chord = new Chord({root: 3, octave: 5, template: ChordTemplates.dim});
     *
     * // String parsing should follow the format: (root-note-name[s,#,b][octave])[chord-template-name|[chord-quality][modifiers]]
     * // creates a chord from a string
     * const chord = new Chord('(D4)min4');
     * ```
     */
    constructor(values?: ChordInitializer | string);
    /**
     * unique id for this instance
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.id); // hal8934hll
     * ```
     */
    id: string;
    /**
     * root
     */
    protected _root: Semitone;
    /**
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.root); // 0(semitone)
     * ```
     */
    get root(): Semitone;
    /**
     * Setting the root to a value outside of the range [0, 11](semitone) will<br/>
     * wrap the semitone to the range [0, 11] and change the octave depending<br/>
     * on how many times the semitone has been wrapped.
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.root = 4; // sets the root to 4th semitone(E)
     * console.log(chord.root); // 4(semitone)
     * ```
     */
    set root(value: Semitone);
    /**
     * base scale
     */
    protected _baseScale: Scale;
    /**
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.baseScale); // prints the default scale(major)
     * ```
     */
    get baseScale(): Scale;
    /**
     * Not a lot of good reasons to change this except for experimentation
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.baseScale = new Scale({ key: 3, octave: 5, template: [1, [3, Modifier.flat], 5] });
     * console.log(chord.baseScale); // prints the minor scale
     * ```
     */
    set baseScale(value: Scale);
    /**
     * octave
     */
    protected _octave: number;
    /**
     * The octave is clamped to the range [0, 9].
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.octave); // 4(octave)
     * ```
     */
    get octave(): number;
    /**
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.octave = 5; // sets the octave to 5th
     * console.log(chord.octave); // 5(octave)
     * ```
     */
    set octave(value: number);
    /**
     * template
     */
    protected _template: ChordInterval[];
    /**
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.template); // prints the default template
     * ```
     */
    get template(): ChordInterval[];
    /**
     * The following predefined templates are available:<br>
     * <table>
     * <tr>
     * <td>maj</td>
     * <td>maj4</td>
     * <td>maj6</td>
     * <td>maj69</td>
     * </tr><tr>
     * <td>maj7</td>
     * <td>maj9</td>
     * <td>maj11</td>
     * <td>maj13</td>
     * </tr><tr>
     * <td>maj7s11</td>
     * <td>majb5</td>
     * <td>min</td>
     * <td>min4</td>
     * </tr><tr>
     * <td>min6</td>
     * <td>min7</td>
     * <td>minAdd9</td>
     * <td>min69</td>
     * </tr><tr>
     * <td>min9</td>
     * <td>min11</td>
     * <td>min13</td>
     * <td>min7b5</td>
     * </tr><tr>
     * <td>dom7</td>
     * <td>dom9</td>
     * <td>dom11</td>
     * <td>dom13</td>
     * </tr><tr>
     * <td>dom7s5</td>
     * <td>dom7b5</td>
     * <td>dom7s9</td>
     * <td>dom7b9</td>
     * </tr><tr>
     * <td>dom9b5</td>
     * <td>dom9s5</td>
     * <td>dom7s11</td>
     * <td>dom7s5s9</td>
     * </tr><tr>
     * <td>dom7s5b9</td>
     * <td>dim</td>
     * <td>dim7</td>
     * <td>aug</td>
     * </tr><tr>
     * <td>sus2</td>
     * <td>sus4</td>
     * <td>fifth</td>
     * <td>b5</td>
     * </tr><tr>
     * <td>s11</td>
     * </tr>
     * </table>
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.template = [1, [3, Modifier.flat], 5]; // sets the template to a minor chord
     * console.log(chord.template); // prints the new template
     * ```
     */
    set template(value: ChordInterval[]);
    /**
     * notes
     * notes are generated and cached as needed
     */
    protected _notes: Array<Note>;
    protected _notesDirty: boolean;
    /**
     * will generate notes if needed or return the cached notes
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.notes); // prints the default notes
     * ```
     */
    get notes(): Array<Note>;
    /**
     * generate notes(internal)
     * generates the notes for this scale
     */
    protected generateNotes(): Note[];
    /**
     * @returns the note names -> ['C4', 'E4', 'G4']
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.getNoteNames()); // ['C4', 'E4', 'G4']
     * ```
     */
    getNoteNames(): string[];
    /**
     * @chainable
     * @returns a copy of the chord
     * @example
     * ```javascript
     * const chord = new Chord();
     * const copy = chord.copy();
     * console.log(chord.equals(copy)); // true
     * ```
     */
    copy(): Chord;
    /**
     * @param other the other chord to compare to
     * @returns true if the two chords are equal
     * @example
     * ```javascript
     * const chord = new Chord();
     * const copy = chord.copy();
     * console.log(chord.equals(copy)); // true
     * ```
     */
    equals(other: Chord): boolean;
    /**
     * mutates the chord in place
     * @chainable
     * @returns the chord with a natrual 3rd
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.minor();
     * chord.major();
     * console.log(chord.template); // [1,3,5]
     * ```
     */
    major(): Chord;
    /**
     * @chainable
     * @returns a copy of the chord with a natural 3rd
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.minor();
     * const copy = chord.majored();
     * console.log(copy.template); // [1,3,5]
     * ```
     */
    majored(): Chord;
    /**
     * @returns true if the chord has a natural 3rd
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.isMajor()); // true
     * ```
     */
    isMajor(): boolean;
    /**
     *  mutates the chord in place
     * @chainable
     * @returns the chord with a flat 3rd
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.minor();
     * console.log(chord.template); // [1,[3,-1],5]
     * ```
     */
    minor(): Chord;
    /**
     * @chainable
     * @returns a copy of the chord with a flat 3rd
     * @example
     * ```javascript
     * const chord = new Chord();
     * const copy = chord.minored();
     * console.log(copy.template); // [1,[3,-1],5]
     * ```
     */
    minored(): Chord;
    /**
     * @returns true if the chord has a flat 3rd
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.isMinor()); // false
     * chord.minor();
     * console.log(chord.isMinor()); // true
     * ```
     */
    isMinor(): boolean;
    /**
     * Mutates the chord in place
     * @chainable
     * @returns the chord with a sharp 5th
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.augment();
     * console.log(chord.template); // [1, 3, [5, Modifier.sharp]]
     * ```
     */
    augment(): Chord;
    /**
     * @chainable
     * @returns a copy of the chord with a sharp 5th
     * @example
     * ```javascript
     * const chord = new Chord();
     * const copy = chord.augmented();
     * console.log(copy.template); // [1, 3, [5, Modifier.sharp]]
     * ```
     */
    augmented(): Chord;
    /**
     * @returns true if the chord has a sharp 5th
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.isAugmented()); // false
     * chord.augment();
     * console.log(chord.isAugmented()); // true
     * ```
     */
    isAugmented(): boolean;
    /**
     * Mutates the chord in place
     * @chainable
     * @returns the chord with a flat 5th
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.diminish();
     * console.log(chord.template); // [1, 3, [5, Modifier.flat]]
     * ```
     */
    diminish(): Chord;
    /**
     * @chainable
     * @returns a copy of the chord with a flat 5th
     * @example
     * ```javascript
     * const chord = new Chord();
     * const copy = chord.diminished();
     * console.log(copy.template); // [1, 3, [5, Modifier.flat]]
     * ```
     */
    diminished(): Chord;
    /**
     * @returns true if the chord has a flat 5th
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.isDiminished()); // false
     * chord.diminish();
     * console.log(chord.isDiminished()); // true
     * ```
     */
    isDiminished(): boolean;
    /**
     * Mutates the chord in place
     * @chainable
     * @returns the chord with a flat 3,5, and 7th
     * @example
     * ```javascript
     * const chord = new Chord();
     * chord.halfDiminish();
     * console.log(chord.template); // [1, [3, Modifier.flat], [5, Modifier.flat], [7, Modifier.flat]]
     *
     */
    halfDiminish(): Chord;
    /**
     * @chainable
     * @returns a copy of the chord with a flat 3,5, and 7th
     * @example
     * ```javascript
     * const chord = new Chord();
     * const copy = chord.halfDiminished();
     * console.log(copy.template); // [1, 3, [5, Modifier.flat], [7, Modifier.flat]]
     */
    halfDiminished(): Chord;
    /**
     * @returns true if the chord has a flat 3,5, and 7th
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.isHalfDiminished()); // false
     * chord.halfDiminish();
     * console.log(chord.isHalfDiminished()); // true
     */
    isHalfDiminished(): boolean;
    /**
     * Mutates the chord in place
     * @chainable
     * @returns the chord with with the first note moved to the end up one octave
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.template); // [1,3,5]
     * console.log(chord.getNoteNames()); // ['C4', 'E4', 'G4']
     * chord.invert();
     * console.log(chord.template); // [3,5,1]
     * console.log(chord.getNoteNames()); // ['E4', 'G4', 'C5']
     * ```
     */
    invert(): Chord;
    /**
     * @chainable
     * @returns a copy of the chord with with the first note moved to the end up one octave
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.template); // [1,3,5]
     * console.log(chord.getNoteNames()); // ['C4', 'E4', 'G4']
     * const copy = chord.inverted();
     * console.log(copy.template); // [3,5,1]
     * console.log(copy.getNoteNames()); // ['E4', 'G4', 'C5']
     * ```
     */
    inverted(): Chord;
    /**
     * @returns the string form of the chord
     * @example
     * ```javascript
     * const chord = new Chord();
     * console.log(chord.toString()); // '(C4)maj'
     * ```
     */
    toString(): string;
}
export default Chord;
