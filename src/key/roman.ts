/**
 * Roman numerals as a standalone, round-trippable representation.
 *
 * A numeral parses key-independently — the symbol itself carries the degree,
 * accidental, quality (case, `°`/`ø`/`+` markers, and any chord-quality
 * suffix from the chord dictionary), figured-bass inversion (`6`, `64`,
 * `65`, `43`, `42`), and secondary function (`V7/V`, `vii°7/V`). Keys enter
 * only when resolving to or from concrete chords with {@link romanToChord}
 * and {@link chordToRoman}.
 *
 * `parseRomanNumeral` and `formatRomanNumeral` round-trip: formatting a
 * parsed numeral yields its canonical symbol, and parsing that symbol yields
 * an equal numeral.
 *
 * This module is the analytical layer; `Key.romanNumeral` remains the loose
 * display labeller (it tolerates inversions and unknown colours by dropping
 * detail, which parsing must not).
 */

import { detectQuality } from "../chord/analysis";
import { Chord, type ChordLike } from "../chord/chord";
import { normalizeChordQuality } from "../chord/parse";
import {
  CHORD_SUFFIXES,
  CHORD_TEMPLATES,
  type ChordQuality,
  chordTemplate,
} from "../chord/templates";
import { interval, negateInterval, transpose } from "../interval/interval";
import { Note } from "../note/note";
import { STEP_SEMITONES } from "../pitch/spelled";
import { scaleChord } from "../scale/harmony";
import { Key, type KeyLike } from "./key";
import type { MinorVariant } from "./key";

/** A parsed roman numeral. Instances are frozen. */
export interface RomanNumeral {
  /** Canonical symbol, e.g. `"bVII"`, `"iiø7"`, `"V65"`, `"V7/V"`. */
  readonly symbol: string;
  /** Scale degree 1–7 (of the tonicized target for secondary functions). */
  readonly degree: number;
  /** Chromatic alteration of the degree root: `"bIII"` → -1. */
  readonly alteration: number;
  /** The chord quality the numeral spells, canonical. */
  readonly quality: ChordQuality;
  /** Inversion from figured bass: 0 root position … 3 third inversion. */
  readonly inversion: number;
  /** The tonicized target: `"V7/V"` has secondary `V`. `null` when plain. */
  readonly secondary: RomanNumeral | null;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

const HEAD_REGEX =
  /^([#♯]+|[b♭]+)?(VII|VI|IV|III|II|I|V|vii|vi|iv|iii|ii|i|v)(°|˚|o|ø|Ø|\+)?(.*)$/u;

/** figure → [inversion, implies a seventh]. */
const FIGURES: Readonly<Record<string, readonly [number, boolean]>> = {
  "": [0, false],
  "6": [1, false],
  "64": [2, false],
  "7": [0, true],
  "65": [1, true],
  "43": [2, true],
  "42": [3, true],
  "2": [3, true],
};

function qualityFor(
  lower: boolean,
  marker: string,
  suffix: string,
  seventhImplied: boolean,
  context: string
): ChordQuality {
  const fail = (): never => {
    throw new SyntaxError(
      `unknown chord quality "${marker}${suffix}" in Roman numeral "${context}"`
    );
  };
  if (marker === "ø") {
    if (suffix !== "" && suffix !== "7") fail();
    return "min7b5";
  }
  if (marker === "°") {
    if (suffix === "") return seventhImplied ? "dim7" : "dim";
    if (suffix === "7") return "dim7";
    return (
      normalizeChordQuality(`dim${suffix}`) ??
      normalizeChordQuality(`°${suffix}`) ??
      fail()
    );
  }
  if (marker === "+") {
    if (suffix === "") return seventhImplied ? "aug7" : "aug";
    if (suffix === "7") return "aug7";
    return (
      normalizeChordQuality(`aug${suffix}`) ??
      normalizeChordQuality(`+${suffix}`) ??
      fail()
    );
  }
  if (suffix === "") {
    if (seventhImplied) return lower ? "min7" : "dom7";
    return lower ? "min" : "maj";
  }
  if (lower) {
    // "ii9" reads as m9, "iimaj7" as mMaj7 — the case prefixes the quality.
    const candidates = [`m${suffix}`];
    if (suffix.startsWith("maj")) candidates.push(`mMaj${suffix.slice(3)}`);
    if (suffix.startsWith("M")) candidates.push(`mM${suffix.slice(1)}`);
    for (const candidate of candidates) {
      const q = normalizeChordQuality(candidate);
      if (q !== null) return q;
    }
  }
  return normalizeChordQuality(suffix) ?? fail();
}

/** Numeral rendering parts for a quality: case, marker, and suffix. */
function renderParts(quality: ChordQuality): {
  lower: boolean;
  marker: string;
  suffix: string;
} {
  switch (quality) {
    case "maj":
      return { lower: false, marker: "", suffix: "" };
    case "min":
      return { lower: true, marker: "", suffix: "" };
    case "dim":
      return { lower: true, marker: "°", suffix: "" };
    case "aug":
      return { lower: false, marker: "+", suffix: "" };
    case "dom7":
      return { lower: false, marker: "", suffix: "7" };
    case "min7":
      return { lower: true, marker: "", suffix: "7" };
    case "dim7":
      return { lower: true, marker: "°", suffix: "7" };
    case "min7b5":
      return { lower: true, marker: "ø", suffix: "7" };
    case "aug7":
      return { lower: false, marker: "+", suffix: "7" };
    case "maj7":
      return { lower: false, marker: "", suffix: "maj7" };
    case "minMaj7":
      return { lower: true, marker: "", suffix: "maj7" };
    case "maj6":
      // "I6" would read as a first-inversion figure; "add6" is unambiguous.
      return { lower: false, marker: "", suffix: "add6" };
    default:
      break;
  }
  // A quality registered at runtime may have no suffix entry; fall back to
  // its canonical name, which always parses back to itself.
  const display = CHORD_SUFFIXES[quality] ?? quality;
  const tryParts = (lower: boolean, suffix: string): boolean => {
    if (suffix === "" || Object.hasOwn(FIGURES, suffix)) return false;
    try {
      return qualityFor(lower, "", suffix, false, suffix) === quality;
    } catch {
      return false;
    }
  };
  if (quality.startsWith("min") && display.startsWith("m")) {
    const stripped = display.slice(1);
    if (tryParts(true, stripped)) {
      return { lower: true, marker: "", suffix: stripped };
    }
    if (tryParts(true, display)) {
      return { lower: true, marker: "", suffix: display };
    }
  }
  if (tryParts(false, display)) {
    return { lower: false, marker: "", suffix: display };
  }
  // The canonical name always parses back to itself.
  return { lower: false, marker: "", suffix: quality };
}

const TRIAD_FIGURES = ["", "6", "64"] as const;
const SEVENTH_FIGURES = ["7", "65", "43", "42"] as const;

function formatParts(
  degree: number,
  alteration: number,
  quality: ChordQuality,
  inversion: number,
  secondary: RomanNumeral | null
): string {
  const { lower, marker, suffix } = renderParts(quality);
  const base = ROMAN[degree - 1] as string;
  const numeral = lower ? base.toLowerCase() : base;
  let body: string;
  if (inversion === 0) {
    body = `${numeral}${marker}${suffix}`;
  } else if (suffix === "" && inversion < TRIAD_FIGURES.length) {
    body = `${numeral}${marker}${TRIAD_FIGURES[inversion]}`;
  } else if (suffix === "7" && inversion < 4) {
    body = `${numeral}${marker}${SEVENTH_FIGURES[inversion]}`;
  } else {
    throw new RangeError(
      `inversion ${inversion} of quality "${quality}" has no figured-bass spelling`
    );
  }
  const prefix =
    alteration > 0 ? "#".repeat(alteration) : "b".repeat(-alteration);
  const tail = secondary === null ? "" : `/${secondary.symbol}`;
  return `${prefix}${body}${tail}`;
}

function makeRoman(
  degree: number,
  alteration: number,
  quality: ChordQuality,
  inversion: number,
  secondary: RomanNumeral | null
): RomanNumeral {
  return Object.freeze({
    symbol: formatParts(degree, alteration, quality, inversion, secondary),
    degree,
    alteration,
    quality,
    inversion,
    secondary,
  });
}

/** Parse a slash-free head; returns `null` when it isn't one numeral. */
function tryParseHead(
  input: string,
  secondary: RomanNumeral | null
): RomanNumeral | null {
  const m = HEAD_REGEX.exec(input);
  if (m === null) return null;
  const [, prefix = "", numeralRaw = "", markerRaw = "", rest = ""] = m;
  const alteration =
    prefix.length === 0
      ? 0
      : /[#♯]/.test(prefix)
        ? prefix.length
        : -prefix.length;
  const lower = numeralRaw === numeralRaw.toLowerCase();
  const degree = ROMAN.indexOf(
    numeralRaw.toUpperCase() as (typeof ROMAN)[number]
  );
  const marker = markerRaw.replace(/[o˚]/u, "°").replace("Ø", "ø");
  try {
    const figure = FIGURES[rest];
    if (figure !== undefined) {
      const [inversion, seventh] = figure;
      const quality = qualityFor(lower, marker, "", seventh, input);
      return makeRoman(degree + 1, alteration, quality, inversion, secondary);
    }
    const quality = qualityFor(lower, marker, rest, false, input);
    return makeRoman(degree + 1, alteration, quality, 0, secondary);
  } catch {
    return null;
  }
}

function parseOne(input: string, context: string): RomanNumeral {
  // Whole-string first, so quality suffixes containing "/" ("ii6/9") work;
  // only then treat "/" as a secondary function ("V7/V").
  const whole = tryParseHead(input, null);
  if (whole !== null) return whole;
  const slash = input.indexOf("/");
  if (slash !== -1) {
    const secondary = parseOne(input.slice(slash + 1), context);
    const head = tryParseHead(input.slice(0, slash), secondary);
    if (head !== null) return head;
  }
  throw new SyntaxError(
    `invalid Roman numeral: "${context}" (expected forms like "V7", "ii", "bVII", "viiø7", "V65", or "V7/V")`
  );
}

/**
 * Parse a Roman numeral into its parts: degree, accidental, quality (case,
 * `°`/`ø`/`+` markers, and any chord-dictionary suffix), figured-bass
 * inversion, and secondary function. The `symbol` field is the canonical
 * spelling, so parse and {@link formatRomanNumeral} round-trip.
 * @throws {SyntaxError} when the input is not a Roman numeral.
 *
 * @example
 * ```ts
 * import { parseRomanNumeral } from "musictheoryjs";
 * parseRomanNumeral("bVII").degree; // => 7
 * parseRomanNumeral("bVII").alteration; // => -1
 * parseRomanNumeral("iiø7").quality; // => "min7b5"
 * parseRomanNumeral("V65").inversion; // => 1
 * parseRomanNumeral("V7/V").secondary?.symbol; // => "V"
 * parseRomanNumeral("viio7").symbol; // => "vii°7"
 * ```
 */
export function parseRomanNumeral(input: string): RomanNumeral {
  const trimmed = input.trim();
  return parseOne(trimmed, trimmed);
}

/**
 * Parse a Roman numeral, or return `null` when the input is not one.
 *
 * @example
 * ```ts
 * import { tryParseRomanNumeral } from "musictheoryjs";
 * tryParseRomanNumeral("V7")?.quality; // => "dom7"
 * tryParseRomanNumeral("nope"); // => null
 * ```
 */
export function tryParseRomanNumeral(input: string): RomanNumeral | null {
  try {
    return parseRomanNumeral(input);
  } catch {
    return null;
  }
}

/**
 * The canonical symbol of a numeral built or modified in code — the inverse
 * of {@link parseRomanNumeral}.
 *
 * @example
 * ```ts
 * import { formatRomanNumeral, parseRomanNumeral } from "musictheoryjs";
 * formatRomanNumeral(parseRomanNumeral("viio7")); // => "vii°7"
 * formatRomanNumeral(parseRomanNumeral("V2")); // => "V42"
 * formatRomanNumeral({ degree: 2, alteration: 0, quality: "min9", inversion: 0, secondary: null, symbol: "" }); // => "ii9"
 * ```
 */
export function formatRomanNumeral(
  r: Omit<RomanNumeral, "symbol"> & { readonly symbol?: string }
): string {
  return formatParts(
    r.degree,
    r.alteration,
    r.quality,
    r.inversion,
    r.secondary
  );
}

/** The root of `degree`±`alteration` measured on the major scale of `tonic`. */
function degreeRootInMajorOf(
  tonic: Note,
  degree: number,
  alteration: number
): Note {
  return Note.of(
    transpose(tonic, {
      steps: degree - 1,
      semitones: (STEP_SEMITONES[degree - 1] as number) + alteration,
    })
  );
}

/**
 * Resolve a Roman numeral in a key to a concrete chord. Plain numerals are
 * measured against the key's own scale (`"VII"` in A minor is G; `"bVII"` in
 * C major is Bb); secondary functions resolve against the major scale of the
 * tonicized degree, recursively (`"V7/V/V"` works). Figured-bass inversions
 * are applied, so `"V65"` in C major voices B–D–F–G.
 *
 * @example
 * ```ts
 * import { romanToChord } from "musictheoryjs";
 * romanToChord("V7/V", "C major").toString(); // => "D7"
 * romanToChord("ii7", "Eb major").toString(); // => "Fm7"
 * romanToChord("iiø7", "C minor").toString(); // => "Dm7b5"
 * romanToChord("vii°7/V", "C major").toString(); // => "F#dim7"
 * romanToChord("V65", "C major").noteNames(); // => ["B4","D5","F5","G5"]
 * ```
 */
export function romanToChord(roman: string | RomanNumeral, k: KeyLike): Chord {
  const r = typeof roman === "string" ? parseRomanNumeral(roman) : roman;
  const key = Key.from(k);

  // Walk the tonicization chain from the key outward: for "V7/V/V" the
  // innermost target is a degree of the key, each outer one of the next.
  const chain: RomanNumeral[] = [];
  for (let cur: RomanNumeral | null = r; cur !== null; cur = cur.secondary) {
    chain.push(cur);
  }
  const innermost = chain[chain.length - 1] as RomanNumeral;
  let localTonic =
    chain.length === 1
      ? key.tonic
      : key.scale.degree(innermost.degree).sharpen(innermost.alteration);
  for (let i = chain.length - 2; i >= 1; i--) {
    const link = chain[i] as RomanNumeral;
    localTonic = degreeRootInMajorOf(localTonic, link.degree, link.alteration);
  }
  const root =
    chain.length === 1
      ? key.scale.degree(r.degree).sharpen(r.alteration)
      : degreeRootInMajorOf(localTonic, r.degree, r.alteration);

  let chord = Chord.of(root, r.quality);
  if (r.inversion >= chord.size) {
    throw new RangeError(
      `inversion ${r.inversion} of "${r.symbol}" exceeds its ${chord.size} tones`
    );
  }
  for (let i = 0; i < r.inversion; i++) chord = chord.invert();
  return chord;
}

/** True when the quality is a plain major triad or a dominant-family chord. */
function canBeApplied(quality: ChordQuality): boolean {
  if (quality === "maj") return true;
  const semitones = new Set(
    chordTemplate(quality).map((iv) => ((iv.semitones % 12) + 12) % 12)
  );
  return semitones.has(4) && semitones.has(10);
}

/** The scales a chord may be diatonic to: one for major, three for minor. */
function scalesOf(key: Key) {
  return key.mode === "major"
    ? [key.scale]
    : (["natural", "harmonic", "melodic"] as const).map((v: MinorVariant) =>
        key.variantScale(v)
      );
}

/**
 * The degree on which root+quality sits as a diatonic triad or seventh of
 * the key (checking all three variants for minor keys), or `null`. Using the
 * matching variant's own spelling means the leading-tone chords of harmonic
 * and melodic minor read plainly: F#ø7 in A minor is `viø7`, not `#viø7`.
 */
function diatonicDegreeOf(
  key: Key,
  root: Note,
  quality: ChordQuality
): number | null {
  for (const scale of scalesOf(key)) {
    for (let degree = 1; degree <= scale.size; degree++) {
      const note = scale.degree(degree);
      if (note.step !== root.step || note.alteration !== root.alteration) {
        continue;
      }
      if (
        scaleChord(scale, degree).quality === quality ||
        scaleChord(scale, degree, { seventh: true }).quality === quality
      ) {
        return degree;
      }
    }
  }
  return null;
}

/**
 * Analyze a chord in a key as a Roman numeral. Diatonic chords render
 * plainly (`Dm7` in C major → `"ii7"`); applied dominants are detected
 * (`D7` in C major → `"V7/V"`, `A7` → `"V7/ii"`); everything else renders
 * with accidentals (`Ab` in C major → `"bVI"`). The inverse of
 * {@link romanToChord} for root-position chords.
 * @throws {RangeError} when the chord's quality is unrecognisable.
 *
 * @example
 * ```ts
 * import { chordToRoman } from "musictheoryjs";
 * chordToRoman("Dm7", "C major").symbol; // => "ii7"
 * chordToRoman("D7", "C major").symbol; // => "V7/V"
 * chordToRoman("A7", "C major").symbol; // => "V7/ii"
 * chordToRoman("Ab", "C major").symbol; // => "bVI"
 * chordToRoman("E7", "A minor").symbol; // => "V7"
 * ```
 */
export function chordToRoman(chordInput: ChordLike, k: KeyLike): RomanNumeral {
  const c = Chord.from(chordInput);
  const key = Key.from(k);
  const quality =
    c.quality ?? detectQuality(c.intervals.map((iv) => iv.semitones));
  if (quality === undefined) {
    throw new RangeError(
      `cannot analyze ${c.toString()}: its quality is not in the chord dictionary`
    );
  }

  const diatonicDegree = diatonicDegreeOf(key, c.root, quality);
  if (diatonicDegree !== null) {
    return makeRoman(diatonicDegree, 0, quality, 0, null);
  }

  // Applied dominant: a major-triad or dominant-family chord that is not
  // diatonic as written, sitting a P5 above a diatonic major/minor degree.
  if (canBeApplied(quality)) {
    const target = Note.of(transpose(c.root, negateInterval(interval(5, "P"))));
    const targetIdx = key.scale.notes.findIndex(
      (n) => n.step === target.step && n.alteration === target.alteration
    );
    if (targetIdx > 0) {
      const targetTriad = key.chord(targetIdx + 1);
      if (targetTriad.quality === "maj" || targetTriad.quality === "min") {
        const secondary = makeRoman(
          targetIdx + 1,
          0,
          targetTriad.quality,
          0,
          null
        );
        return makeRoman(5, 0, quality, 0, secondary);
      }
    }
  }

  // Chromatic: the degree is the root's letter, the accidental whatever
  // separates the root from the key's own spelling of that letter.
  const idx = key.scale.notes.findIndex((n) => n.letter === c.root.letter);
  const scaleNote = key.scale.notes[idx] as Note;
  return makeRoman(
    idx + 1,
    c.root.alteration - scaleNote.alteration,
    quality,
    0,
    null
  );
}
