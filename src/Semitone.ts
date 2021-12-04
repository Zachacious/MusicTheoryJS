//**********************************************************
/**
 * Notes starting at C0 - zero index - 12 total
 */
//**********************************************************
enum Semitone {
   A = 9,
   As, // save as Bb
   Bb = 10,
   B,
   Bs = 0, // is C
   Cb = 11, // is B
   C = 0,
   Cs, //same as Db
   Db = 1,
   D,
   Ds, // same as Eb
   Eb = 3,
   E,
   Es, // is F
   Fb = 4, // is E
   F,
   Fs, // same as Gb
   Gb = 6,
   G,
   Gs, // same as Ab
   Ab = 8,
}

//**********************************************************
/**
 * Returns the whole note name (e.g. C, D, E, F, G, A, B) for
 * the given string
 */
//**********************************************************
const getWholeToneFromName = (name: string): Semitone => {
   if (!name || name.length === 0 || name.length > 1)
      throw new Error("Invalid name");
   const key = name[0].toUpperCase();

   return Semitone[key as keyof typeof Semitone];
};

export default Semitone;
export { getWholeToneFromName };
