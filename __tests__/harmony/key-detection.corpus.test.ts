/**
 * Phase 5 acceptance: Krumhansl–Schmuckler key detection scores ≥95% on a
 * curated 100-case corpus including minor, modal, and modulating examples
 * (REDESIGN.md §9). Cases are built from musically honest recipes — scales
 * and melodies emphasize tonic-triad tones the way real material does;
 * modal cases are labeled with their parallel major/minor tonic.
 */

import { describe, expect, it } from "vitest";

import { chord } from "../../src/chord";
import { majorKey, minorKey } from "../../src/key";
import { scale } from "../../src/scale";
import { WeightedNote, detectKeys } from "../../src/harmony";

type Case = {
  readonly label: string;
  readonly expected: string;
  readonly input: ReadonlyArray<string | WeightedNote>;
};

const w = (note: string, weight: number): WeightedNote => ({ note, weight });
const cases: Case[] = [];

/** Scale content with tonic-triad emphasis (tonic 4, third 2, fifth 3). */
function scaleCase(tonic: string, type: string, expected: string): void {
  const s = scale(tonic, type);
  cases.push({
    label: `${s.name} scale`,
    expected,
    input: [
      w(s.notes[0], 4), s.notes[1], w(s.notes[2], 2), s.notes[3],
      w(s.notes[4], 3), s.notes[5], s.notes[6],
    ],
  });
}

/** All tones of a chord sequence; tonic-rooted chords doubled. */
function progressionCase(label: string, expected: string, tonic: string, symbols: readonly string[]): void {
  const input: Array<string | WeightedNote> = [];
  for (const symbol of symbols) {
    const c = chord(symbol);
    for (const n of c.notes) input.push(c.root === tonic ? w(n, 2) : n);
  }
  cases.push({ label, expected, input });
}

// ————— Major scales (13) —————
for (const tonic of ["C", "G", "D", "A", "E", "B", "F#", "F", "Bb", "Eb", "Ab", "Db", "Gb"]) {
  // Gb content detects as the six-accidental tie's conventional print: F#.
  scaleCase(tonic, "major", `${tonic === "Gb" ? "F#" : tonic} major`);
}

// ————— Minor scales, harmonic form (12) —————
for (const tonic of ["A", "E", "B", "F#", "C#", "G#", "D", "G", "C", "F", "Bb", "Eb"]) {
  scaleCase(tonic, "harmonic minor", `${tonic} minor`);
}

// ————— Major I–IV–V7–I progressions (10) —————
for (const tonic of ["C", "G", "D", "A", "E", "F", "Bb", "Eb", "Ab", "Db"]) {
  const k = majorKey(tonic);
  progressionCase(`${tonic} major I-IV-V7-I`, `${tonic} major`, tonic, [
    k.triads[0], k.triads[3], k.chords[4], k.triads[0],
  ]);
}

// ————— Minor i–iv–V7–i progressions (8) —————
for (const tonic of ["A", "E", "D", "G", "C", "F#", "B", "Bb"]) {
  const k = minorKey(tonic);
  progressionCase(`${tonic} minor i-iv-V7-i`, `${tonic} minor`, tonic, [
    k.natural.triads[0], k.natural.triads[3], k.harmonic.chords[4], k.natural.triads[0],
  ]);
}

// ————— Jazz ii–V–I in major (12) —————
for (const tonic of ["C", "G", "D", "A", "E", "B", "F", "Bb", "Eb", "Ab", "Db", "F#"]) {
  const k = majorKey(tonic);
  progressionCase(`${tonic} major ii-V-I`, `${tonic} major`, tonic, [
    k.chords[1], k.chords[4], k.chords[0],
  ]);
}

// ————— Minor iiø–V–i (8) —————
for (const tonic of ["A", "E", "D", "G", "C", "F", "B", "C#"]) {
  const k = minorKey(tonic);
  progressionCase(`${tonic} minor iiø-V7-i`, `${tonic} minor`, tonic, [
    k.natural.chords[1], k.harmonic.chords[4], k.harmonic.chords[0],
  ]);
}

// ————— Melodies with durations (12) —————
function melodyCase(label: string, expected: string, melody: string): void {
  const input = melody.split(/\s+/).map((token) => {
    const [name, dur] = token.split(":");
    return w(name, dur === undefined ? 1 : Number(dur));
  });
  cases.push({ label, expected, input });
}
melodyCase("C major tune", "C major", "C4:2 D4 E4:2 G4 E4 C4 A4 G4:2 F4 E4 D4 C4:2");
melodyCase("G major tune", "G major", "G4:2 A4 B4:2 D5 B4 G4 E5 D5:2 C5 B4 A4 G4:2");
melodyCase("F major tune", "F major", "F4:2 G4 A4:2 C5 A4 F4 D5 C5:2 Bb4 A4 G4 F4:2");
melodyCase("D major tune", "D major", "D4:2 E4 F#4:2 A4 F#4 D4 B4 A4:2 G4 F#4 E4 D4:2");
melodyCase("Bb major tune", "Bb major", "Bb3:2 C4 D4:2 F4 D4 Bb3 G4 F4:2 Eb4 D4 C4 Bb3:2");
melodyCase("Eb major tune", "Eb major", "Eb4:2 F4 G4:2 Bb4 G4 Eb4 C5 Bb4:2 Ab4 G4 F4 Eb4:2");
melodyCase("E major tune", "E major", "E4:2 F#4 G#4:2 B4 G#4 E4 C#5 B4:2 A4 G#4 F#4 E4:2");
melodyCase("A major tune", "A major", "A3:2 B3 C#4:2 E4 C#4 A3 F#4 E4:2 D4 C#4 B3 A3:2");
melodyCase("A minor tune", "A minor", "A4:2 B4 C5:2 E5 C5 A4 F5 E5:2 D5 C5 G#4 A4:2");
melodyCase("D minor tune", "D minor", "D4:2 E4 F4:2 A4 F4 D4 Bb4 A4:2 G4 F4 C#4 D4:2");
melodyCase("C minor tune", "C minor", "C4:2 D4 Eb4:2 G4 Eb4 C4 Ab4 G4:2 F4 Eb4 B3 C4:2");
melodyCase("B minor tune", "B minor", "B3:2 C#4 D4:2 F#4 D4 B3 G4 F#4:2 E4 D4 A#3 B3:2");

// ————— Modal, labeled by tonic's parallel key (8) —————
const MODAL: ReadonlyArray<readonly [string, string, string]> = [
  ["D", "dorian", "D minor"], ["A", "dorian", "A minor"],
  ["E", "phrygian", "E minor"], ["B", "phrygian", "B minor"],
  ["G", "mixolydian", "G major"], ["D", "mixolydian", "D major"],
  ["F", "lydian", "F major"], ["Bb", "lydian", "Bb major"],
];
for (const [tonic, type, expected] of MODAL) {
  const s = scale(tonic, type);
  cases.push({
    label: `${s.name} (modal)`,
    expected,
    input: [
      w(s.notes[0], 5), s.notes[1], w(s.notes[2], 3), s.notes[3],
      w(s.notes[4], 3), s.notes[5], s.notes[6],
    ],
  });
}

// ————— Modulating: destination section dominates (6) —————
function modulationCase(from: string, to: string): void {
  const src = majorKey(from);
  const dst = majorKey(to);
  const input: Array<string | WeightedNote> = [];
  for (const symbol of [src.triads[0], src.triads[3], src.chords[4]]) {
    for (const n of chord(symbol).notes) input.push(n);
  }
  for (const symbol of [dst.triads[0], dst.triads[3], dst.chords[4], dst.triads[0], dst.chords[4], dst.triads[0]]) {
    for (const n of chord(symbol).notes) input.push(chord(symbol).root === to ? w(n, 2) : n);
  }
  cases.push({ label: `${from}→${to} modulation`, expected: `${to} major`, input });
}
modulationCase("C", "G");
modulationCase("F", "C");
modulationCase("G", "D");
modulationCase("Bb", "F");
modulationCase("D", "A");
modulationCase("Eb", "Bb");

// ————— Chromatic/noisy diatonic content (6) —————
function noisyCase(tonic: string): void {
  const s = scale(tonic, "major");
  const chromatic = [
    w(scale(tonic, "major blues").notes[2], 0.5), // b3 passing tone
    w(s.notes[4], 0.5),
  ];
  cases.push({
    label: `${tonic} major with chromatic passing tones`,
    expected: `${tonic} major`,
    input: [
      w(s.notes[0], 4), s.notes[1], w(s.notes[2], 2), s.notes[3],
      w(s.notes[4], 3), s.notes[5], s.notes[6], ...chromatic,
    ],
  });
}
for (const tonic of ["C", "G", "F", "D", "Bb", "A"]) noisyCase(tonic);

// ————— Duplicate-note counting (5): plain lists, repeats as weight —————
for (const [expected, tune] of [
  ["C major", "C4 E4 G4 C5 C4 G4 E4 C4 F4 A4 D4 B3"],
  ["G major", "G3 B3 D4 G4 G3 D4 B3 G3 C4 E4 A3 F#4"],
  ["A minor", "A3 C4 E4 A4 A3 E4 C4 A3 D4 F4 B3 G#4"],
  ["E minor", "E4 G4 B4 E5 E4 B4 G4 E4 A4 C5 F#4 D#5"],
  ["F major", "F3 A3 C4 F4 F3 C4 A3 F3 Bb3 D4 G3 E4"],
] as const) {
  cases.push({ label: `${expected} plain-list`, expected, input: tune.split(" ") });
}

describe("K–S key detection corpus (Phase 5 acceptance)", () => {
  it("has exactly 100 cases", () => {
    expect(cases).toHaveLength(100);
  });

  it("detects at least 95% of the corpus correctly", () => {
    const misses: string[] = [];
    for (const c of cases) {
      const got = detectKeys(c.input)[0]?.name;
      if (got !== c.expected) misses.push(`${c.label}: expected ${c.expected}, got ${got}`);
    }
    // eslint-disable-next-line no-console
    if (misses.length > 0) console.log(misses.join("\n"));
    expect(misses.length, misses.join("; ")).toBeLessThanOrEqual(5);
  });

  it("reports correlation and confidence sanely on a clear case", () => {
    const [top, second] = detectKeys([
      w("C", 4), "D", w("E", 2), "F", w("G", 3), "A", "B",
    ]);
    expect(top.name).toBe("C major");
    expect(top.correlation).toBeGreaterThan(0.8);
    expect(top.confidence).toBeGreaterThan(0);
    expect(second.correlation).toBeLessThanOrEqual(top.correlation);
  });

  it("handles degenerate input", () => {
    expect(detectKeys(["C4", "C5", "C3"])).toEqual([]); // one pitch class
    expect(() => detectKeys([])).toThrow();
  });
});
