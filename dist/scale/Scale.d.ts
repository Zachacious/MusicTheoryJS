import Semitone from "../Semitone";
import ScaleInitializer from "./ScaleInitializer";
import Note from "../Note/Note";
import Entity from "../Entity";
/**
 * Scales consist of a key(tonic or root) and a template(array of integers) that
 * <br> represents the interval of steps between each note.
 * <br><br>Scale intervals are represented by an integer
 * <br>that is the number of semitones between each note.
 * <br>0 = key - will always represent the tonic
 * <br>1 = half step
 * <br>2 = whole step
 * <br>3 = one and one half steps
 * <br>4 = double step
 * <br>[0, 2, 2, 1, 2, 2, 2] represents the major scale
 * <br><br> Scale templates may have arbitray lengths
 *
 * The following Pre-defined templates are available:
 * <table>
 * <tr>
 * <td>major</td>
 * <td>minor</td>
 * <td>ionian</td>
 * <td>dorian</td>
 * </tr><tr>
 * <td>phrygian</td>
 * <td>lydian</td>
 * <td>mixolydian</td>
 * <td>aeolian</td>
 * </tr><tr>
 * <td>locrian</td>
 * <td>enigmaticMajor</td>
 * <td>enigmaticMinor</td>
 * <td>minor7b5</td>
 * </tr><tr>
 * <td>major7s4s5</td>
 * <td>harmonicMajor</td>
 * <td>harmonicMinor</td>
 * <td>doubleHarmonic</td>
 * </tr><tr>
 * <td>melodicMinorAscending</td>
 * <td>melodicMinorDescending</td>
 * <td>majorPentatonic</td>
 * <td>majorPentatonicBlues</td>
 * </tr><tr>
 * <td>minorPentatonic</td>
 * <td>minorPentatonicBlues</td>
 * <td>b5Pentatonic</td>
 * <td>minor6Pentatonic</td>
 * </tr><tr>
 * <td>dim8Tone</td>
 * <td>dom8Tone</td>
 * <td>neopolitanMajor</td>
 * <td>neopolitanMinor</td>
 * </tr><tr>
 * <td>hungarianMajor</td>
 * <td>hungarianMinor</td>
 * <td>hungarianGypsy</td>
 * <td>spanish</td>
 * </tr><tr>
 * <td>spanish8Tone</td>
 * <td>spanishGypsy</td>
 * <td>augmented</td>
 * <td>dominantSuspended</td>
 * </tr><tr>
 * <td>bebopMajor</td>
 * <td>bebopDominant</td>
 * <td>mystic</td>
 * <td>overtone</td>
 * </tr><tr>
 * <td>leadingTone</td>
 * <td>hirojoshi</td>
 * <td>japaneseA</td>
 * <td>japaneseB</td>
 * </tr><tr>
 * <td>oriental</td>
 * <td>arabian</td>
 * <td>persian</td>
 * <td>balinese</td>
 * </tr><tr>
 * <td>kumoi</td>
 * <td>pelog</td>
 * <td>algerian</td>
 * <td>chinese</td>
 * </tr><tr>
 * <td>mongolian</td>
 * <td>egyptian</td>
 * <td>hindu</td>
 * <td>romanian</td>
 * </tr><tr>
 * <td>hindu</td>
 * <td>insen</td>
 * <td>iwato</td>
 * <td>scottish</td>
 * </tr><tr>
 * <td>yo</td>
 * <td>istrian</td>
 * <td>ukranianDorian</td>
 * <td>petrushka</td>
 * </tr><tr>
 * <td>ahavaraba</td>
 * <td>halfDiminished</td>
 * <td>jewish</td>
 * <td>byzantine</td>
 * </tr><tr>
 * <td>acoustic</td>
 * </table>
 *
 * @example
 * ```javascript
 * import {Scale} from 'musictheoryjs';
 * import {ScaleTemplates} from 'musictheoryjs';
 * import {ScaleInitializer} from 'musictheoryjs'; // TypeScript only if needed
 * ```
 */
declare class Scale implements Entity {
    /**
     * @example
     * ```javascript
     * import {Scale, ScaleTemplates} from 'musictheoryjs';
     *
     * // creates a scale with the default template, key 0f 0(C) and an octave of 4
     * const scale = new Scale();
     *
     * // creates a scale with the template [0, 2, 2, 1, 2, 2, 2] and key 4(E) and octave 5
     * const scale2 = new Scale({key: 4, octave: 5, template: ScaleTemplates.major});
     *
     *
     * // String parsing should follow the format: note-name[alteration][octave][(scale-name)]
     * // creates a scale with the minor template, key Gb and an octave of 7
     * const scale3 = new Scale('Gb7(minor)');
     * ```
     */
    constructor(values?: ScaleInitializer | string);
    /**
     *  unique id for this scale(auto generated)
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.id); // dhlkj5j322
     * ```
     */
    id: string;
    /**
     * Returns true if this scale is equal to the given scale
     * @param scale - the scale to compare to
     * @returns true if the scales are equal
     * @example
     * ```javascript
     * const scale = new Scale();
     * const scale2 = new Scale();
     * console.log(scale.equals(scale2)); // true
     * ```
     */
    equals(scale: Scale): boolean;
    /**
     * Returns a copy of this Scale
     * @chainable
     * @returns a copy of this Scale
     * @example
     * ```javascript
     * const scale = new Scale();
     * const scale2 = scale.copy();
     * console.log(scale.equals(scale2)); // true
     * ```
     */
    copy(): Scale;
    /**
     * key
     */
    protected _key: Semitone;
    /**
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.key); // 0(semitone)
     * ```
     */
    get key(): Semitone;
    /**
     * Setting the semitone to a value outside of the range [0, 11](semitone) will<br/>
     * wrap the semitone to the range [0, 11] and change the octave depending<br/>
     * on how many times the semitone has been wrapped.
     * @example
     * ```javascript
     * const scale = new Scale();
     * scale.key = 4;
     * console.log(scale.key); // 4
     * ```
     */
    set key(value: Semitone);
    /**
     * octave
     */
    protected _octave: number;
    /**
     * The octave is clamped to the range [0, 9].
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.octave); // 4
     * ```
     */
    get octave(): number;
    /**
     * @example
     * ```javascript
     * const scale = new Scale();
     * scale.octave = 5;
     * console.log(scale.octave); // 5
     * ```
     */
    set octave(value: number);
    /**
     * template
     */
    protected _template: Array<number>;
    /**
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.template); // [0, 2, 2, 1, 2, 2, 2]
     * ```
     */
    get template(): Array<number>;
    /**
     * The following Pre-defined templates are available:
     * <table>
     * <tr>
     * <td>major</td>
     * <td>minor</td>
     * <td>ionian</td>
     * <td>dorian</td>
     * </tr><tr>
     * <td>phrygian</td>
     * <td>lydian</td>
     * <td>mixolydian</td>
     * <td>aeolian</td>
     * </tr><tr>
     * <td>locrian</td>
     * <td>enigmaticMajor</td>
     * <td>enigmaticMinor</td>
     * <td>minor7b5</td>
     * </tr><tr>
     * <td>major7s4s5</td>
     * <td>harmonicMajor</td>
     * <td>harmonicMinor</td>
     * <td>doubleHarmonic</td>
     * </tr><tr>
     * <td>melodicMinorAscending</td>
     * <td>melodicMinorDescending</td>
     * <td>majorPentatonic</td>
     * <td>majorPentatonicBlues</td>
     * </tr><tr>
     * <td>minorPentatonic</td>
     * <td>minorPentatonicBlues</td>
     * <td>b5Pentatonic</td>
     * <td>minor6Pentatonic</td>
     * </tr><tr>
     * <td>dim8Tone</td>
     * <td>dom8Tone</td>
     * <td>neopolitanMajor</td>
     * <td>neopolitanMinor</td>
     * </tr><tr>
     * <td>hungarianMajor</td>
     * <td>hungarianMinor</td>
     * <td>hungarianGypsy</td>
     * <td>spanish</td>
     * </tr><tr>
     * <td>spanish8Tone</td>
     * <td>spanishGypsy</td>
     * <td>augmented</td>
     * <td>dominantSuspended</td>
     * </tr><tr>
     * <td>bebopMajor</td>
     * <td>bebopDominant</td>
     * <td>mystic</td>
     * <td>overtone</td>
     * </tr><tr>
     * <td>leadingTone</td>
     * <td>hirojoshi</td>
     * <td>japaneseA</td>
     * <td>japaneseB</td>
     * </tr><tr>
     * <td>oriental</td>
     * <td>arabian</td>
     * <td>persian</td>
     * <td>balinese</td>
     * </tr><tr>
     * <td>kumoi</td>
     * <td>pelog</td>
     * <td>algerian</td>
     * <td>chinese</td>
     * </tr><tr>
     * <td>mongolian</td>
     * <td>egyptian</td>
     * <td>hindu</td>
     * <td>romanian</td>
     * </tr><tr>
     * <td>hindu</td>
     * <td>insen</td>
     * <td>iwato</td>
     * <td>scottish</td>
     * </tr><tr>
     * <td>yo</td>
     * <td>istrian</td>
     * <td>ukranianDorian</td>
     * <td>petrushka</td>
     * </tr><tr>
     * <td>ahavaraba</td>
     * <td>halfDiminished</td>
     * <td>jewish</td>
     * <td>byzantine</td>
     * </tr><tr>
     * <td>acoustic</td>
     * </table>
     * @example
     * ```javascript
     * const scale = new Scale();
     * scale.template = [0, 2, 2, 1, 2, 2, 2];
     * console.log(scale.template); // [0, 2, 2, 1, 2, 2, 2]
     * ```
     */
    set template(value: Array<number>);
    /**
     * notes
     * notes are generated and cached as needed
     */
    protected _notes: Array<Note>;
    protected _notesDirty: boolean;
    /**
     * will generate the notes if needed or return the cached notes
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.notes); // List of notes
     * ```
     */
    get notes(): Array<Note>;
    /**
     * generate notes(internal)
     * generates the notes for this scale
     */
    protected generateNotes(): void;
    /**
     * returns the names of the notes in the scale
     * @param preferSharpKeys - if true then sharps will be preferred over flats when semitones could be either - ex: Bb/A#
     * @returns the names of the notes in the scale
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.names); // ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']
     * ```
     */
    getNoteNames(preferSharpKey?: boolean): string[];
    /**
     * degree
     * returns a note that represents the given degree
     * @param degree - the degree to return
     * @returns a note that represents the given degree
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.degree(0)); // C4(Note)
     * console.log(scale.degree(1)); // D4(Note) etc
     * ```
     */
    degree(degree: number): Note;
    /**
     * relative major
     * returns a new scale that is the relative major of this scale - takes the 3rd degree as it's key
     * @chainable
     * @returns a new scale that is the relative major of this scale
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.relativeMajor()); // Scale
     * ```
     */
    relativeMajor(): Scale;
    /**
     * relative minor
     * returns a new scale that is the relative minor of this scale - takes the 6th degree as it's key
     * @chainable
     * @returns a new scale that is the relative minor of this scale
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.relativeMinor()); // Scale
     * ```
     */
    relativeMinor(): Scale;
    /**
     * shift
     */
    protected _shiftedInterval: number;
    protected _originalTemplate: Array<number>;
    /**
     * shift
     * shifts the scale by the given number of degrees
     * @chainable
     * @param shift - the number of degrees to shift the scale
     * @returns a new scale that is the shifted scale
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.shift(1)); // Scale
     * ```
     */
    shift(degrees?: number): Scale;
    /**
     * shifted
     * returns a copy of this scale shifted by the given number of degrees
     * @chainable
     * @param degrees - the number of degrees to shift the scale
     * @returns a copy of this scale shifted by the given number of degrees
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.shifted(1)); // Scale(copy)
     * ```
     */
    shifted(degrees?: number): Scale;
    /**
     * unshift
     * shifts the original root back to the root position
     * @chainable
     * @returns this scale after unshifting it back to the original root position
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.shift(1));
     * console.log(scale.unshift());
     * ```
     */
    unshift(): Scale;
    /**
     * unshifted
     * returns a copy of this scale with the tonic shifted back
     * to the root position
     * @chainable
     * @returns a copy of this scale with the tonic shifted back
     * to the root position
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.shift(1));
     * console.log(scale.unshifted()); // Scale(copy)
     * ```
     */
    unshifted(): Scale;
    /**
     * returns the amount that the scale has shifted
     * (0 if not shifted)
     * @returns the amount that the scale has shifted
     * (0 if not shifted)
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.shift(1));
     * console.log(scale.shifted()); // 1
     * ```
     */
    shiftedInterval(): number;
    /**
     * Scale modes
     */
    /**
     * @chainable
     * @returns a copy of this scale in the Ionian(major) mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.ionian()); // Scale(copy)
     * ```
     */
    ionian(): Scale;
    /**
     * @chainable
     * @returns a copy of this scale in the Dorian mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.dorian()); // Scale(copy)
     * ```
     */
    dorian(): Scale;
    /**
     * @chainable
     * @returns a copy of this scale in the Phrygian mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.phrygian()); // Scale(copy)
     * ```
     */
    phrygian(): Scale;
    /**
     * @chainable
     * @returns a copy of this scale in the Lydian mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.lydian()); // Scale(copy)
     * ```
     */
    lydian(): Scale;
    /**
     * @chainable
     * @returns a copy of this scale in the Mixolydian mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.mixolydian()); // Scale(copy)
     * ```
     */
    mixolydian(): Scale;
    /**
     * @chainable
     * @returns a copy of this scale in the Aeolian(minor) mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.aeolian()); // Scale(copy)
     * ```
     */
    aeolian(): Scale;
    /**
     * @chainable
     * @returns a copy of this scale in the Locrian mode
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.locrian()); // Scale(copy)
     * ```
     */
    locrian(): Scale;
    /**
     * returns string version of the scale
     * @returns string version of the scale
     * @example
     * ```javascript
     * const scale = new Scale();
     * console.log(scale.toString()); // 'C'
     * ```
     */
    toString(): string;
    /**
     * attempts to lookup the note name for a scale efficiently
     * @static
     * @param scale - the scale to lookup
     * @param preferSharpKey - if true, will prefer sharp keys over flat keys
     * @returns the note name for the scale
     * @internal
     */
    protected static scaleNoteNameLookup(scale: Scale, preferSharpKey?: boolean): string[];
    /**
     * creates a lookup table for all notes formatted as [A-G][#|b|s][0-9]
     */
    protected static createNotesLookupTable(): {
        [key: string]: string[];
    };
    /**
     * creates the lookup table as soon as the module is loaded
     */
    protected static _notesLookup: {
        [key: string]: string[];
    };
    /**
     * used to initialize the lookup table
     * @internal
     */
    static init(): Promise<void>;
}
export default Scale;
