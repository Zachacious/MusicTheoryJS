/**
 * @module roman/roman
 * Roman numerals with secondary functions and figured-bass inversions.
 * `"V7/V"` parses, formats, and resolves — applied chords are never silently
 * dropped. Quality is carried by the numeral itself (case, `°`/`ø`/`+`
 * markers, and any chord-quality suffix), so parsing is key-independent;
 * keys enter only when resolving to or from concrete chords.
 *
 * Figured-bass figures are inversions: `6`/`64` on triads, `7`/`65`/`43`/`42`
 * (or `2`) on sevenths. `V65` in C is G7/B.
 */

import {
  MusicTheoryError,
  Pitch,
  STEP_SEMITONES,
  distance,
  note,
  transpose,
} from "../core";
import { Chord, chord, resolveChordQuality } from "../chord";
import { Key, KeyHarmony, key } from "../key";

/** A parsed roman numeral. Instances are frozen. */
export interface RomanNumeral {
  /** Normalized symbol, e.g. "bVII", "iiø7", "V65", "V7/V". */
  readonly symbol: string;
  /** Scale degree 1-7 (of the local target for secondary functions). */
  readonly degree: number;
  /** Chromatic alteration of the degree root: "bIII" → -1. */
  readonly accidental: number;
  /** Resolved chord-quality alias: "", "m", "7", "m7", "m7b5", "maj7", … */
  readonly quality: string;
  /** Dictionary chord-type name for the quality (may be ""). */
  readonly chordType: string;
  /** Inversion from figured bass: 0 root position … 3 third inversion. */
  readonly inversion: number;
  /** The tonicized target: "V7/V" has secondary V. `null` when diatonic. */
  readonly secondary: RomanNumeral | null;
}

/** Structural type guard for `RomanNumeral`-shaped values. */
export function isRomanNumeral(value: unknown): value is RomanNumeral {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.symbol === "string" &&
    typeof r.degree === "number" &&
    typeof r.accidental === "number" &&
    typeof r.quality === "string"
  );
}

const HEAD_REGEX =
  /^(b+|#+)?(vii|vi|iv|iii|ii|i|v|VII|VI|IV|III|II|I|V)(°|o|ø|Ø|\+)?(.*)$/;

const NUMERAL_DEGREES: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7,
};

/** figure → [inversion, impliesSeventh] */
const FIGURES: Record<string, readonly [number, boolean]> = {
  "": [0, false],
  "6": [1, false],
  "64": [2, false],
  "7": [0, true],
  "65": [1, true],
  "43": [2, true],
  "42": [3, true],
  "2": [3, true],
};

interface QualityResolution {
  readonly alias: string;
  readonly chordType: string;
}

function resolveQuality(alias: string, context: string): QualityResolution {
  const type = resolveChordQuality(alias);
  if (type === null) {
    throw new MusicTheoryError(
      `Unknown chord quality ${JSON.stringify(alias)} in roman numeral ${JSON.stringify(context)}.`
    );
  }
  return { alias, chordType: type.name };
}

/**
 * Quality of the numeral body: `lower` is minor, `upper` major, markers make
 * it diminished / half-diminished / augmented; `seventh` adds the matching
 * seventh (°→dim7, ø→m7b5, +→7#5, lower→m7, upper→dominant 7). An explicit
 * suffix ("maj7", "9", "7b9", …) resolves through the chord-quality engine
 * with the case prefix applied ("ii" + "maj7" → mMaj7).
 */
function qualityOf(
  lower: boolean,
  marker: string,
  suffix: string,
  seventh: boolean,
  context: string
): QualityResolution {
  if (marker === "ø") {
    if (suffix !== "" && suffix !== "7") {
      throw new MusicTheoryError(
        `Invalid roman numeral ${JSON.stringify(context)}: "ø" takes no suffix other than "7".`
      );
    }
    return resolveQuality("m7b5", context);
  }
  if (marker === "°") {
    if (suffix === "" && !seventh) return resolveQuality("dim", context);
    if (suffix === "" || suffix === "7") return resolveQuality("dim7", context);
    // "dim<suffix>" first, then the "o" alias family ("vii°M7" → oM7).
    const dim = resolveChordQuality(`dim${suffix}`) !== null ? `dim${suffix}` : `o${suffix}`;
    return resolveQuality(dim, context);
  }
  if (marker === "+") {
    if (suffix === "" && !seventh) return resolveQuality("aug", context);
    if (suffix === "" || suffix === "7") return resolveQuality("7#5", context);
    // "aug<suffix>" first, then the "+" alias family ("III+maj7" → +maj7).
    const aug = resolveChordQuality(`aug${suffix}`) !== null ? `aug${suffix}` : `+${suffix}`;
    return resolveQuality(aug, context);
  }
  if (suffix === "") {
    if (seventh) return resolveQuality(lower ? "m7" : "7", context);
    return resolveQuality(lower ? "m" : "M", context);
  }
  if (lower) {
    const prefixed = resolveChordQuality(`m${suffix}`);
    if (prefixed !== null) {
      return { alias: `m${suffix}`, chordType: prefixed.name };
    }
  }
  return resolveQuality(suffix, context);
}

function buildRoman(
  degree: number,
  accidental: number,
  bodyText: string,
  quality: QualityResolution,
  inversion: number,
  secondary: RomanNumeral | null
): RomanNumeral {
  const prefix = accidental > 0 ? "#".repeat(accidental) : "b".repeat(-accidental);
  const symbol = `${prefix}${bodyText}${secondary !== null ? `/${secondary.symbol}` : ""}`;
  return Object.freeze({
    symbol,
    degree,
    accidental,
    quality: quality.alias,
    chordType: quality.chordType,
    inversion,
    secondary,
  });
}

function parseRoman(input: string): RomanNumeral {
  const trimmed = input.trim();
  const slash = trimmed.indexOf("/");
  let head = trimmed;
  let secondary: RomanNumeral | null = null;
  if (slash !== -1) {
    const tail = trimmed.slice(slash + 1);
    const headText = trimmed.slice(0, slash);
    // The tail must itself be a roman numeral ("V7/V", "V/V/V"); a non-roman
    // tail is an error here — slash *basses* belong to chord symbols.
    secondary = parseRoman(tail);
    head = headText;
  }
  const m = HEAD_REGEX.exec(head);
  if (m === null) {
    throw new MusicTheoryError(
      `Invalid roman numeral ${JSON.stringify(input)}: expected forms like "V7", "ii", "bVII", "viiø7", "V65", or "V7/V".`
    );
  }
  const prefix = m[1] ?? "";
  const numeral = m[2];
  const marker = (m[3] ?? "").replace("o", "°").replace("Ø", "ø");
  const rest = m[4];
  const accidental = prefix.startsWith("#") ? prefix.length : -prefix.length;
  const lower = numeral === numeral.toLowerCase();
  const degree = NUMERAL_DEGREES[numeral.toLowerCase()];

  const body = `${numeral}${marker}${rest}`;
  const figure = FIGURES[rest];
  if (figure !== undefined) {
    const [inversion, seventh] = figure;
    const quality = qualityOf(lower, marker, "", seventh, input);
    return buildRoman(degree, accidental, body, quality, inversion, secondary);
  }
  const quality = qualityOf(lower, marker, rest, false, input);
  return buildRoman(degree, accidental, body, quality, 0, secondary);
}

/**
 * Parse a roman numeral (`"V7"`, `"iiø7"`, `"bVII"`, `"V65"`, `"V7/V"`) or
 * normalize a `RomanNumeral` object; throws `MusicTheoryError` on failure.
 */
export function romanNumeral(input: string | RomanNumeral): RomanNumeral {
  if (isRomanNumeral(input)) return parseRoman(input.symbol);
  if (typeof input !== "string") {
    throw new MusicTheoryError(
      `Invalid roman numeral: ${JSON.stringify(input)}.`
    );
  }
  return parseRoman(input);
}

/** Soft-failure variant of `romanNumeral()`: returns `null` on failure. */
export function tryRomanNumeral(
  input: string | RomanNumeral
): RomanNumeral | null {
  try {
    return romanNumeral(input);
  } catch {
    return null;
  }
}

function tonicOf(k: Key): Pitch {
  return note(k.tonic);
}

/** Degree root: tonic + major-scale degree interval + chromatic alteration. */
function degreeRoot(tonic: Pitch, degree: number, accidental: number): Pitch {
  return transpose(tonic, {
    steps: degree - 1,
    semitones: STEP_SEMITONES[degree - 1] + accidental,
  });
}

/**
 * Resolve a roman numeral in a key to a concrete chord:
 * `romanToChord("V7/V", "C major").symbol` is `"D7"`; `romanToChord("V65",
 * "C major")` is G7 over B. Degrees are measured from the tonic's major
 * scale, so `"bVII"` in any key is the flattened seventh degree; secondary
 * functions resolve against the tonicized degree recursively.
 */
export function romanToChord(
  romanInput: string | RomanNumeral,
  keyInput: string | Key
): Chord {
  const r = romanNumeral(romanInput);
  const k = key(keyInput);
  let localTonic = tonicOf(k);
  // Resolve the tonicization chain from the key outward: for "V7/V/V" the
  // innermost target is a degree of the key, each outer numeral of the next.
  const chain: RomanNumeral[] = [];
  for (let cur: RomanNumeral | null = r; cur !== null; cur = cur.secondary) {
    chain.push(cur);
  }
  for (let i = chain.length - 1; i >= 1; i--) {
    localTonic = degreeRoot(localTonic, chain[i].degree, chain[i].accidental);
  }
  const root = degreeRoot(localTonic, r.degree, r.accidental);
  const base = chord(root, r.quality === "" ? "M" : r.quality);
  if (r.inversion === 0) return base;
  if (r.inversion >= base.notes.length) {
    throw new MusicTheoryError(
      `Invalid inversion for ${JSON.stringify(r.symbol)}: the ${base.symbol} chord has only ${base.notes.length} notes.`
    );
  }
  return chord(`${base.symbol}/${base.notes[r.inversion]}`);
}

/** Figure strings that must not double as a chord-quality suffix. */
const FIGURE_STRINGS = new Set(Object.keys(FIGURES));

/** Chord-type name → the parts a numeral is rendered from. */
function renderParts(c: Chord): {
  lower: boolean;
  marker: string;
  suffix: string;
} {
  switch (c.type) {
    case "major":
      return { lower: false, marker: "", suffix: "" };
    case "minor":
      return { lower: true, marker: "", suffix: "" };
    case "diminished":
      return { lower: true, marker: "°", suffix: "" };
    case "augmented":
      return { lower: false, marker: "+", suffix: "" };
    case "dominant seventh":
      return { lower: false, marker: "", suffix: "7" };
    case "minor seventh":
      return { lower: true, marker: "", suffix: "7" };
    case "half-diminished":
      return { lower: true, marker: "ø", suffix: "7" };
    case "diminished seventh":
      return { lower: true, marker: "°", suffix: "7" };
    case "sixth":
      // "I6" would read as a first-inversion figure; "add6" is unambiguous.
      return { lower: false, marker: "", suffix: "add6" };
  }
  // General case: minor-third chords render lowercase with any leading "m"
  // stripped from the alias ("m9" → "ii9"); everything else uppercase with
  // the alias as suffix ("maj7" → "Imaj7", "9" → "V9"). A stripped suffix
  // that would read as a figure keeps the full alias ("m6" → "iim6").
  const minorThird = (c.chroma & (1 << 3)) !== 0 && (c.chroma & (1 << 4)) === 0;
  if (minorThird && c.quality.startsWith("m")) {
    const stripped = c.quality.slice(1);
    if (!FIGURE_STRINGS.has(stripped)) {
      return { lower: true, marker: "", suffix: stripped };
    }
    return { lower: true, marker: "", suffix: c.quality };
  }
  return { lower: false, marker: "", suffix: c.quality };
}

function diatonicIn(harmony: KeyHarmony, symbol: string): boolean {
  return harmony.triads.includes(symbol) || harmony.chords.includes(symbol);
}

function isDiatonic(k: Key, symbol: string): boolean {
  if (k.type === "major") return diatonicIn(k, symbol);
  return (
    diatonicIn(k.natural, symbol) ||
    diatonicIn(k.harmonic, symbol) ||
    diatonicIn(k.melodic, symbol)
  );
}

function scaleOf(k: Key): readonly string[] {
  return k.type === "major" ? k.scale : k.natural.scale;
}

function triadTypeAt(k: Key, index: number): string {
  const triads = k.type === "major" ? k.triads : k.natural.triads;
  const symbol = triads[index];
  return symbol === "" ? "" : chord(symbol).type;
}

function wrapDelta(delta: number): number {
  if (delta > 6) return delta - 12;
  if (delta < -6) return delta + 12;
  return delta;
}

/**
 * Analyze a chord in a key as a roman numeral. Diatonic chords render
 * plainly (`Dm7` in C major → `"ii7"`); applied dominants are detected
 * (`D7` in C major → `"V7/V"`, `D` major → `"V/V"`); everything else renders
 * with accidentals (`Ab` in C major → `"bVI"`). A slash bass that is a chord
 * member becomes an inversion figure (`G7/B` → `"V65"`).
 */
export function chordToRoman(
  chordInput: string | Chord,
  keyInput: string | Key
): RomanNumeral {
  const c = chord(chordInput);
  const k = key(keyInput);
  const tonic = tonicOf(k);
  const root = note(c.root);
  const d = distance(tonic, root);
  const degree = d.steps + 1;
  const accidental = wrapDelta(d.semitones - STEP_SEMITONES[d.steps]);

  // Applied dominant: major-triad or dominant-family chord, not diatonic as
  // written, whose root is a P5 above a tonicizable diatonic degree (other
  // than the tonic itself — V-of-I is just V).
  const applied = c.type === "major" || c.type.startsWith("dominant");
  const plainSymbol =
    c.bass === undefined ? c.symbol : c.symbol.slice(0, c.symbol.lastIndexOf("/"));
  if (applied && !isDiatonic(k, plainSymbol)) {
    const target = transpose(root, "-P5");
    const index = scaleOf(k).findIndex((n) => {
      const p = note(n);
      return p.step === target.step && p.alt === target.alt;
    });
    if (index > 0) {
      const targetType = triadTypeAt(k, index);
      if (targetType === "major" || targetType === "minor") {
        const lower = targetType === "minor";
        const targetNumeral = buildRoman(
          index + 1,
          0,
          formatBody(index + 1, lower, "", ""),
          resolveQuality(lower ? "m" : "M", c.symbol),
          0,
          null
        );
        // The chord sits a P5 above its target by construction: numeral V.
        return finishRoman(c, 5, 0, targetNumeral);
      }
    }
  }
  return finishRoman(c, degree, accidental, null);
}

function formatBody(
  degree: number,
  lower: boolean,
  marker: string,
  suffix: string
): string {
  const numeral = ["I", "II", "III", "IV", "V", "VI", "VII"][degree - 1];
  return `${lower ? numeral.toLowerCase() : numeral}${marker}${suffix}`;
}

const TRIAD_FIGURES = ["", "6", "64"];
const SEVENTH_FIGURES = ["7", "65", "43", "42"];

function finishRoman(
  c: Chord,
  degree: number,
  accidental: number,
  secondary: RomanNumeral | null
): RomanNumeral {
  const { lower, marker, suffix } = renderParts(c);
  const bassIndex = c.bass === undefined ? -1 : c.notes.indexOf(c.bass);
  let bodySuffix = suffix;
  let inversion = 0;
  // Figures express inversions only for the qualities they imply ("" and
  // "7"-family); other qualities keep root position in the numeral and the
  // slash bass is dropped (romanization is lossy there).
  if (bassIndex > 0) {
    if (suffix === "" && c.notes.length === 3 && bassIndex <= 2) {
      bodySuffix = TRIAD_FIGURES[bassIndex];
      inversion = bassIndex;
    } else if (suffix === "7" && c.notes.length === 4 && bassIndex <= 3) {
      bodySuffix = SEVENTH_FIGURES[bassIndex];
      inversion = bassIndex;
    }
  }
  const body = formatBody(degree, lower, marker, bodySuffix);
  return buildRoman(
    degree,
    accidental,
    body,
    { alias: c.quality, chordType: c.type },
    inversion,
    secondary
  );
}
