/**
 * @module harmony/chord-scales
 * Chord-scale matching: which scales, built on the chord's root, contain
 * the chord — with avoid-note awareness. An avoid note is a scale tone a
 * half step above a chord tone (the classic m9 rule); ranking prefers
 * avoid-free scales, then seven-note scales, so `chordScales("Dm7")` leads
 * with dorian and `chordScales("Cmaj7")` with lydian.
 */

import { MusicTheoryError, chroma as chromaOf, note } from "../core";
import { mod } from "../core/util";
import { SCALE_TYPES } from "../dict";
import { chromaCardinality, chromaContains } from "../pcset";
import { Chord, chord } from "../chord";
import { Scale, scale } from "../scale";

export interface ChordScaleMatch {
  /** Full scale name rooted on the chord root, e.g. "D dorian". */
  readonly name: string;
  /** Scale type, e.g. "dorian". */
  readonly type: string;
  /** Spelled scale notes. */
  readonly notes: readonly string[];
  /** Scale tones a half step above a chord tone (spelled). */
  readonly avoidNotes: readonly string[];
  /** 1 minus avoid/size penalties; higher is a better fit. */
  readonly score: number;
}

export interface ChordScalesOptions {
  /** Maximum matches returned (default 5). */
  readonly maxResults?: number;
}

/**
 * Rank the scales that contain a chord, rooted on its root. Containment is
 * a chroma subset test; ranking is avoid-note-aware: dorian (avoid-free)
 * beats aeolian for Dm7, and lydian beats major (which carries the F avoid
 * note) for Cmaj7.
 *
 * @example
 * ```ts
 * import { chordScales } from "musictheoryjs";
 *
 * chordScales("Dm7")[0].name; // => "D dorian"
 * chordScales("Cmaj7")[0].name; // => "C lydian"
 * chordScales("Cmaj7").find((m) => m.type === "major").avoidNotes; // => ["F"]
 * chordScales("C7alt")[0].name; // => "C altered"
 * ```
 */
export function chordScales(
  chordInput: string | Chord,
  options?: ChordScalesOptions
): ChordScaleMatch[] {
  const c = chord(chordInput);
  const maxResults = options?.maxResults ?? 5;
  if (!Number.isInteger(maxResults) || maxResults < 0) {
    throw new MusicTheoryError(`Invalid maxResults ${maxResults}: must be a non-negative integer.`);
  }

  const rootPc = chromaOf(note(c.root));
  const matches: Array<ChordScaleMatch & { order: number }> = [];
  SCALE_TYPES.forEach((type, order) => {
    if (!chromaContains(type.chroma, c.chroma)) return;
    const s: Scale = scale(c.root, type.name);
    const avoidNotes = s.notes.filter((n) => {
      // Chord chroma is root-relative (root at bit 0); measure scale tones
      // the same way before testing bits.
      const rel = mod(chromaOf(note(n)) - rootPc, 12);
      const inChord = (c.chroma & (1 << rel)) !== 0;
      const belowIsChordTone = (c.chroma & (1 << mod(rel - 1, 12))) !== 0;
      return !inChord && belowIsChordTone;
    });
    const score =
      1 -
      0.15 * avoidNotes.length -
      0.02 * Math.abs(chromaCardinality(type.chroma) - 7);
    matches.push({
      name: s.name,
      type: type.name,
      notes: s.notes,
      avoidNotes: Object.freeze(avoidNotes),
      score: Number(score.toFixed(4)),
      order,
    });
  });
  matches.sort((a, b) => b.score - a.score || a.order - b.order);
  return matches.slice(0, maxResults).map(({ order: _order, ...match }) => Object.freeze(match));
}
