// enum Halftone {
//   A = 0,
//   As, // save as Bb
//   Bb = 1,
//   B,
//   Bs, // is C
//   Cb = 2, // is B
//   C,
//   Cs, //same as Db
//   Db = 4,
//   D,
//   Ds, // same as Eb
//   Eb = 6,
//   E,
//   Es, // is F
//   Fb = 7, // is E
//   F,
//   Fs, // same as Gb
//   Gb = 9,
//   G,
//   Gs, // same as Ab
//   Ab = 11,
// }

enum Halftone {
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

export default Halftone;
