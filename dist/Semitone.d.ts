/**
 * Notes starting at C0 - zero index - 12 total
 * Maps note names to semitone values starting at C=0
 * @enum
 */
declare enum Semitone {
    A = 9,
    As = 10,
    Bb = 10,
    B = 11,
    Bs = 0,
    Cb = 11,
    C = 0,
    Cs = 1,
    Db = 1,
    D = 2,
    Ds = 3,
    Eb = 3,
    E = 4,
    Es = 5,
    Fb = 4,
    F = 5,
    Fs = 6,
    Gb = 6,
    G = 7,
    Gs = 8,
    Ab = 8
}
/**
 * Returns the whole note name (e.g. C, D, E, F, G, A, B) for
 * the given string
 * @internal
 */
declare const getWholeToneFromName: (name: string) => Semitone;
/**
 * Returns a string version of the given semitone
 * if prefered whole note is set, it will return the note that
 * best matches that (for ex: Fs/Gb will return F# if prefered)
 * @internal
 */
declare const getNameForSemitone: (semitone: Semitone, preferredWholeNote?: string | undefined) => string;
export default Semitone;
export { getWholeToneFromName, getNameForSemitone };
