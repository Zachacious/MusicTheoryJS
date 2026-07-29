/**
 * @module chord/symbols
 * Chord-symbol tokenization: root/quality/bass splitting, quality-alias
 * resolution with case and synonym normalization, and did-you-mean
 * suggestions. Resolution never falls back to a default quality — an
 * unrecognized quality is a `null` result (and a thrown error with a
 * suggestion at the `chord()` level), never a silent major.
 */

import { closestMatch } from "../core/util";
import { CHORD_TYPES, ChordTypeData, getChordType } from "../dict";

export { chordDisplayAlias } from "../dict";

/**
 * Lowercase alias index for case-insensitive fallback lookup. Keys whose
 * lowercase form is shared by two *different* types (`"M7"` vs `"m7"`) are
 * ambiguous and resolve to nothing — case-sensitive lookup still finds them.
 */
let lowercaseIndex: Map<string, ChordTypeData | "ambiguous"> | null = null;

function getLowercaseIndex(): Map<string, ChordTypeData | "ambiguous"> {
  if (lowercaseIndex !== null) return lowercaseIndex;
  lowercaseIndex = new Map();
  for (const type of CHORD_TYPES) {
    for (const alias of [...type.aliases, type.name]) {
      if (alias === "") continue;
      const key = alias.toLowerCase();
      const existing = lowercaseIndex.get(key);
      if (existing === undefined) lowercaseIndex.set(key, type);
      else if (existing !== type) lowercaseIndex.set(key, "ambiguous");
    }
  }
  return lowercaseIndex;
}

function lookup(quality: string): ChordTypeData | null {
  const exact = getChordType(quality);
  if (exact !== null) return exact;
  const relaxed = getLowercaseIndex().get(quality.toLowerCase());
  return relaxed === "ambiguous" || relaxed === undefined ? null : relaxed;
}

/**
 * Resolve a chord-quality string to its dictionary type. Beyond exact alias
 * and full-name matches this accepts unambiguous case variants (`"MAJ7"`,
 * `"mmaj7"`), parenthesized extensions (`"m(maj7)"`), and the spelled-out
 * `min`/`dom` prefixes (`"min6"`, `"dom7"`). Returns `null` when nothing
 * matches — never a default.
 *
 * @example
 * ```ts
 * import { resolveChordQuality } from "musictheoryjs";
 *
 * resolveChordQuality("m(maj7)").name; // => "minor/major seventh"
 * resolveChordQuality("MAJ7").name; // => "major seventh"
 * resolveChordQuality("dom7").name; // => "dominant seventh"
 * resolveChordQuality("wat"); // => null
 * ```
 */
export function resolveChordQuality(quality: string): ChordTypeData | null {
  // The bare-root symbol: "C" is a C major triad. The dictionary index skips
  // empty aliases, so the major type is looked up by name here.
  if (quality === "") return getChordType("major");
  const direct = lookup(quality);
  if (direct !== null) return direct;
  const unwrapped = quality.replace(/[()]/g, "");
  if (unwrapped !== quality) {
    const found = lookup(unwrapped);
    if (found !== null) return found;
  }
  // "min6" → "m6", "dom7" → "7". Only as a fallback: "min"/"min7"/"dom"
  // are real aliases and were already found by the direct lookup.
  const rewritten = unwrapped.replace(/^min/i, "m").replace(/^dom/i, "");
  if (rewritten !== unwrapped && rewritten !== "") {
    const found = lookup(rewritten);
    if (found !== null) return found;
  }
  return null;
}

/**
 * Closest known quality alias within edit distance 2 (case-insensitive), for
 * "did you mean" error messages. Returns `null` when nothing is close.
 *
 * @example
 * ```ts
 * import { suggestChordQuality } from "musictheoryjs";
 *
 * suggestChordQuality("mj7"); // => "maj7"
 * suggestChordQuality("7allt"); // => "7alt"
 * suggestChordQuality("xyzzy"); // => null
 * ```
 */
export function suggestChordQuality(quality: string): string | null {
  return closestMatch(
    quality,
    (function* () {
      for (const type of CHORD_TYPES) yield* type.aliases;
    })()
  );
}

/** A chord symbol split into its parts, with the quality resolved. */
export interface ChordTokens {
  /** Root pitch-class name as written (case-normalized), e.g. "Eb". */
  readonly root: string;
  /** Resolved dictionary type. */
  readonly type: ChordTypeData;
  /** Slash-bass pitch-class name, if present. */
  readonly bass?: string;
}

/** Why a symbol failed to tokenize, for error reporting. */
export type ChordTokenizeFailure =
  | { readonly reason: "no-chord" }
  | { readonly reason: "bad-root" }
  | { readonly reason: "bad-quality"; readonly quality: string };

const ROOT_REGEX = /^([A-Ga-g])(#{1,3}|b{1,3}|x{1,2})?\s*/;
const BASS_REGEX = /\/([A-Ga-g](?:#{1,3}|b{1,3}|x{1,2})?)$/;
const NO_CHORD_REGEX = /^n\.?c\.?$/i;

function normalizeNoteToken(token: string): string {
  return token[0].toUpperCase() + token.slice(1);
}

/**
 * Split a chord symbol into root, quality, and optional slash bass. The whole
 * post-root text is tried as a quality first, so aliases containing `/`
 * (`"6/9"`, `"m/maj7"`) win over the slash-bass reading; only when that fails
 * is a trailing `/note` treated as a bass.
 *
 * @example
 * ```ts
 * import { tokenizeChordSymbol } from "musictheoryjs";
 *
 * const t = tokenizeChordSymbol("Am7/G");
 * t.root; // => "A"
 * t.type.name; // => "minor seventh"
 * t.bass; // => "G"
 * tokenizeChordSymbol("C6/9").type.name; // => "sixth added ninth"
 * tokenizeChordSymbol("N.C.").reason; // => "no-chord"
 * ```
 */
export function tokenizeChordSymbol(
  symbol: string
): ChordTokens | ChordTokenizeFailure {
  const trimmed = symbol.trim();
  if (NO_CHORD_REGEX.test(trimmed)) return { reason: "no-chord" };
  const rootMatch = ROOT_REGEX.exec(trimmed);
  if (rootMatch === null) return { reason: "bad-root" };
  const root = normalizeNoteToken(rootMatch[1] + (rootMatch[2] ?? ""));
  const rest = trimmed.slice(rootMatch[0].length);
  const whole = resolveChordQuality(rest);
  if (whole !== null) return { root, type: whole };
  const bassMatch = BASS_REGEX.exec(rest);
  if (bassMatch !== null) {
    const quality = rest.slice(0, bassMatch.index);
    const type = resolveChordQuality(quality);
    if (type !== null) {
      return { root, type, bass: normalizeNoteToken(bassMatch[1]) };
    }
    return { reason: "bad-quality", quality };
  }
  return { reason: "bad-quality", quality: rest };
}
