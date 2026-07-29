/**
 * Scale detection: finding which known scales fit a set of notes.
 *
 * Matching is by pitch-class set (spelling-independent), with every set held
 * as a 12-bit mask — so testing a candidate tonic against a template is a
 * rotate-and-compare on two integers. Exact matching requires the scale to
 * equal the input set; subset matching finds every scale that *contains* the
 * notes ("which scales can I play over these?").
 */

import { type EnharmonicPreference, Note, type NoteLike } from "../note/note";
import {
  pcsetIsSubset,
  pcsetMask,
  pcsetSize,
  pcsetTranspose,
} from "../pitch/pcset";
import { pitchClass as pitchClassOf } from "../pitch/spelled";
import {
  type CanonicalScaleName,
  SCALE_DEFINITIONS,
  SCALE_TEMPLATES,
  type ScaleDefinition,
  type ScaleName,
  scaleDictionaryVersion,
} from "./templates";

/** A scale that fits a set of notes. */
export interface ScaleMatch {
  /** The tonic the scale is rooted on. */
  readonly tonic: Note;
  /** The matched template's canonical name. */
  readonly name: CanonicalScaleName;
}

/** Options for {@link detectScales}. */
export interface ScaleDetectionOptions {
  /**
   * `"exact"` (default): the scale's pitch classes must equal the input's,
   * and only input notes are tried as tonics. `"subset"`: any scale that
   * contains every input note matches, trying all twelve tonics; results are
   * ordered smallest scale first.
   */
  readonly match?: "exact" | "subset";
  /** Accidental spelling for subset-match tonics that aren't input notes. */
  readonly prefer?: EnharmonicPreference;
}

interface MaskedScale {
  readonly def: ScaleDefinition;
  readonly mask: number;
}

/**
 * Each scale with its pitch-class mask, in dictionary order. Rebuilt whenever
 * the dictionary changes, so scales registered at runtime are detectable
 * immediately rather than only in processes that imported them early enough.
 */
let maskCache: readonly MaskedScale[] = [];
let maskCacheVersion = -1;

function templateMasks(): readonly MaskedScale[] {
  const version = scaleDictionaryVersion();
  if (version !== maskCacheVersion) {
    maskCache = SCALE_DEFINITIONS.map((def) => ({
      def,
      mask: pcsetMask(def.intervals.map((iv) => iv.semitones)),
    }));
    maskCacheVersion = version;
  }
  return maskCache;
}

/**
 * All known scales that fit `notes` — by default those whose pitch-class set
 * exactly matches, trying every input note as the tonic (so the white keys
 * match both C major and A minor). With `match: "subset"`, every scale that
 * merely *contains* the notes matches instead, whatever its tonic.
 *
 * @example
 * ```ts
 * import { detectScales } from "musictheoryjs";
 * const white = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];
 * detectScales(white).some((m) => `${m.tonic.letter}:${m.name}` === "C:major"); // => true
 * detectScales(white).some((m) => `${m.tonic.letter}:${m.name}` === "A:minor"); // => true
 * const sparse = detectScales(["C4", "E4", "B4"], { match: "subset" });
 * sparse.some((m) => `${m.tonic.letter}:${m.name}` === "C:major"); // => true
 * detectScales(["C4", "E4", "B4"]); // => []
 * ```
 */
export function detectScales(
  notes: ReadonlyArray<Note | NoteLike | string>,
  options: ScaleDetectionOptions = {}
): ScaleMatch[] {
  const parsed = notes.map((n) => Note.from(n));
  if (parsed.length === 0) return [];

  const inputMask = pcsetMask(parsed.map((n) => pitchClassOf(n)));

  if (options.match === "subset") {
    return subsetMatches(parsed, inputMask, options.prefer);
  }

  const matches: ScaleMatch[] = [];
  // De-duplicate on (root pitch class, scale name) so the same note appearing
  // in two octaves doesn't yield the same match twice.
  const seen = new Set<string>();
  for (const tonic of parsed) {
    const rootPc = pitchClassOf(tonic);
    const relative = pcsetTranspose(inputMask, -rootPc);
    for (const { def, mask } of templateMasks()) {
      if (mask !== relative) continue;
      const dedupeKey = `${rootPc}:${def.name}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      matches.push({ tonic, name: def.name });
    }
  }
  return matches;
}

function subsetMatches(
  parsed: readonly Note[],
  inputMask: number,
  prefer: EnharmonicPreference | undefined
): ScaleMatch[] {
  // The tonic needn't be an input note: C–E–B sits inside C major, but also
  // inside G major on a tonic the input never sounds. Reuse an input note's
  // spelling for its pitch class when there is one; otherwise spell fresh.
  const tonicFor = (pc: number): Note =>
    parsed.find((n) => pitchClassOf(n) === pc) ??
    Note.fromMidi(60 + pc, prefer);

  const matches: Array<ScaleMatch & { size: number; order: number }> = [];
  for (let pc = 0; pc < 12; pc++) {
    const relative = pcsetTranspose(inputMask, -pc);
    const masks = templateMasks();
    for (let i = 0; i < masks.length; i++) {
      const { def, mask } = masks[i] as MaskedScale;
      if (!pcsetIsSubset(relative, mask)) continue;
      matches.push({
        tonic: tonicFor(pc),
        name: def.name,
        size: def.intervals.length,
        order: i,
      });
    }
  }
  // Tightest fits first, then dictionary order, then tonic pitch class.
  matches.sort(
    (a, b) =>
      a.size - b.size ||
      a.order - b.order ||
      pitchClassOf(a.tonic) - pitchClassOf(b.tonic)
  );
  return matches.map(({ tonic, name }) => ({ tonic, name }));
}

/**
 * Every scale that contains all of `notes` — shorthand for
 * {@link detectScales} with `match: "subset"`. Answers "which scales can I
 * play over these notes?", smallest scale first.
 *
 * @example
 * ```ts
 * import { scalesContaining } from "musictheoryjs";
 * const fits = scalesContaining(["C4", "Eb4", "G4"]);
 * const names = fits.map((m) => `${m.tonic.toString({ octave: false })} ${m.name}`);
 * names.includes("C minor"); // => true
 * names.includes("Eb major"); // => true
 * names.includes("D major"); // => false
 * ```
 */
export function scalesContaining(
  notes: ReadonlyArray<Note | NoteLike | string>,
  options: Omit<ScaleDetectionOptions, "match"> = {}
): ScaleMatch[] {
  return detectScales(notes, { ...options, match: "subset" });
}

/** The pitch-class mask of a named template, rooted on its own tonic. */
function templateMask(name: ScaleName): number {
  const template = SCALE_TEMPLATES[name];
  if (!template) throw new RangeError(`unknown scale template: "${name}"`);
  return pcsetMask(template.map((iv) => iv.semitones));
}

/**
 * The templates that contain this one — every scale you could widen it into
 * without losing a note. Major extends into bebop and chromatic; the scale
 * itself is never listed. Both scales are compared rooted on the same tonic.
 *
 * @example
 * ```ts
 * import { scaleSupersets } from "musictheoryjs";
 * const wider = scaleSupersets("major");
 * wider.includes("bebopDominant"); // => true
 * wider.includes("chromatic"); // => true
 * wider.includes("major"); // => false
 * wider.includes("minor"); // => false
 * ```
 */
export function scaleSupersets(name: ScaleName): CanonicalScaleName[] {
  const mask = templateMask(name);
  return templateMasks()
    .filter((t) => t.mask !== mask && pcsetIsSubset(mask, t.mask))
    .map((t) => t.def.name);
}

/**
 * The templates contained within this one — every scale you could narrow it
 * to. Major reduces to its pentatonics; the scale itself is never listed.
 * Results come back smallest first.
 *
 * @example
 * ```ts
 * import { scaleSubsets } from "musictheoryjs";
 * const narrower = scaleSubsets("major");
 * narrower.includes("majorPentatonic"); // => true
 * narrower.includes("major"); // => false
 * narrower.includes("chromatic"); // => false
 * ```
 */
export function scaleSubsets(name: ScaleName): CanonicalScaleName[] {
  const mask = templateMask(name);
  return templateMasks()
    .filter((t) => t.mask !== mask && pcsetIsSubset(t.mask, mask))
    .sort((a, b) => pcsetSize(a.mask) - pcsetSize(b.mask))
    .map((t) => t.def.name);
}
