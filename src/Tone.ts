enum Halftone {
  A = 1,
  A$, // save as Bb
  Bb = 2,
  B,
  B$, // is C
  Cb = 3, // is B
  C,
  C$, //same as Db
  Db = 5,
  D,
  D$, // same as Eb
  Eb = 7,
  E,
  E$, // is F
  Fb = 8, // is E
  F,
  F$, // same as Gb
  Gb = 10,
  G,
  G$, // same as Ab
  Ab = 12,
}

export default Halftone;
