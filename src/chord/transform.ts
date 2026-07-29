/**
 * Transformational harmony on spelled triads: Neo-Riemannian P/L/R
 * operations (each an involution — applying it twice returns the original
 * chord, spelling and octave included), chromatic mediants, and
 * negative-harmony reflection around a tonic's tonic–dominant axis.
 */

import { interval, transpose } from "../interval/interval";
import { mod } from "../math/index";
import { Note, type NoteLike } from "../note/note";
import { detectQuality } from "./analysis";
import { Chord, type ChordLike } from "./chord";
import {
  CHORD_QUALITIES,
  type ChordQuality,
  chordDictionaryVersion,
} from "./templates";

const MINOR_THIRD = interval(3, "m");
const MAJOR_THIRD = interval(3, "M");
const DOWN_MINOR_THIRD = { steps: -2, semitones: -3 };
const DOWN_MAJOR_THIRD = { steps: -2, semitones: -4 };

/** The chord as a plain major or minor triad, or throw. */
function requireTriad(input: ChordLike): Chord {
  const c = Chord.from(input);
  const quality =
    c.quality ?? detectQuality(c.intervals.map((iv) => iv.semitones));
  if (quality !== "maj" && quality !== "min") {
    throw new RangeError(
      `Neo-Riemannian operations are defined on major and minor triads; got ${c.toString()}`
    );
  }
  return c.quality === quality ? c : Chord.of(c.root, quality);
}

/**
 * P: parallel — same root, opposite mode. An involution.
 *
 * @example
 * ```ts
 * import { parallelTriad } from "musictheoryjs";
 * parallelTriad("C").toString(); // => "Cm"
 * parallelTriad("F#m").toString(); // => "F#"
 * parallelTriad(parallelTriad("Eb")).toString(); // => "Eb"
 * ```
 */
export function parallelTriad(input: ChordLike): Chord {
  const c = requireTriad(input);
  return Chord.of(c.root, c.quality === "maj" ? "min" : "maj");
}

/**
 * R: relative — C ↔ Am. The major triad's relative minor sits a minor third
 * below its root; applying R twice returns the original. An involution.
 *
 * @example
 * ```ts
 * import { relativeTriad } from "musictheoryjs";
 * relativeTriad("C").toString(); // => "Am"
 * relativeTriad("Am").toString(); // => "C"
 * relativeTriad("Eb").toString(); // => "Cm"
 * ```
 */
export function relativeTriad(input: ChordLike): Chord {
  const c = requireTriad(input);
  return c.quality === "maj"
    ? Chord.of(Note.of(transpose(c.root, DOWN_MINOR_THIRD)), "min")
    : Chord.of(Note.of(transpose(c.root, MINOR_THIRD)), "maj");
}

/**
 * L: leading-tone exchange — C ↔ Em. An involution.
 *
 * @example
 * ```ts
 * import { leadingToneExchange } from "musictheoryjs";
 * leadingToneExchange("C").toString(); // => "Em"
 * leadingToneExchange("Em").toString(); // => "C"
 * leadingToneExchange("Ab").toString(); // => "Cm"
 * ```
 */
export function leadingToneExchange(input: ChordLike): Chord {
  const c = requireTriad(input);
  return c.quality === "maj"
    ? Chord.of(Note.of(transpose(c.root, MAJOR_THIRD)), "min")
    : Chord.of(Note.of(transpose(c.root, DOWN_MAJOR_THIRD)), "maj");
}

/**
 * Apply a Neo-Riemannian operation word left-to-right:
 * `neoRiemannian("C", "PLR")` is P, then L, then R. Classic composites:
 * `"PL"`/`"LP"` (hexatonic mediants), `"PLP"` (hexatonic pole), `"RP"`/`"PR"`.
 *
 * @example
 * ```ts
 * import { neoRiemannian } from "musictheoryjs";
 * neoRiemannian("C", "R").toString(); // => "Am"
 * neoRiemannian("C", "PL").toString(); // => "Ab"
 * neoRiemannian("C", "PLP").toString(); // => "Abm"
 * neoRiemannian("C7", "P"); // => throws "major and minor triads"
 * ```
 */
export function neoRiemannian(input: ChordLike, ops: string): Chord {
  if (!/^[PLR]+$/.test(ops)) {
    throw new SyntaxError(
      `invalid Neo-Riemannian operations "${ops}": use a word over P, L, R like "PLR"`
    );
  }
  let current = requireTriad(input);
  for (const op of ops) {
    current =
      op === "P"
        ? parallelTriad(current)
        : op === "L"
          ? leadingToneExchange(current)
          : relativeTriad(current);
  }
  return current;
}

/**
 * The four chromatic mediants of a triad: same mode, root a major or minor
 * third up or down.
 *
 * @example
 * ```ts
 * import { chromaticMediants } from "musictheoryjs";
 * chromaticMediants("C").map(String); // => ["E", "Eb", "A", "Ab"]
 * chromaticMediants("Am").map(String); // => ["C#m", "Cm", "F#m", "Fm"]
 * ```
 */
export function chromaticMediants(input: ChordLike): Chord[] {
  const c = requireTriad(input);
  const quality = c.quality as ChordQuality;
  return [MAJOR_THIRD, MINOR_THIRD, DOWN_MINOR_THIRD, DOWN_MAJOR_THIRD].map(
    (iv) => Chord.of(Note.of(transpose(c.root, iv)), quality)
  );
}

/**
 * Reflect a note across the negative-harmony axis of a tonic (the axis sits
 * between the minor and major third above it, so tonic ↔ dominant). In C:
 * C↔G, D↔F, E↔Eb, B↔Ab, A↔Bb. Reflection is a pitch-class mapping — the
 * result is spelled flat-side (as the reflection's minor-side sonorities
 * are conventionally written) in octave 4.
 *
 * @example
 * ```ts
 * import { negativeNote } from "musictheoryjs";
 * negativeNote("E4", "C").toString(); // => "Eb4"
 * negativeNote("C4", "C").toString(); // => "G4"
 * negativeNote("B4", "C").toString(); // => "Ab4"
 * negativeNote("D4", "A").toString(); // => "B4"
 * ```
 */
export function negativeNote(
  input: Note | NoteLike | string,
  tonic: Note | NoteLike | string
): Note {
  const tonicPc = Note.from(tonic).pitchClass;
  const pc = Note.from(input).pitchClass;
  const reflected = mod(2 * tonicPc + 7 - pc, 12);
  return Note.fromMidi(60 + reflected, "flat");
}

/**
 * Dictionary rank of each quality — earlier entries are preferred readings.
 * Rebuilt whenever the dictionary changes, so runtime additions rank too.
 */
let rankCache: ReadonlyMap<ChordQuality, number> = new Map();
let rankCacheVersion = -1;

function qualityRank(): ReadonlyMap<ChordQuality, number> {
  const version = chordDictionaryVersion();
  if (version !== rankCacheVersion) {
    rankCache = new Map(CHORD_QUALITIES.map((q, i) => [q, i]));
    rankCacheVersion = version;
  }
  return rankCache;
}

/**
 * The negative-harmony counterpart of a chord over a tonic: every pitch
 * class is reflected and the best chord reading of the result is returned
 * (preferring earlier dictionary entries, so `G7` over C comes back as the
 * classic `Fm6` rather than its `Dm7b5` rotation).
 * @throws {RangeError} when the reflected notes match no known chord.
 *
 * @example
 * ```ts
 * import { negativeNote, negativeChord } from "musictheoryjs";
 * negativeChord("G7", "C").toString(); // => "Fm6"
 * negativeChord("F", "C").toString(); // => "Gm"
 * negativeChord("C", "C").toString(); // => "Cm"
 * negativeChord("Dm7", "C").toString(); // => "Bb6"
 * ```
 */
export function negativeChord(
  input: ChordLike,
  tonic: Note | NoteLike | string
): Chord {
  const c = Chord.from(input);
  const reflected = c.notes.map((n) => negativeNote(n, tonic));
  const pcs = [...new Set(reflected.map((n) => n.pitchClass))];

  let best: { root: Note; quality: ChordQuality; rank: number } | null = null;
  for (const root of reflected) {
    if (best !== null && root.pitchClass === best.root.pitchClass) continue;
    const quality = detectQuality(pcs.map((pc) => pc - root.pitchClass));
    if (quality === undefined) continue;
    const rank = qualityRank().get(quality) as number;
    if (best === null || rank < best.rank) {
      best = { root, quality, rank };
    }
  }
  if (best === null) {
    throw new RangeError(
      `no chord reading for the negative of ${c.toString()} (${reflected
        .map((n) => n.toString({ octave: false }))
        .join(", ")})`
    );
  }
  return Chord.of(best.root, best.quality);
}
