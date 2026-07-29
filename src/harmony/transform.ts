/**
 * @module harmony/transform
 * Transformational harmony on spelled triads: Neo-Riemannian P/L/R
 * operations (each an involution — applying it twice returns the original
 * chord, spelling included), negative-harmony reflection around a key's
 * tonic–dominant axis, and chromatic mediants.
 */

import {
  MusicTheoryError,
  Pitch,
  chroma as chromaOf,
  note,
  noteName,
  pitch,
  spellChroma,
  transpose,
} from "../core";
import { mod } from "../core/util";
import { Chord, chord, detectChords } from "../chord";
import { Key, key } from "../key";

function requireTriad(input: string | Chord): Chord {
  const c = chord(input);
  if (c.type !== "major" && c.type !== "minor") {
    throw new MusicTheoryError(
      `Neo-Riemannian operations are defined on major and minor triads; got ${c.symbol} (${c.type || "unknown type"}).`
    );
  }
  return c;
}

/**
 * P: parallel — same root, opposite mode. `parallel("C")` is Cm.
 *
 * @example
 * ```ts
 * import { parallel } from "musictheoryjs";
 *
 * parallel("C").symbol; // => "Cm"
 * parallel("F#m").symbol; // => "F#"
 * parallel(parallel("Eb")).symbol; // => "Eb"
 * ```
 */
export function parallel(input: string | Chord): Chord {
  const c = requireTriad(input);
  return chord(c.root, c.type === "major" ? "m" : "M");
}

/**
 * R: relative — C ↔ Am. Major moves the root up a M6; minor down a m3… i.e. both swap with the relative.
 *
 * @example
 * ```ts
 * import { relative } from "musictheoryjs";
 *
 * relative("C").symbol; // => "Am"
 * relative("Am").symbol; // => "C"
 * relative("Eb").symbol; // => "Cm"
 * ```
 */
export function relative(input: string | Chord): Chord {
  const c = requireTriad(input);
  return c.type === "major"
    ? chord(transpose(c.root, "M6"), "m")
    : chord(transpose(c.root, "m3"), "M");
}

/**
 * L: leading-tone exchange — C ↔ Em.
 *
 * @example
 * ```ts
 * import { leadingToneExchange } from "musictheoryjs";
 *
 * leadingToneExchange("C").symbol; // => "Em"
 * leadingToneExchange("Em").symbol; // => "C"
 * leadingToneExchange("Ab").symbol; // => "Cm"
 * ```
 */
export function leadingToneExchange(input: string | Chord): Chord {
  const c = requireTriad(input);
  return c.type === "major"
    ? chord(transpose(c.root, "M3"), "m")
    : chord(transpose(c.root, "-M3"), "M");
}

/**
 * Apply a Neo-Riemannian operation word left-to-right:
 * `neoRiemannian("C", "PLR")` is P then L then R. Classic composites:
 * "PL"/"LP" (hexatonic mediants), "PLP" (hexatonic pole), "RP"/"PR".
 *
 * @example
 * ```ts
 * import { neoRiemannian } from "musictheoryjs";
 *
 * neoRiemannian("C", "R").symbol; // => "Am"
 * neoRiemannian("C", "PL").symbol; // => "Ab"
 * neoRiemannian("C", "PLP").symbol; // => "Abm"
 * neoRiemannian("C7", "P"); // => throws "major and minor triads"
 * ```
 */
export function neoRiemannian(input: string | Chord, ops: string): Chord {
  if (!/^[PLR]+$/.test(ops)) {
    throw new MusicTheoryError(
      `Invalid Neo-Riemannian operations ${JSON.stringify(ops)}: use a word over P, L, R like "PLR".`
    );
  }
  let current = requireTriad(input);
  for (const op of ops) {
    current =
      op === "P" ? parallel(current) : op === "L" ? leadingToneExchange(current) : relative(current);
  }
  return current;
}

/**
 * The four chromatic mediants of a triad: same mode, root a major or minor
 * third up or down. `chromaticMediants("C")` → E, Eb, A, Ab major triads.
 *
 * @example
 * ```ts
 * import { chromaticMediants } from "musictheoryjs";
 *
 * chromaticMediants("C").map((c) => c.symbol); // => ["E", "Eb", "A", "Ab"]
 * chromaticMediants("Am").map((c) => c.symbol); // => ["C#m", "Cm", "F#m", "Fm"]
 * ```
 */
export function chromaticMediants(input: string | Chord): Chord[] {
  const c = requireTriad(input);
  const quality = c.type === "major" ? "M" : "m";
  return ["M3", "m3", "-m3", "-M3"].map((i) => chord(transpose(c.root, i), quality));
}

/**
 * Reflect a pitch class across a key's negative-harmony axis (between the
 * minor and major third above the tonic, so tonic ↔ dominant). In C:
 * C↔G, D↔F, E↔Eb, B↔Ab, A↔Bb. Results are spelled economically for the
 * flat-side sonorities the reflection produces (octaves and cents are
 * dropped — reflection is a pitch-class mapping).
 *
 * @example
 * ```ts
 * import { negativeNote, noteName } from "musictheoryjs";
 *
 * noteName(negativeNote("E", "C major")); // => "Eb"
 * noteName(negativeNote("C", "C major")); // => "G"
 * noteName(negativeNote("B", "C major")); // => "Ab"
 * ```
 */
export function negativeNote(input: string | Pitch, keyInput: string | Key): Pitch {
  const k = key(keyInput);
  const tonicPc = chromaOf(note(k.tonic));
  const reflected = mod(2 * tonicPc + 7 - chromaOf(note(input)), 12);
  const flat = spellChroma(reflected, { prefer: "flat" });
  return pitch(flat.step, flat.alt);
}

/**
 * The negative-harmony counterpart of a chord in a key: every pitch class
 * is reflected and the best chord reading of the result is returned.
 * `negativeChord("G7", "C major")` is Fm6 — the classic V7 ↔ iv6 pairing.
 *
 * @example
 * ```ts
 * import { negativeChord } from "musictheoryjs";
 *
 * negativeChord("G7", "C major").symbol; // => "Fm6"
 * negativeChord("F", "C major").symbol; // => "Gm"
 * negativeChord("C", "C major").symbol; // => "Cm"
 * ```
 */
export function negativeChord(input: string | Chord, keyInput: string | Key): Chord {
  const c = chord(input);
  const reflected = c.notes.map((n) => noteName(negativeNote(n, keyInput)));
  const detected = detectChords(reflected, { maxResults: 1 });
  if (detected.length === 0) {
    throw new MusicTheoryError(
      `No chord reading for the negative of ${c.symbol} (${reflected.join(", ")}).`
    );
  }
  // Reflection maps pitch classes, so detection's bass reading (the first
  // reflected note) is meaningless — return the plain root-position chord.
  const best = chord(detected[0].symbol);
  return best.bass === undefined ? best : chord(best.root, best.quality === "" ? "M" : best.quality);
}
