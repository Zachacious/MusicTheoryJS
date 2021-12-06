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

const SemitoneNames: { [key: string]: number } = {
   A: 9,
   "As/Bb": 10,
   "B/Cb": 11,
   "Bs/C": 0,
   "Cs/Db": 1,
   D: 2,
   "Ds/Eb": 3,
   "E/Fb": 4,
   "Es/F": 5,
   "Fs/Gb": 6,
   G: 7,
   "Gs/Ab": 8,
};

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

const getNameForSemitone = (
   semitone: Semitone,
   preferredWholeNote?: string
): string => {
   const values: number[] = Object.values(SemitoneNames);
   const nameIndex = values.findIndex((v) => v === semitone);
   const wholeName = Object.keys(SemitoneNames)[nameIndex];
   const nameParts = wholeName.split("/");
   if (nameParts.length === 1) return nameParts[0];
   if (!preferredWholeNote) return wholeName;
   for (const part of nameParts) {
      if (part.includes(preferredWholeNote)) return part;
   }

   return wholeName;
};

export default Semitone;
export { getWholeToneFromName, getNameForSemitone };
