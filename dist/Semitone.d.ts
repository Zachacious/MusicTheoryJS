/**
 * Notes starting at C0 - zero index - 12 total
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
 */
declare const getWholeToneFromName: (name: string) => Semitone;
export default Semitone;
export { getWholeToneFromName };
