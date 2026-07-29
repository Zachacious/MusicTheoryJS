/**
 * @module harmony/key-detection
 * Krumhansl–Schmuckler key detection: the input's pitch-class weight vector
 * is correlated (Pearson) against the Krumhansl–Kessler major and minor
 * profiles at all 24 transpositions, and candidates are ranked by
 * correlation. Weights can come from durations, counts, or any salience
 * measure; plain note lists weight every occurrence equally (so repeats
 * count — pass each sounding, not a deduplicated set).
 *
 * Tonics are spelled by key-signature economy: the enharmonic spelling whose
 * key has fewer accidentals wins (Db major over C# major, G# minor over
 * Ab minor); exact six-accidental ties follow print convention (F# major,
 * Eb minor).
 */

import {
  MusicTheoryError,
  Pitch,
  chroma as chromaOf,
  fifthsIndex,
  isPitch,
  note,
  noteName,
  spellChroma,
} from "../core";

/** Krumhansl–Kessler major profile, C = index 0. */
const MAJOR_PROFILE: readonly number[] = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];

/** Krumhansl–Kessler minor profile, C = index 0. */
const MINOR_PROFILE: readonly number[] = [
  6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
];

/** A note with a salience weight (duration, count, accent…). */
export interface WeightedNote {
  readonly note: string | Pitch;
  /** Relative weight, > 0 (default 1). */
  readonly weight?: number;
}

export type KeyDetectionInput = ReadonlyArray<string | Pitch | WeightedNote>;

export interface KeyDetection {
  /** Spelled tonic, e.g. "F#". */
  readonly tonic: string;
  readonly type: "major" | "minor";
  /** Full key name, e.g. "F# minor". */
  readonly name: string;
  /** Pearson correlation with the matching K–K profile, in [-1, 1]. */
  readonly correlation: number;
  /** Lead over the runner-up candidate (0 = tie; larger = more certain). */
  readonly confidence: number;
}

export interface DetectKeysOptions {
  /** Maximum candidates returned (default 4). */
  readonly maxResults?: number;
}

function toWeighted(entry: string | Pitch | WeightedNote): { pc: number; weight: number } {
  if (typeof entry === "object" && entry !== null && "note" in entry && !isPitch(entry)) {
    const weight = entry.weight ?? 1;
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new MusicTheoryError(`Invalid note weight ${weight}: must be a positive number.`);
    }
    return { pc: chromaOf(note(entry.note)), weight };
  }
  return { pc: chromaOf(note(entry as string | Pitch)), weight: 1 };
}

function pearson(x: readonly number[], profile: readonly number[], rotation: number): number {
  let sx = 0, sy = 0;
  for (let i = 0; i < 12; i++) {
    sx += x[i];
    sy += profile[i];
  }
  const mx = sx / 12;
  const my = sy / 12;
  let cov = 0, vx = 0, vy = 0;
  for (let i = 0; i < 12; i++) {
    // Profile index for pitch class i under a tonic at `rotation`.
    const dx = x[i] - mx;
    const dy = profile[(i - rotation + 12) % 12] - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  if (vx === 0 || vy === 0) return 0;
  return cov / Math.sqrt(vx * vy);
}

/** Alteration (fifths count) of the key on `tonic`: majors +0, minors −3. */
function keyAlteration(tonic: Pitch, type: "major" | "minor"): number {
  return fifthsIndex(tonic) - (type === "minor" ? 3 : 0);
}

/**
 * The economical spelling of a tonic pitch class for the given mode; exact
 * six-accidental ties follow print convention — F# major but Eb minor.
 */
function spellTonic(pc: number, type: "major" | "minor"): string {
  const sharp = spellChroma(pc, { prefer: "sharp" });
  const flat = spellChroma(pc, { prefer: "flat" });
  if (sharp.step === flat.step && sharp.alt === flat.alt) return noteName(sharp);
  const sharpAlt = Math.abs(keyAlteration(sharp, type));
  const flatAlt = Math.abs(keyAlteration(flat, type));
  if (sharpAlt === flatAlt) return noteName(type === "major" ? sharp : flat);
  return noteName(sharpAlt < flatAlt ? sharp : flat);
}

/**
 * Rank key interpretations of weighted pitch content. Notes may repeat
 * (each occurrence adds weight) or carry explicit weights/durations.
 *
 * Returns candidates sorted by correlation; empty when the input has no
 * tonal variance (fewer than two distinct pitch classes).
 *
 * @example
 * ```ts
 * import { detectKeys } from "musictheoryjs";
 *
 * const [best] = detectKeys(["C4", "E4", "G4", "C5", "F4", "A4", "G4", "B4", "D5"]);
 * best.name; // => "C major"
 * best.correlation; // => ~0.935
 * detectKeys([{ note: "D", weight: 4 }, { note: "F", weight: 2 }, "A", "E"])[0].name; // => "D minor"
 * detectKeys(["Db", "F", "Ab", "Gb", "C", "Eb", "Bb"])[0].name; // => "Db major"
 * ```
 */
export function detectKeys(
  input: KeyDetectionInput,
  options?: DetectKeysOptions
): KeyDetection[] {
  if (input.length === 0) {
    throw new MusicTheoryError("Cannot detect a key from an empty note list.");
  }
  const maxResults = options?.maxResults ?? 4;
  if (!Number.isInteger(maxResults) || maxResults < 0) {
    throw new MusicTheoryError(`Invalid maxResults ${maxResults}: must be a non-negative integer.`);
  }
  const vector = new Array<number>(12).fill(0);
  for (const entry of input) {
    const { pc, weight } = toWeighted(entry);
    vector[pc] += weight;
  }
  if (vector.filter((w) => w > 0).length < 2) return [];

  const candidates: Array<Omit<KeyDetection, "confidence">> = [];
  for (let pc = 0; pc < 12; pc++) {
    for (const [type, profile] of [
      ["major", MAJOR_PROFILE],
      ["minor", MINOR_PROFILE],
    ] as const) {
      const tonic = spellTonic(pc, type);
      candidates.push({
        tonic,
        type,
        name: `${tonic} ${type}`,
        correlation: pearson(vector, profile, pc),
      });
    }
  }
  candidates.sort((a, b) => b.correlation - a.correlation || a.name.localeCompare(b.name));
  return candidates.slice(0, maxResults).map((c, i) =>
    Object.freeze({
      ...c,
      // Lead over the next-best candidate overall.
      confidence: Math.max(0, c.correlation - (candidates[i + 1]?.correlation ?? c.correlation)),
    })
  );
}
