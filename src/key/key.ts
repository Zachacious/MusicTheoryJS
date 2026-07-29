/**
 * @module key/key
 * Major and minor keys: signatures, spelled scales, diatonic triads and
 * seventh chords, harmonic-function tags, chord-scale names, and secondary /
 * substitute dominants with their related supertonics ("related ii").
 *
 * Conventions match the established reference data: a secondary dominant is
 * omitted (empty string) when its target triad is not major or minor, or when
 * the dominant chord is already diatonic (V7/I in major is just V7);
 * substitute dominants are the tritone transposition of the secondary ones;
 * supertonics are m7 over minor targets and m7b5 over major targets.
 */

import {
  MusicTheoryError,
  Pitch,
  STEP_SEMITONES,
  distance,
  note,
  noteName,
  pitch,
  transpose,
} from "../core";
import { chord } from "../chord";
import { Scale, modes, scale, scaleChords } from "../scale";

/** Diatonic harmony of one scale: degrees, chords, functions, dominants. */
export interface KeyHarmony {
  /** Tonic pitch-class name. */
  readonly tonic: string;
  /** Mixed-case roman degrees with quality markers: ["I","ii",…,"vii°"]. */
  readonly grades: readonly string[];
  /** Interval names from the tonic. */
  readonly intervals: readonly string[];
  /** Spelled scale notes. */
  readonly scale: readonly string[];
  /** Diatonic triads as symbols: ["C","Dm","Em","F","G","Am","Bdim"]. */
  readonly triads: readonly string[];
  /** Diatonic seventh chords: ["Cmaj7","Dm7",…,"Bm7b5"]. */
  readonly chords: readonly string[];
  /** "T" (tonic), "SD" (subdominant), "D" (dominant), or "" per degree. */
  readonly chordsHarmonicFunction: readonly string[];
  /** Mode name fitting each degree: ["C major","D dorian",…]. */
  readonly chordScales: readonly string[];
  /** V7 of each degree ("" where not applicable): ["","A7","B7",…]. */
  readonly secondaryDominants: readonly string[];
  /** Related ii of each secondary dominant: ["","Em7","F#m7",…]. */
  readonly secondaryDominantSupertonics: readonly string[];
  /** Tritone substitutes of the secondary dominants: ["","Eb7","F7",…]. */
  readonly substituteDominants: readonly string[];
  /** Related ii of each substitute dominant: ["","Bbm7","Cm7",…]. */
  readonly substituteDominantSupertonics: readonly string[];
}

/** A major key: its harmony plus signature and relative-minor data. */
export interface MajorKey extends KeyHarmony {
  readonly type: "major";
  /** Signature as a fifths count: sharps positive, flats negative. */
  readonly alteration: number;
  /** Signature accidentals: "##" for D, "bbb" for Eb, "" for C. */
  readonly keySignature: string;
  /** Relative minor tonic: "A" for C major. */
  readonly minorRelative: string;
}

/** A minor key: signature data plus all three minor-scale harmonizations. */
export interface MinorKey {
  readonly type: "minor";
  readonly tonic: string;
  /** Signature of the natural minor: sharps positive, flats negative. */
  readonly alteration: number;
  readonly keySignature: string;
  /** Relative major tonic: "Eb" for C minor. */
  readonly relativeMajor: string;
  readonly natural: KeyHarmony;
  readonly harmonic: KeyHarmony;
  readonly melodic: KeyHarmony;
}

export type Key = MajorKey | MinorKey;

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

/** Harmonic-function tags per degree, following the reference convention. */
const FUNCTIONS: Record<string, readonly string[]> = {
  major: ["T", "SD", "T", "SD", "D", "T", "D"],
  minor: ["T", "SD", "T", "SD", "D", "SD", "SD"],
  "harmonic minor": ["T", "SD", "T", "SD", "D", "SD", "D"],
  "melodic minor": ["T", "SD", "T", "SD", "D", "", ""],
};

function toPitchClass(input: string | Pitch): Pitch {
  const p = note(input);
  return p.oct === undefined && p.cents === undefined ? p : pitch(p.step, p.alt);
}

function gradeOf(tonic: Pitch, degreeIndex: number, degreeNote: string, triad: string): string {
  const semitones = distance(tonic, note(degreeNote)).semitones;
  let delta = semitones - STEP_SEMITONES[degreeIndex];
  // Wrap into [-6, 6]: pitch-class distances are measured within one octave.
  if (delta > 6) delta -= 12;
  else if (delta < -6) delta += 12;
  const prefix = delta > 0 ? "#".repeat(delta) : "b".repeat(-delta);
  const quality = triad === "" ? "major" : chord(triad).type;
  const numeral = NUMERALS[degreeIndex];
  if (quality === "minor") return `${prefix}${numeral.toLowerCase()}`;
  if (quality === "diminished") return `${prefix}${numeral.toLowerCase()}°`;
  if (quality === "augmented") return `${prefix}${numeral}+`;
  return `${prefix}${numeral}`;
}

function buildHarmony(tonicInput: string | Pitch, type: string): KeyHarmony {
  const tonic = toPitchClass(tonicInput);
  const s: Scale = scale(tonic, type);
  const triads = scaleChords(s, 3);
  const sevenths = scaleChords(s, 4);
  const grades = s.notes.map((n, i) => gradeOf(tonic, i, n, triads[i]));
  const chordScales = modes(s).map((m) => m.name);

  const secondaryDominants: string[] = [];
  const secondarySupertonics: string[] = [];
  const substituteDominants: string[] = [];
  const substituteSupertonics: string[] = [];
  for (let i = 0; i < s.notes.length; i++) {
    const targetQuality = triads[i] === "" ? "" : chord(triads[i]).type;
    if (targetQuality !== "major" && targetQuality !== "minor") {
      secondaryDominants.push("");
      secondarySupertonics.push("");
      substituteDominants.push("");
      substituteSupertonics.push("");
      continue;
    }
    const domRoot = transpose(s.notes[i], "P5");
    const dominant = `${noteName(domRoot)}7`;
    if (sevenths.includes(dominant)) {
      // V7 of this degree is already a diatonic chord of the key.
      secondaryDominants.push("");
      secondarySupertonics.push("");
      substituteDominants.push("");
      substituteSupertonics.push("");
      continue;
    }
    const supertonicQuality = targetQuality === "minor" ? "m7" : "m7b5";
    const subRoot = transpose(domRoot, "d5");
    secondaryDominants.push(dominant);
    secondarySupertonics.push(`${noteName(transpose(domRoot, "P5"))}${supertonicQuality}`);
    substituteDominants.push(`${noteName(subRoot)}7`);
    substituteSupertonics.push(`${noteName(transpose(subRoot, "P5"))}${supertonicQuality}`);
  }

  return Object.freeze({
    tonic: s.tonic,
    grades: Object.freeze(grades),
    intervals: s.intervals,
    scale: s.notes,
    triads: Object.freeze(triads),
    chords: Object.freeze(sevenths),
    chordsHarmonicFunction: Object.freeze([...(FUNCTIONS[type] ?? s.notes.map(() => ""))]),
    chordScales: Object.freeze(chordScales),
    secondaryDominants: Object.freeze(secondaryDominants),
    secondaryDominantSupertonics: Object.freeze(secondarySupertonics),
    substituteDominants: Object.freeze(substituteDominants),
    substituteDominantSupertonics: Object.freeze(substituteSupertonics),
  });
}

/** Sum of accidentals across the scale — the signature as a fifths count. */
function alterationOf(scaleNotes: readonly string[]): number {
  return scaleNotes.reduce((sum, n) => sum + note(n).alt, 0);
}

function signatureOf(alteration: number): string {
  return alteration > 0 ? "#".repeat(alteration) : "b".repeat(-alteration);
}

/**
 * The major key on a tonic: `majorKey("Eb")`. Accepts a name or `Pitch`.
 *
 * @example
 * ```ts
 * import { majorKey } from "musictheoryjs";
 *
 * const k = majorKey("Eb");
 * k.keySignature; // => "bbb"
 * k.chords; // => ["Ebmaj7", "Fm7", "Gm7", "Abmaj7", "Bb7", "Cm7", "Dm7b5"]
 * k.secondaryDominants; // => ["", "C7", "D7", "Eb7", "F7", "G7", ""]
 * k.minorRelative; // => "C"
 * ```
 */
export function majorKey(tonic: string | Pitch): MajorKey {
  const harmony = buildHarmony(tonic, "major");
  const alteration = alterationOf(harmony.scale);
  return Object.freeze({
    type: "major" as const,
    ...harmony,
    alteration,
    keySignature: signatureOf(alteration),
    minorRelative: noteName(transpose(toPitchClass(tonic), "M6")),
  });
}

/**
 * The minor key on a tonic: `minorKey("c#")`. Contains all three
 * harmonizations (`natural`, `harmonic`, `melodic`); the signature comes from
 * the natural form.
 *
 * @example
 * ```ts
 * import { minorKey } from "musictheoryjs";
 *
 * const k = minorKey("c#");
 * k.keySignature; // => "####"
 * k.relativeMajor; // => "E"
 * k.natural.chords[4]; // => "G#m7"
 * k.harmonic.chords[4]; // => "G#7"
 * ```
 */
export function minorKey(tonic: string | Pitch): MinorKey {
  const pc = toPitchClass(tonic);
  const natural = buildHarmony(pc, "minor");
  const alteration = alterationOf(natural.scale);
  return Object.freeze({
    type: "minor" as const,
    tonic: natural.tonic,
    alteration,
    keySignature: signatureOf(alteration),
    relativeMajor: noteName(transpose(pc, "m3")),
    natural,
    harmonic: buildHarmony(pc, "harmonic minor"),
    melodic: buildHarmony(pc, "melodic minor"),
  });
}

// Tonic accidentals are case-sensitive ("b" is a flat); the type word is not.
const KEY_REGEX = /^([A-Ga-g](?:#{1,3}|b{1,3})?)\s*(m|min|minor|maj|major)?$/i;
const TONIC_REGEX = /^[A-Ga-g](?:#{1,3}|b{1,3})?$/;

/**
 * Parse a key name: `key("Eb major")`, `key("c minor")`, `key("F#m")`,
 * `key("Bb")` (major by default). Returns a `MajorKey` or `MinorKey`;
 * discriminate on `.type`.
 *
 * @example
 * ```ts
 * import { key } from "musictheoryjs";
 *
 * key("Eb major").keySignature; // => "bbb"
 * key("F#m").type; // => "minor"
 * key("Bb").type; // => "major"
 * key("H major"); // => throws "Invalid key"
 * ```
 */
export function key(name: string | Key): Key {
  if (typeof name === "object" && name !== null && "type" in name) {
    return name.type === "minor" ? minorKey(name.tonic) : majorKey(name.tonic);
  }
  if (typeof name !== "string") {
    throw new MusicTheoryError(
      `Invalid key: ${JSON.stringify(name)}. Expected a name like "C major", "f# minor", or "Am".`
    );
  }
  const m = KEY_REGEX.exec(name.trim());
  if (m === null || !TONIC_REGEX.test(m[1])) {
    throw new MusicTheoryError(
      `Invalid key ${JSON.stringify(name)}: expected "<tonic> major|minor" like "Eb major", or shorthand like "Am".`
    );
  }
  const tonic = m[1][0].toUpperCase() + m[1].slice(1);
  const type = (m[2] ?? "").toLowerCase();
  return type.startsWith("m") && !type.startsWith("maj")
    ? minorKey(tonic)
    : majorKey(tonic);
}

/**
 * Soft-failure variant of `key()`: returns `null` instead of throwing.
 *
 * @example
 * ```ts
 * import { tryKey } from "musictheoryjs";
 *
 * tryKey("d minor").tonic; // => "D"
 * tryKey("H major"); // => null
 * ```
 */
export function tryKey(name: string | Key): Key | null {
  try {
    return key(name);
  } catch {
    return null;
  }
}
