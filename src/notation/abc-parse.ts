/**
 * ABC notation import — the inverse of {@link toABC}.
 *
 * Two levels are offered. {@link abcToNote} and {@link noteToABC} convert a
 * single pitch, which is all most callers need: ABC writes middle C as `C`,
 * the octave above as `c`, and moves further with commas and apostrophes.
 * {@link fromABC} reads a whole tune — header fields plus the notes with
 * their rhythm, as a beat-timed stream — so that a tune rendered by this
 * library round-trips, and tunes from the wider ABC world land ready for
 * the sequence, analysis, and MIDI layers.
 *
 * Accidentals follow ABC's measure rule on the way in as well as out: an
 * inflection carries to the end of its measure, so `^F ... F` sounds F# twice.
 * Without that, imported tunes would silently lose sharps.
 *
 * This reads the musical content of a tune, not its every ornament:
 * decorations, slurs, grace notes, and lyrics are skipped rather than
 * modelled, and the note lines of a multi-voice tune are read one after
 * another rather than overlaid.
 */

import type { NoteEvent, NoteStream } from "../analysis/types";
import { keySignatureOf } from "../key/key";
import { Note } from "../note/note";
import type { Step } from "../pitch/spelled";
import {
  barWholeNotes,
  meterClass,
  tryParseTimeSignature,
} from "../rhythm/meter";
import { relativeTonic } from "../scale/modes";

const EPS = 1e-6;

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
  /** The `Q:` tempo in quarter-note beats per minute, when present. */
  readonly tempo?: number;
  /** Every written note in the body, in order; chords contribute all their
   * tones, and tied continuations appear as written. */
  readonly notes: Note[];
  /** The tune in time, measured in quarter-note beats: durations read
   * against the unit note length, rests as gaps, chords stacked at one
   * onset, tuplets scaled, and ties merged into single events. */
  readonly stream: NoteStream;
}

/** Header lines look like `X:1` — a single letter, a colon, then the value. */
const HEADER_PATTERN = /^([A-Za-z]):\s*(.*)$/;

/** One pitch inside a `[...]` chord, with an optional duration factor. */
const CHORD_PITCH = /(__|\^\^|_|\^|=)?([A-Ga-g])([,']*)(\d+)?(\/+)?(\d+)?/g;

/** One pitch in the open body, factor read separately. */
const PITCH_AT = /^(__|\^\^|_|\^|=)?([A-Ga-g])([,']*)/;

/** A duration factor: `2`, `3/2`, `/`, `//`, `/4`. Matches the empty string. */
const FACTOR = /(\d+)?(\/+)?(\d+)?/y;

/** Long and short multipliers for broken rhythms, by depth: `>` dots the
 * first note once, `>>` twice, `>>>` three times. */
const BROKEN_LONG = [3 / 2, 7 / 4, 15 / 8] as const;
const BROKEN_SHORT = [1 / 2, 1 / 4, 1 / 8] as const;

/** Default `q` for a bare `(p` tuplet, from the ABC standard's table; the
 * values missing here (5, 7, 9) depend on the meter instead. */
const TUPLET_Q: Readonly<Record<number, number>> = {
  2: 3,
  3: 2,
  4: 3,
  6: 2,
  8: 3,
};

/** A note, chord, or rest with its duration in unit note lengths. */
interface TimedToken {
  sounded: boolean;
  /** How far this token advances the clock, in units. */
  units: number;
  tones: { note: Note; units: number }[];
  tie: boolean;
}

function factorValue(
  num: string | undefined,
  slashes: string | undefined,
  den: string | undefined
): number {
  const n = num === undefined ? 1 : Number(num);
  const d =
    den !== undefined
      ? Number(den)
      : slashes !== undefined
        ? 2 ** slashes.length
        : 1;
  return n / d;
}

/** The `L:` field as a fraction of a whole note, or `null` to use the default. */
function parseUnitLength(field: string | undefined): number | null {
  if (field === undefined) return null;
  const match = /^(\d+)\s*\/\s*(\d+)$/.exec(field.trim());
  if (!match) return null;
  const value = Number(match[1]) / Number(match[2]);
  return value > 0 ? value : null;
}

/** The `Q:` field in quarter-note BPM: `1/4=120` scales by the named value,
 * a bare `120` counts unit note lengths per minute (the older form). */
function parseTempo(
  field: string | undefined,
  unitLength: number
): number | undefined {
  if (field === undefined) return undefined;
  const named = /(\d+)\s*\/\s*(\d+)\s*=\s*(\d+(?:\.\d+)?)/.exec(field);
  if (named) {
    return (Number(named[3]) * Number(named[1]) * 4) / Number(named[2]);
  }
  const bare = /^\s*(\d+(?:\.\d+)?)\s*$/.exec(field);
  if (bare) return Number(bare[1]) * unitLength * 4;
  return undefined;
}

/**
 * Read an ABC tune: header fields, pitches, and rhythm. Alongside `notes` —
 * every written pitch in order — the body becomes a beat-timed `stream`:
 * duration factors against the unit note length (`L:`, or the standard's
 * default from the meter), broken rhythms (`>` and `<`), rests as gaps,
 * `(p:q:r` tuplet groups, bracketed chords, and ties merged into single
 * events, ready for the sequence, analysis, and MIDI layers.
 *
 * Accidentals persist to the end of their measure, per ABC's rules; the
 * `K:` field seeds each measure's starting inflections, and a tied note
 * keeps its inflection across the barline.
 *
 * @example
 * ```ts
 * import { fromABC } from "musictheoryjs";
 * const tune = fromABC("X:1\nT:Scale\nM:4/4\nK:D\nD2 E2 F2 G2 |]");
 * tune.title; // => "Scale"
 * tune.key; // => "D"
 * // F is sharp because the key signature says so.
 * tune.notes.map(String); // => ["D4","E4","F#4","G4"]
 * // Two eighth-note units per note: one quarter-note beat each.
 * tune.stream.map((e) => e.start); // => [0, 1, 2, 3]
 * const jig = fromABC("X:1\nM:6/8\nQ:3/8=40\nK:C\nC2- C z2 c |]");
 * jig.tempo; // => 60
 * jig.stream.map((e) => [e.start, e.duration]); // => [[0, 1.5], [2.5, 0.5]]
 * ```
 */
export function fromABC(abc: string): ParsedABC {
  const headers: Record<string, string> = {};
  const bodyLines: string[] = [];
  for (const line of abc.split(/\r?\n/)) {
    const trimmed = line.replace(/%.*$/, "").trim();
    if (trimmed === "") continue;
    const header = HEADER_PATTERN.exec(trimmed);
    // `K:` closes the header in ABC; anything after it is body, even if a
    // later line happens to look like `A:` (a note followed by a colon).
    if (header && !("K" in headers)) {
      headers[header[1] as string] = (header[2] as string).trim();
      continue;
    }
    // Except lyric and voice lines, which carry words, not music.
    if (/^[wWV]:/.test(trimmed)) continue;
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

  const ts = headers.M === undefined ? null : tryParseTimeSignature(headers.M);
  // The standard's default unit: 1/16 when a bar is shorter than 3/4 of a
  // whole note, 1/8 otherwise (and when there is no meter to measure by).
  const unitLength =
    parseUnitLength(headers.L) ??
    (ts !== null && barWholeNotes(ts) < 0.75 ? 1 / 16 : 1 / 8);
  const compound = ts !== null && meterClass(ts) === "compound";
  const barUnits = (ts === null ? 1 : barWholeNotes(ts)) / unitLength;

  const tokens: TimedToken[] = [];
  const notes: Note[] = [];
  // Measure-local accidentals, letter+octave → alteration, cleared at bars.
  const measure = new Map<string, number>();
  // Inflections owed to tied-over notes; these survive the barline.
  const tiedAlteration = new Map<string, number>();
  let tuplet: { factor: number; left: number } | null = null;
  let broken: { longFirst: boolean; depth: number } | null = null;

  const resolve = (
    accidental: string,
    letter: string,
    octaveMarks: string
  ): Note => {
    const upper = letter.toUpperCase();
    let octave = letter === upper ? 4 : 5;
    for (const mark of octaveMarks) octave += mark === "'" ? 1 : -1;
    const key = `${upper}${octave}`;
    let alteration: number;
    if (accidental !== "") {
      alteration = ACCIDENTAL_VALUES.find(([m]) => m === accidental)?.[1] ?? 0;
      measure.set(key, alteration);
    } else {
      alteration =
        measure.get(key) ?? tiedAlteration.get(key) ?? signature[upper] ?? 0;
    }
    tiedAlteration.delete(key);
    return Note.of({ step: LETTER_STEP[upper] as Step, alteration, octave });
  };

  const scale = (token: TimedToken, factor: number): void => {
    token.units *= factor;
    for (const tone of token.tones) tone.units *= factor;
  };

  const push = (token: TimedToken): void => {
    if (tuplet !== null) {
      scale(token, tuplet.factor);
      tuplet = tuplet.left > 1 ? { ...tuplet, left: tuplet.left - 1 } : null;
    }
    if (broken !== null) {
      const prev = tokens[tokens.length - 1];
      if (prev !== undefined) {
        const depth = broken.depth - 1;
        const long = BROKEN_LONG[depth] as number;
        const short = BROKEN_SHORT[depth] as number;
        scale(prev, broken.longFirst ? long : short);
        scale(token, broken.longFirst ? short : long);
      }
      broken = null;
    }
    tokens.push(token);
  };

  const readFactor = (
    text: string,
    at: number
  ): { value: number; next: number } => {
    FACTOR.lastIndex = at;
    const match = FACTOR.exec(text);
    if (!match) return { value: 1, next: at };
    return {
      value: factorValue(match[1], match[2], match[3]),
      next: at + match[0].length,
    };
  };

  for (const line of bodyLines) {
    let i = 0;
    while (i < line.length) {
      const c = line[i] as string;
      if (/\s/.test(c)) {
        i++;
        continue;
      }
      if (c === '"' || c === "!" || c === "{") {
        // Chord symbols, decorations, grace notes: skip to the closer.
        const closer = c === "{" ? "}" : c;
        const end = line.indexOf(closer, i + 1);
        i = end === -1 ? line.length : end + 1;
        continue;
      }
      if (c === "|" || (c === ":" && /[|:]/.test(line[i + 1] ?? ""))) {
        while (i < line.length && /[|:\]]/.test(line[i] as string)) i++;
        if (/\d/.test(line[i] ?? "")) i++; // a volta number rides the bar
        measure.clear();
        continue;
      }
      if (c === "-") {
        const prev = tokens[tokens.length - 1];
        if (prev?.sounded) {
          prev.tie = true;
          for (const tone of prev.tones) {
            tiedAlteration.set(
              `${tone.note.letter}${tone.note.octave}`,
              tone.note.alteration
            );
          }
        }
        i++;
        continue;
      }
      if (c === ">" || c === "<") {
        let depth = 0;
        while (line[i] === c) {
          depth++;
          i++;
        }
        broken = { longFirst: c === ">", depth: Math.min(depth, 3) };
        continue;
      }
      if (c === "(") {
        const spec = /^\((\d+)(?::(\d*))?(?::(\d*))?/.exec(line.slice(i));
        if (spec) {
          const p = Number(spec[1]);
          const q = spec[2]
            ? Number(spec[2])
            : (TUPLET_Q[p] ?? (compound ? 3 : 2));
          const r = spec[3] ? Number(spec[3]) : p;
          tuplet = { factor: q / p, left: r };
          i += spec[0].length;
        } else {
          i++; // a slur
        }
        continue;
      }
      if (c === ")" || c === "]" || c === ":") {
        i++;
        continue;
      }
      if (c === "[") {
        const rest = line.slice(i + 1);
        if (rest.startsWith("|")) {
          i += 2;
          measure.clear();
          continue;
        }
        if (/^\d/.test(rest)) {
          i += 2; // a volta bracket: `[1`, `[2`
          continue;
        }
        if (/^[A-Za-z]:/.test(rest)) {
          const end = line.indexOf("]", i); // an inline field: `[K:G]`
          i = end === -1 ? line.length : end + 1;
          continue;
        }
        const end = line.indexOf("]", i);
        if (end === -1) {
          i++;
          continue;
        }
        const inner = line.slice(i + 1, end);
        const tones: { note: Note; units: number }[] = [];
        CHORD_PITCH.lastIndex = 0;
        let pm = CHORD_PITCH.exec(inner);
        while (pm !== null) {
          tones.push({
            note: resolve(pm[1] ?? "", pm[2] as string, pm[3] ?? ""),
            units: factorValue(pm[4], pm[5], pm[6]),
          });
          pm = CHORD_PITCH.exec(inner);
        }
        const outer = readFactor(line, end + 1);
        i = outer.next;
        if (tones.length > 0) {
          for (const tone of tones) {
            tone.units *= outer.value;
            notes.push(tone.note);
          }
          push({
            sounded: true,
            units: (tones[0] as { units: number }).units,
            tones,
            tie: false,
          });
        }
        continue;
      }
      if (c === "z" || c === "x" || c === "Z") {
        const { value, next } = readFactor(line, i + 1);
        i = next;
        push({
          sounded: false,
          units: c === "Z" ? value * barUnits : value,
          tones: [],
          tie: false,
        });
        continue;
      }
      const pm = PITCH_AT.exec(line.slice(i));
      if (pm) {
        const { value, next } = readFactor(line, i + pm[0].length);
        i = next;
        const note = resolve(pm[1] ?? "", pm[2] as string, pm[3] ?? "");
        notes.push(note);
        push({
          sounded: true,
          units: value,
          tones: [{ note, units: value }],
          tie: false,
        });
        continue;
      }
      i++; // anything else — a stray ornament letter — is not music
    }
  }

  // Lay the tokens on the clock and merge ties into single events.
  const beatsPerUnit = unitLength * 4;
  const events: NoteEvent[] = [];
  const open = new Map<string, number>(); // pitch name → index in events
  let at = 0;
  for (const token of tokens) {
    for (const tone of token.tones) {
      const beats = tone.units * beatsPerUnit;
      const name = tone.note.toString();
      const tiedIndex = open.get(name);
      const prev = tiedIndex === undefined ? undefined : events[tiedIndex];
      if (
        prev !== undefined &&
        Math.abs(prev.start + prev.duration - at) < EPS
      ) {
        events[tiedIndex as number] = {
          ...prev,
          duration: prev.duration + beats,
        };
        if (!token.tie) open.delete(name);
      } else {
        events.push({ pitch: tone.note, start: at, duration: beats });
        if (token.tie) open.set(name, events.length - 1);
      }
    }
    at += token.units * beatsPerUnit;
  }

  const tempo = parseTempo(headers.Q, unitLength);
  const result: ParsedABC = {
    notes,
    stream: events,
    ...(headers.T === undefined ? {} : { title: headers.T }),
    ...(headers.M === undefined ? {} : { meter: headers.M }),
    ...(keyField === undefined ? {} : { key: keyField }),
    ...(tempo === undefined ? {} : { tempo }),
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
