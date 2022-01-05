/**
 * represents an array of intervals<br>
 * can have single integers like [0, 2, 4, 5, 7, 9, 11]<br>
 * or can have a neted array represent a modifier for the note<br>
 * like [1, [2, Modifier.flat], 4, 5, [7, Modifier.flat], 9, [11, Modifier.sharp]]
 * @type
 * [['Chord']]
 */
type ChordInterval = number | number[];

export default ChordInterval;
