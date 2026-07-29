/**
 * MusicXML export.
 *
 * Renders a {@link ScoreInput} as a single-part `score-partwise` document
 * (MusicXML 4.0): measures with key/time/clef attributes, chords via
 * `<chord/>`, rests, dots, `<time-modification>` for tuplets, and events that
 * cross a barline split into tied notes. The final measure is padded with
 * rests so every measure is full.
 */

import { keySignatureOf } from "../key/key";
import type { Note } from "../note/note";
import { type Duration, wholeNotes } from "../rhythm/duration";
import {
  type EventPiece,
  type Measure,
  type NormalScore,
  type NotationOptions,
  type ScoreInput,
  asScore,
  decomposeWholeNotes,
  layoutMeasures,
} from "./score";

/** Divisions per quarter note — exact for dots and common tuplets. */
const DIVISIONS = 480;

const TYPE_NAMES: Record<number, string> = {
  0.5: "breve",
  1: "whole",
  2: "half",
  4: "quarter",
  8: "eighth",
  16: "16th",
  32: "32nd",
  64: "64th",
  128: "128th",
};

const STEP_ALTER_OCTAVE = (note: Note): string => {
  const alter =
    note.alteration === 0 ? "" : `<alter>${note.alteration}</alter>`;
  return `<step>${note.letter}</step>${alter}<octave>${note.octave}</octave>`;
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** `<duration>` in divisions, tuplet scaling included. */
function divisionsOf(d: Duration): number {
  return Math.round(wholeNotes(d) * 4 * DIVISIONS);
}

/** Note children after `<pitch>`, in the order the MusicXML content model
 * requires: duration, tie (stop before start), voice, type, dots,
 * time-modification, notations. */
function noteBody(d: Duration, tieStop: boolean, tieStart: boolean): string[] {
  const lines = [`<duration>${divisionsOf(d)}</duration>`];
  if (tieStop) lines.push('<tie type="stop"/>');
  if (tieStart) lines.push('<tie type="start"/>');
  lines.push("<voice>1</voice>", `<type>${TYPE_NAMES[d.value]}</type>`);
  for (let i = 0; i < d.dots; i++) lines.push("<dot/>");
  const t = d.tuplet;
  if (t !== undefined) {
    lines.push(
      "<time-modification>",
      `<actual-notes>${t.actual}</actual-notes>`,
      `<normal-notes>${t.normal}</normal-notes>`,
      "</time-modification>"
    );
  }
  if (tieStop || tieStart) {
    lines.push("<notations>");
    if (tieStop) lines.push('<tied type="stop"/>');
    if (tieStart) lines.push('<tied type="start"/>');
    lines.push("</notations>");
  }
  return lines;
}

function renderPiece(piece: EventPiece, tieStop: boolean): string[] {
  const lines: string[] = [];
  const { pitches } = piece.event;
  if (pitches.length === 0) {
    lines.push(
      "<note>",
      "<rest/>",
      `<duration>${divisionsOf(piece.duration)}</duration>`,
      "<voice>1</voice>",
      `<type>${TYPE_NAMES[piece.duration.value]}</type>`
    );
    for (let i = 0; i < piece.duration.dots; i++) lines.push("<dot/>");
    lines.push("</note>");
    return lines;
  }
  pitches.forEach((note, i) => {
    lines.push("<note>");
    if (i > 0) lines.push("<chord/>");
    lines.push(`<pitch>${STEP_ALTER_OCTAVE(note)}</pitch>`);
    lines.push(...noteBody(piece.duration, tieStop, piece.tie));
    lines.push("</note>");
  });
  return lines;
}

function attributes(score: NormalScore): string[] {
  return [
    "<attributes>",
    `<divisions>${DIVISIONS}</divisions>`,
    "<key>",
    `<fifths>${keySignatureOf(score.key).count}</fifths>`,
    `<mode>${score.key.mode}</mode>`,
    "</key>",
    "<time>",
    `<beats>${score.timeSignature.numerator}</beats>`,
    `<beat-type>${score.timeSignature.denominator}</beat-type>`,
    "</time>",
    "<clef>",
    "<sign>G</sign>",
    "<line>2</line>",
    "</clef>",
    "</attributes>",
  ];
}

function tempoDirection(bpm: number): string[] {
  return [
    '<direction placement="above">',
    "<direction-type>",
    "<metronome>",
    "<beat-unit>quarter</beat-unit>",
    `<per-minute>${bpm}</per-minute>`,
    "</metronome>",
    "</direction-type>",
    `<sound tempo="${bpm}"/>`,
    "</direction>",
  ];
}

/**
 * Render notes, a chord, a scale, or a full score as a MusicXML
 * `score-partwise` document.
 *
 * @example
 * ```ts
 * import { toMusicXML, Chord } from "musictheoryjs";
 * const xml = toMusicXML(Chord.from("Cmaj7"));
 * xml.includes("<step>C</step>"); // => true
 * xml.includes("<chord/>"); // => true
 * const sharp = toMusicXML(["F#4"], { key: "D major" });
 * sharp.includes("<fifths>2</fifths>"); // => true
 * sharp.includes("<alter>1</alter>"); // => true
 * ```
 */
export function toMusicXML(
  input: ScoreInput,
  options: NotationOptions = {}
): string {
  const score = asScore(input, options);
  const measures = layoutMeasures(score);
  const barLength =
    score.timeSignature.numerator / score.timeSignature.denominator;

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
    '<score-partwise version="4.0">',
  ];
  if (score.title !== undefined) {
    lines.push(
      "<work>",
      `<work-title>${escapeXml(score.title)}</work-title>`,
      "</work>"
    );
  }
  lines.push(
    "<part-list>",
    '<score-part id="P1">',
    "<part-name>Music</part-name>",
    "</score-part>",
    "</part-list>",
    '<part id="P1">'
  );

  // Track ties across measure boundaries: whether the previous piece of the
  // same event asked for a tie.
  let pendingTie = false;
  measures.forEach((measure: Measure, index) => {
    lines.push(`<measure number="${index + 1}">`);
    if (index === 0) {
      lines.push(...attributes(score));
      if (score.tempo !== undefined) lines.push(...tempoDirection(score.tempo));
    }
    let used = 0;
    for (const piece of measure) {
      lines.push(...renderPiece(piece, pendingTie));
      pendingTie = piece.tie;
      used += wholeNotes(piece.duration);
    }
    // Pad a short final measure with rests.
    for (const rest of decomposeWholeNotes(barLength - used)) {
      lines.push(
        "<note>",
        "<rest/>",
        `<duration>${divisionsOf(rest)}</duration>`,
        "<voice>1</voice>",
        `<type>${TYPE_NAMES[rest.value]}</type>`
      );
      for (let i = 0; i < rest.dots; i++) lines.push("<dot/>");
      lines.push("</note>");
    }
    if (index === measures.length - 1) {
      lines.push(
        '<barline location="right">',
        "<bar-style>light-heavy</bar-style>",
        "</barline>"
      );
    }
    lines.push("</measure>");
  });

  lines.push("</part>", "</score-partwise>");
  return lines.join("\n");
}
