/**
 * MusicXML import — the inverse of `toMusicXML`, and a reader for scores
 * from notation editors generally.
 *
 * Reads `score-partwise` and `score-timewise` documents: pitches (step,
 * alter, octave — spelling preserved), rests, `<chord/>` stacks, durations
 * in divisions, ties (merged into single events), multiple voices via
 * `<backup>`/`<forward>`, several parts, and the front matter — title, key
 * (`<fifths>`/`<mode>`), time signature, and tempo. Grace and cue notes,
 * which carry no duration, are skipped; so are layout, dynamics, lyrics,
 * and repeats. The result is a beat-timed stream per part (plus everything
 * merged), so it feeds the sequence, analysis, and MIDI layers directly;
 * `sequenceToScore` takes it back to the notation model.
 *
 * The XML parsing is a small, dependency-free element reader — enough for
 * any well-formed MusicXML file, not a general validating parser.
 */

import type { NoteEvent, NoteStream } from "../analysis/types";
import { Key } from "../key/key";
import { Note, transposeFifths } from "../note/note";
import { type TimeSignature, timeSignature } from "../rhythm/meter";

/* ------------------------------------------------------------------ */
/* Minimal XML                                                         */
/* ------------------------------------------------------------------ */

/** One parsed XML element: tag, attributes, child elements, direct text. */
interface XmlNode {
  readonly tag: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly children: readonly XmlNode[];
  readonly text: string;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (whole, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    }
    if (body.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    }
    return ENTITIES[body] ?? whole;
  });
}

function parseAttrs(text: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([^\s=/]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  for (const m of text.matchAll(pattern)) {
    attrs[m[1] as string] = decodeEntities(m[3] ?? m[4] ?? "");
  }
  return attrs;
}

/**
 * Parse a well-formed XML document to its root element. Declarations,
 * DOCTYPE, comments, and processing instructions are skipped; CDATA becomes
 * text; entities decode.
 */
function parseXml(xml: string): XmlNode {
  let i = 0;
  const skipMisc = (): void => {
    for (;;) {
      while (i < xml.length && /\s/.test(xml[i] as string)) i++;
      if (xml.startsWith("<!--", i)) {
        const end = xml.indexOf("-->", i);
        if (end === -1) throw new SyntaxError("unterminated XML comment");
        i = end + 3;
      } else if (xml.startsWith("<?", i)) {
        const end = xml.indexOf("?>", i);
        if (end === -1) throw new SyntaxError("unterminated XML declaration");
        i = end + 2;
      } else if (xml.startsWith("<!DOCTYPE", i)) {
        // A DOCTYPE may carry an [internal subset]; skip brackets pairwise.
        let depth = 0;
        while (i < xml.length) {
          const c = xml[i++];
          if (c === "[") depth++;
          else if (c === "]") depth--;
          else if (c === ">" && depth === 0) break;
        }
      } else {
        return;
      }
    }
  };

  const parseElement = (): XmlNode => {
    if (xml[i] !== "<") {
      throw new SyntaxError(`expected element at offset ${i}`);
    }
    const open = xml.indexOf(">", i);
    if (open === -1) throw new SyntaxError("unterminated XML tag");
    const selfClosing = xml[open - 1] === "/";
    const head = xml.slice(i + 1, selfClosing ? open - 1 : open);
    const space = head.search(/[\s/]/);
    const tag = space === -1 ? head : head.slice(0, space);
    const attrs = space === -1 ? {} : parseAttrs(head.slice(space));
    i = open + 1;
    if (selfClosing) return { tag, attrs, children: [], text: "" };

    const children: XmlNode[] = [];
    let text = "";
    for (;;) {
      if (i >= xml.length) {
        throw new SyntaxError(`unterminated <${tag}> element`);
      }
      if (xml.startsWith("<![CDATA[", i)) {
        const end = xml.indexOf("]]>", i);
        if (end === -1) throw new SyntaxError("unterminated CDATA section");
        text += xml.slice(i + 9, end);
        i = end + 3;
      } else if (xml.startsWith("<!--", i)) {
        const end = xml.indexOf("-->", i);
        if (end === -1) throw new SyntaxError("unterminated XML comment");
        i = end + 3;
      } else if (xml.startsWith("</", i)) {
        const end = xml.indexOf(">", i);
        if (end === -1) throw new SyntaxError("unterminated closing tag");
        const closing = xml.slice(i + 2, end).trim();
        if (closing !== tag) {
          throw new SyntaxError(`expected </${tag}>, found </${closing}>`);
        }
        i = end + 1;
        return { tag, attrs, children, text: decodeEntities(text.trim()) };
      } else if (xml[i] === "<") {
        children.push(parseElement());
      } else {
        const next = xml.indexOf("<", i);
        const stop = next === -1 ? xml.length : next;
        text += xml.slice(i, stop);
        i = stop;
      }
    }
  };

  skipMisc();
  const root = parseElement();
  return root;
}

function child(node: XmlNode, tag: string): XmlNode | undefined {
  return node.children.find((c) => c.tag === tag);
}

function children(node: XmlNode, tag: string): XmlNode[] {
  return node.children.filter((c) => c.tag === tag);
}

function textOf(node: XmlNode | undefined, tag: string): string | undefined {
  const c = node === undefined ? undefined : child(node, tag);
  return c?.text === "" ? undefined : c?.text;
}

function numberOf(node: XmlNode | undefined, tag: string): number | undefined {
  const t = textOf(node, tag);
  if (t === undefined) return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? undefined : n;
}

/* ------------------------------------------------------------------ */
/* MusicXML                                                            */
/* ------------------------------------------------------------------ */

/** One part of a parsed MusicXML document. */
export interface MusicXMLPart {
  /** The part's `id` attribute, e.g. `"P1"`. */
  readonly id: string;
  /** The `<part-name>` from the part list, when present. */
  readonly name?: string;
  /** The part's music as a beat-timed stream. */
  readonly stream: NoteStream;
}

/** A parsed MusicXML document. */
export interface ParsedMusicXML {
  /** `<work-title>` or `<movement-title>`, when present. */
  readonly title?: string;
  /** The key from the first `<fifths>`/`<mode>`, when declared. */
  readonly key?: Key;
  /** The first declared time signature, when present. */
  readonly timeSignature?: TimeSignature;
  /** Quarter-note BPM from the first `<sound tempo>`, when present. */
  readonly tempo?: number;
  readonly parts: readonly MusicXMLPart[];
  /** Every part merged, sorted by start — ready for analysis or MIDI. */
  readonly stream: NoteStream;
}

/** A note event under construction, so a tie can extend it. */
interface OpenEvent {
  pitch: Note;
  start: number;
  duration: number;
}

function pitchOf(note: XmlNode): Note | null {
  const pitch = child(note, "pitch");
  if (pitch === undefined) return null;
  const step = textOf(pitch, "step");
  const octave = numberOf(pitch, "octave");
  if (step === undefined || octave === undefined) return null;
  const alter = numberOf(pitch, "alter") ?? 0;
  const accidental =
    alter === 0
      ? ""
      : alter > 0
        ? "#".repeat(Math.round(alter))
        : "b".repeat(Math.round(-alter));
  return Note.from(`${step}${accidental}${octave}`);
}

/** Measures of each part, in order, for either document arrangement. */
function measuresByPart(root: XmlNode): Map<string, XmlNode[]> {
  const byPart = new Map<string, XmlNode[]>();
  if (root.tag === "score-partwise") {
    for (const part of children(root, "part")) {
      byPart.set(part.attrs.id ?? "", children(part, "measure"));
    }
    return byPart;
  }
  // score-timewise: measures contain parts.
  for (const measure of children(root, "measure")) {
    for (const part of children(measure, "part")) {
      const id = part.attrs.id ?? "";
      const list = byPart.get(id) ?? [];
      list.push(part);
      byPart.set(id, list);
    }
  }
  return byPart;
}

/**
 * Parse a MusicXML document — `score-partwise` or `score-timewise`.
 * Spelling, ties, chords, voices, and multiple parts all survive; see the
 * module notes for what is skipped. Divisions may change mid-part; times
 * come out in quarter-note beats.
 *
 * @example
 * ```ts
 * import { fromMusicXML, toMusicXML } from "musictheoryjs";
 * const doc = fromMusicXML(toMusicXML(["C4", "D4", "E4"], { key: "C major", tempo: 96 }));
 * doc.stream.map((e) => e.pitch.toString()); // => ["C4", "D4", "E4"]
 * doc.stream.map((e) => e.start); // => [0, 1, 2]
 * doc.tempo; // => 96
 * doc.key?.toString(); // => "C major"
 * ```
 */
export function fromMusicXML(xml: string): ParsedMusicXML {
  const root = parseXml(xml);
  if (root.tag !== "score-partwise" && root.tag !== "score-timewise") {
    throw new SyntaxError(
      `not a MusicXML score: root element is <${root.tag}>`
    );
  }

  const title =
    textOf(child(root, "work"), "work-title") ?? textOf(root, "movement-title");

  const partNames = new Map<string, string>();
  const partList = child(root, "part-list");
  if (partList !== undefined) {
    for (const scorePart of children(partList, "score-part")) {
      const name = textOf(scorePart, "part-name");
      if (name !== undefined) {
        partNames.set(scorePart.attrs.id ?? "", name);
      }
    }
  }

  let key: Key | undefined;
  let ts: TimeSignature | undefined;
  let tempo: number | undefined;
  const parts: MusicXMLPart[] = [];

  for (const [id, measures] of measuresByPart(root)) {
    let divisions = 1;
    const events: NoteEvent[] = [];
    /** Ties still waiting for their stop, by MIDI number. */
    const open = new Map<number, OpenEvent>();
    let cursor = 0; // divisions from the start of the part
    let lastStart = 0; // where the previous non-chord note began

    const flush = (midi: number): void => {
      const e = open.get(midi);
      if (e === undefined) return;
      open.delete(midi);
      events.push({ pitch: e.pitch, start: e.start, duration: e.duration });
    };

    for (const measure of measures) {
      for (const item of measure.children) {
        switch (item.tag) {
          case "attributes": {
            divisions = numberOf(item, "divisions") ?? divisions;
            const k = child(item, "key");
            if (key === undefined && k !== undefined) {
              const fifths = numberOf(k, "fifths");
              if (fifths !== undefined) {
                const minor = textOf(k, "mode") === "minor";
                const tonic = transposeFifths(minor ? "A4" : "C4", fifths);
                key = minor ? Key.minor(tonic) : Key.major(tonic);
              }
            }
            const t = child(item, "time");
            if (ts === undefined && t !== undefined) {
              const beats = numberOf(t, "beats");
              const beatType = numberOf(t, "beat-type");
              if (beats !== undefined && beatType !== undefined) {
                ts = timeSignature(beats, beatType);
              }
            }
            break;
          }
          case "direction": {
            const sound = child(item, "sound");
            const t = sound?.attrs.tempo;
            if (tempo === undefined && t !== undefined) tempo = Number(t);
            break;
          }
          case "sound": {
            const t = item.attrs.tempo;
            if (tempo === undefined && t !== undefined) tempo = Number(t);
            break;
          }
          case "backup":
            cursor -= numberOf(item, "duration") ?? 0;
            break;
          case "forward":
            cursor += numberOf(item, "duration") ?? 0;
            break;
          case "note": {
            const duration = numberOf(item, "duration");
            // Grace and cue notes carry no <duration>; they take no time
            // and are beyond a symbolic reader — skip them.
            if (duration === undefined) break;
            const isChord = child(item, "chord") !== undefined;
            const start = isChord ? lastStart : cursor;
            if (!isChord) {
              lastStart = cursor;
              cursor += duration;
            }
            const pitch = pitchOf(item);
            if (pitch === null) break; // a rest (or unpitched): time only
            const beats = start / divisions;
            const span = duration / divisions;
            const ties = children(item, "tie").map((t) => t.attrs.type);
            const stops = ties.includes("stop");
            const starts = ties.includes("start");
            const held = open.get(pitch.midi);
            if (stops && held !== undefined) {
              held.duration += span;
              if (!starts) flush(pitch.midi);
              break;
            }
            if (starts) {
              open.set(pitch.midi, { pitch, start: beats, duration: span });
              break;
            }
            events.push({ pitch, start: beats, duration: span });
            break;
          }
          default:
            break;
        }
      }
    }
    // Unclosed ties still sound for what was accumulated.
    for (const midi of [...open.keys()]) flush(midi);

    events.sort((a, b) => a.start - b.start);
    const name = partNames.get(id);
    parts.push(
      name === undefined ? { id, stream: events } : { id, name, stream: events }
    );
  }

  const merged = parts
    .flatMap((p) => p.stream)
    .sort((a, b) => a.start - b.start);

  return {
    ...(title !== undefined ? { title } : {}),
    ...(key !== undefined ? { key } : {}),
    ...(ts !== undefined ? { timeSignature: ts } : {}),
    ...(tempo !== undefined ? { tempo } : {}),
    parts,
    stream: merged,
  };
}
