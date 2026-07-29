/**
 * ABC notation export.
 *
 * Renders a {@link ScoreInput} as an ABC tune: `X`/`T`/`M`/`L`/`Q`/`K` header
 * fields, then the body with measures, chords in brackets, rests, ties across
 * barlines, and `(p:q:r` tuplet groups. Accidentals follow ABC's rules — they
 * carry to the end of the measure — so each note is inflected only when it
 * differs from the key signature and what the measure has already said.
 */

import { keySignatureOf } from "../key/key";
import type { Note } from "../note/note";
import type { Duration } from "../rhythm/duration";
import { formatTimeSignature } from "../rhythm/meter";
import {
  type EventPiece,
  type NormalScore,
  type NotationOptions,
  type ScoreInput,
  asScore,
  layoutMeasures,
} from "./score";

const ACCIDENTALS: Record<number, string> = {
  [-2]: "__",
  [-1]: "_",
  0: "=",
  1: "^",
  2: "^^",
};

/** The unit note length every duration is written against. */
const UNIT = 1 / 8;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Duration factor relative to the 1/8 unit, excluding any tuplet scaling
 * (tuplets are notated as `(p:q:r` groups instead). */
function factor(d: Duration): string {
  // (1/8)ths in the duration: 8 * (2^(dots+1)-1) / (value * 2^dots).
  let num = 8 * (2 ** (d.dots + 1) - 1);
  let den = d.value * 2 ** d.dots;
  if (d.value === 0.5) {
    num *= 2;
    den *= 2;
  }
  const g = gcd(num, den);
  num /= g;
  den /= g;
  if (den === 1) return num === 1 ? "" : String(num);
  return `${num === 1 ? "" : num}/${den}`;
}

/** ABC pitch: `C` is C4, `c` C5, with `'`/`,` octave marks and `^`/`_`/`=`
 * inflections tracked against the key signature and the measure so far. */
function pitch(
  note: Note,
  signature: Readonly<Record<string, number>>,
  state: Map<string, number>
): string {
  const letter = note.letter;
  const key = `${letter}${note.octave}`;
  const current = state.get(key) ?? signature[letter] ?? 0;
  let inflect = "";
  if (note.alteration !== current) {
    const mark = ACCIDENTALS[note.alteration];
    if (mark === undefined) {
      throw new RangeError(
        `cannot notate an alteration of ${note.alteration} semitones`
      );
    }
    inflect = mark;
    state.set(key, note.alteration);
  }
  const body =
    note.octave >= 5
      ? letter.toLowerCase() + "'".repeat(note.octave - 5)
      : letter + ",".repeat(4 - note.octave);
  return inflect + body;
}

function abcKey(score: NormalScore): string {
  const tonic = score.key.tonic;
  const alt =
    tonic.alteration > 0
      ? "#".repeat(tonic.alteration)
      : "b".repeat(-tonic.alteration);
  return `${tonic.letter}${alt}${score.key.mode === "minor" ? "m" : ""}`;
}

function renderPiece(
  piece: EventPiece,
  signature: Readonly<Record<string, number>>,
  state: Map<string, number>
): string {
  const f = factor(piece.duration);
  const tie = piece.tie ? "-" : "";
  const notes = piece.event.pitches;
  if (notes.length === 0) return `z${f}`;
  if (notes.length === 1) {
    return pitch(notes[0] as Note, signature, state) + f + tie;
  }
  const inner = notes.map((n) => pitch(n, signature, state)).join("");
  return `[${inner}]${f}${tie}`;
}

/**
 * Render notes, a chord, a scale, or a full score as an ABC tune.
 *
 * @example
 * ```ts
 * import { toABC, Scale } from "musictheoryjs";
 * toABC(["C4", "D4", "E4"]).endsWith("K:C\nC2 D2 E2 |]"); // => true
 * toABC(Scale.from("D4", "major"), { key: "D major" }).includes("K:D"); // => true
 * toABC([{ chord: "Cmaj7", duration: "1" }]).includes("[CEGB]8"); // => true
 * toABC([{ duration: "h" }, "F#4"]).includes("z4 ^F2"); // => true
 * ```
 */
export function toABC(
  input: ScoreInput,
  options: NotationOptions = {}
): string {
  const score = asScore(input, options);
  const measures = layoutMeasures(score);
  const signature: Record<string, number> = {};
  for (const acc of keySignatureOf(score.key).accidentals) {
    signature[acc.letter] = acc.alteration;
  }

  const rendered = measures.map((measure) => {
    const state = new Map<string, number>();
    const parts: string[] = [];
    for (let i = 0; i < measure.length; i++) {
      const piece = measure[i] as EventPiece;
      const t = piece.duration.tuplet;
      if (t !== undefined) {
        // Open a (p:q:r group covering this run of same-ratio tuplet pieces.
        const prev = measure[i - 1]?.duration.tuplet;
        if (prev?.actual !== t.actual || prev?.normal !== t.normal) {
          let run = 0;
          for (let j = i; j < measure.length; j++) {
            const next = (measure[j] as EventPiece).duration.tuplet;
            if (next?.actual !== t.actual || next?.normal !== t.normal) break;
            run++;
          }
          parts.push(`(${t.actual}:${t.normal}:${run}`);
        }
      }
      parts.push(renderPiece(piece, signature, state));
    }
    return parts.join(" ");
  });

  // Wrap the body every four measures.
  const lines: string[] = [];
  for (let i = 0; i < rendered.length; i += 4) {
    const chunk = rendered.slice(i, i + 4).join(" | ");
    lines.push(i + 4 >= rendered.length ? `${chunk} |]` : `${chunk} |`);
  }

  const header = [
    "X:1",
    ...(score.title !== undefined ? [`T:${score.title}`] : []),
    `M:${formatTimeSignature(score.timeSignature)}`,
    "L:1/8",
    ...(score.tempo !== undefined ? [`Q:1/4=${score.tempo}`] : []),
    `K:${abcKey(score)}`,
  ];
  return [...header, ...lines].join("\n");
}
