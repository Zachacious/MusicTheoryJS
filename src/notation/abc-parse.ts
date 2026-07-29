/**
 * ABC notation import — the inverse of {@link toABC}.
 *
 * Two levels are offered. {@link abcToNote} and {@link noteToABC} convert a
 * single pitch, which is all most callers need: ABC writes middle C as `C`,
 * the octave above as `c`, and moves further with commas and apostrophes.
 * {@link fromABC} reads a whole tune — header fields plus the note stream —
 * so that a tune rendered by this library can be read back.
 *
 * Accidentals follow ABC's measure rule on the way in as well as out: an
 * inflection carries to the end of its measure, so `^F ... F` sounds F# twice.
 * Without that, imported tunes would silently lose sharps.
 *
 * This reads the pitch content of a tune, not its every ornament: decorations,
 * slurs, grace notes, and lyrics are skipped rather than modelled.
 */

import { keySignatureOf } from "../key/key";
import { Note } from "../note/note";
import type { Step } from "../pitch/spelled";
import { relativeTonic } from "../scale/modes";

/** ABC's accidental marks, in the order they must be matched (longest first). */
const ACCIDENTAL_VALUES: ReadonlyArray<readonly [string, number]> = [
  ["__", -2],
  ["^^", 2],
  ["_", -1],
  ["^", 1],
  ["=", 0],
];

/** A single ABC pitch, split into its parts. */
export interface ABCPitchTokens {
  /** The accidental mark, or `""` when none is written. */
  readonly accidental: string;
  /** The bare letter, as written (case carries octave information). */
  readonly letter: string;
  /** The octave marks: commas lower, apostrophes raise. */
  readonly octave: string;
}

const PITCH_PATTERN = /^(__|\^\^|_|\^|=)?([A-Ga-g])([,']*)$/;

/**
 * Split an ABC pitch into accidental, letter, and octave marks without
 * interpreting them. Returns `null` when the string is not a pitch.
 *
 * @example
 * ```ts
 * import { tokenizeABC } from "musictheoryjs";
 * tokenizeABC("^F"); // => { accidental: "^", letter: "F", octave: "" }
 * tokenizeABC("c'"); // => { accidental: "", letter: "c", octave: "'" }
 * tokenizeABC("x"); // => null
 * ```
 */
export function tokenizeABC(abc: string): ABCPitchTokens | null {
  const match = PITCH_PATTERN.exec(abc.trim());
  if (!match) return null;
  const [, accidental = "", letter = "", octave = ""] = match;
  return { accidental, letter, octave };
}

const LETTER_STEP: Readonly<Record<string, Step>> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

/**
 * Read a single ABC pitch as a {@link Note}. Uppercase letters are the octave
 * starting at middle C, lowercase the octave above; each `,` drops an octave
 * and each `'` raises one.
 *
 * Pass `signature` — letter to alteration, as a key signature supplies — to
 * inflect letters that carry no explicit accidental.
 *
 * @example
 * ```ts
 * import { abcToNote } from "musictheoryjs";
 * abcToNote("C").toString(); // => "C4"
 * abcToNote("c").toString(); // => "C5"
 * abcToNote("C,").toString(); // => "C3"
 * abcToNote("^F").toString(); // => "F#4"
 * abcToNote("_B").toString(); // => "Bb4"
 * abcToNote("F", { F: 1 }).toString(); // => "F#4"
 * ```
 */
export function abcToNote(
  abc: string,
  signature: Readonly<Record<string, number>> = {}
): Note {
  const tokens = tokenizeABC(abc);
  if (!tokens) throw new SyntaxError(`invalid ABC pitch: "${abc}"`);
  const upper = tokens.letter.toUpperCase();
  const step = LETTER_STEP[upper] as Step;
  // Case sets the register: uppercase is the octave from middle C up.
  let octave = tokens.letter === upper ? 4 : 5;
  for (const mark of tokens.octave) octave += mark === "'" ? 1 : -1;
  const explicit = ACCIDENTAL_VALUES.find(
    ([mark]) => mark === tokens.accidental
  );
  const alteration = explicit ? explicit[1] : (signature[upper] ?? 0);
  return Note.of({ step, alteration, octave });
}

/**
 * Write a {@link Note} as an ABC pitch, always spelling the accidental
 * explicitly so the result stands alone without a key signature.
 *
 * @example
 * ```ts
 * import { noteToABC } from "musictheoryjs";
 * noteToABC("C4"); // => "C"
 * noteToABC("C5"); // => "c"
 * noteToABC("C3"); // => "C,"
 * noteToABC("F#4"); // => "^F"
 * noteToABC("Bb5"); // => "_b"
 * ```
 */
export function noteToABC(note: Note | string): string {
  const n = Note.from(note);
  const mark = ACCIDENTAL_VALUES.find(([, value]) => value === n.alteration);
  if (n.alteration !== 0 && !mark) {
    throw new RangeError(
      `cannot notate an alteration of ${n.alteration} semitones in ABC`
    );
  }
  const inflect = n.alteration === 0 ? "" : (mark?.[0] ?? "");
  const body =
    n.octave >= 5
      ? n.letter.toLowerCase() + "'".repeat(n.octave - 5)
      : n.letter + ",".repeat(4 - n.octave);
  return inflect + body;
}

/** A tune read from ABC. Header fields are reported as written. */
export interface ParsedABC {
  /** The `T:` title field, when present. */
  readonly title?: string;
  /** The `M:` meter field, e.g. `"4/4"`. */
  readonly meter?: string;
  /** The `K:` key field, e.g. `"D"`. */
  readonly key?: string;
  /** Every note in the body, in order; chords contribute all their tones. */
  readonly notes: Note[];
}

/** Header lines look like `X:1` — a single letter, a colon, then the value. */
const HEADER_PATTERN = /^([A-Za-z]):\s*(.*)$/;

/** One note in the body, with any accidental and octave marks attached. */
const BODY_PITCH = /(__|\^\^|_|\^|=)?([A-Ga-g])([,']*)/g;

/**
 * Read an ABC tune: its header fields and the notes of its body. Rests, bar
 * lines, and durations are recognised well enough to be skipped; notes inside
 * `[...]` chords are all collected, in written order.
 *
 * Accidentals persist to the end of their measure, per ABC's rules, and the
 * `K:` field seeds each measure's starting inflections.
 *
 * @example
 * ```ts
 * import { fromABC } from "musictheoryjs";
 * const tune = fromABC("X:1\nT:Scale\nM:4/4\nK:D\nD2 E2 F2 G2 |]");
 * tune.title; // => "Scale"
 * tune.key; // => "D"
 * // F is sharp because the key signature says so.
 * tune.notes.map(String); // => ["D4","E4","F#4","G4"]
 * ```
 */
export function fromABC(abc: string): ParsedABC {
  const headers: Record<string, string> = {};
  const bodyLines: string[] = [];
  for (const line of abc.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    const header = HEADER_PATTERN.exec(trimmed);
    // `K:` closes the header in ABC; anything after it is body, even if a
    // later line happens to look like `A:` (a note followed by a colon).
    if (header && !("K" in headers)) {
      headers[header[1] as string] = (header[2] as string).trim();
      continue;
    }
    bodyLines.push(trimmed);
  }

  const signature: Record<string, number> = {};
  const keyField = headers.K;
  if (keyField) {
    // Reuse the key module so modes and accidental counts stay consistent
    // with what the exporter writes; an unparseable field just means no
    // signature rather than a failed import.
    try {
      for (const acc of keySignatureOf(abcKeyToName(keyField)).accidentals) {
        signature[acc.letter] = acc.alteration;
      }
    } catch {
      // Leave the signature empty.
    }
  }

  const notes: Note[] = [];
  for (const line of bodyLines) {
    // Measure-local accidentals reset at every bar line.
    for (const measure of line.split(/\|+/)) {
      const state = new Map<string, number>();
      const stripped = measure
        .replace(/"[^"]*"/g, "") // chord symbols above the staff
        .replace(/![^!]*!/g, "") // decorations
        .replace(/\([0-9]+(:[0-9]*)*/g, ""); // tuplet markers
      BODY_PITCH.lastIndex = 0;
      let match = BODY_PITCH.exec(stripped);
      while (match !== null) {
        const [, accidental = "", letter = "", octaveMarks = ""] = match;
        const upper = letter.toUpperCase();
        let octave = letter === upper ? 4 : 5;
        for (const mark of octaveMarks) octave += mark === "'" ? 1 : -1;
        const key = `${upper}${octave}`;
        let alteration: number;
        if (accidental !== "") {
          alteration =
            ACCIDENTAL_VALUES.find(([m]) => m === accidental)?.[1] ?? 0;
          state.set(key, alteration);
        } else {
          alteration = state.get(key) ?? signature[upper] ?? 0;
        }
        notes.push(
          Note.of({ step: LETTER_STEP[upper] as Step, alteration, octave })
        );
        match = BODY_PITCH.exec(stripped);
      }
    }
  }

  const result: ParsedABC = {
    notes,
    ...(headers.T === undefined ? {} : { title: headers.T }),
    ...(headers.M === undefined ? {} : { meter: headers.M }),
    ...(keyField === undefined ? {} : { key: keyField }),
  };
  return result;
}

/** The modal suffixes an ABC `K:` field may carry, by their first three letters. */
const ABC_MODES: Readonly<Record<string, string>> = {
  dor: "dorian",
  phr: "phrygian",
  lyd: "lydian",
  mix: "mixolydian",
  loc: "locrian",
  ion: "major",
};

/**
 * Turn an ABC key field into a key name this library can read. Modes other
 * than major and minor carry the key signature of a *different* major key — E
 * dorian is spelled with D major's two sharps — so they are resolved to that
 * relative major rather than handed over as-is.
 */
function abcKeyToName(field: string): string {
  const match = /^([A-G][#b]?)\s*(.*)$/.exec(field.trim());
  if (!match) return field;
  const [, tonic = "", modeRaw = ""] = match;
  const mode = modeRaw.toLowerCase().slice(0, 3);
  if (mode === "" || mode === "maj" || mode === "ion") return `${tonic} major`;
  if (mode === "m" || mode === "min" || mode === "aeo") return `${tonic} minor`;
  const name = ABC_MODES[mode];
  if (!name) return `${tonic} major`;
  // The major key sharing this mode's signature.
  return `${relativeTonic(name, "major", `${tonic}4`).toString({
    octave: false,
  })} major`;
}
