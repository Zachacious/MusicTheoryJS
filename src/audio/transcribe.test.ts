import { describe, expect, test } from "bun:test";
import { cqt, cqtChroma } from "./cqt";
import { trackPitch, transcribeMelody } from "./transcribe";

const SR = 44100;

function sine(freq: number, n: number, amplitude = 1): Float64Array {
  return Float64Array.from(
    { length: n },
    (_, i) => amplitude * Math.sin((2 * Math.PI * freq * i) / SR)
  );
}

function concat(...parts: Float64Array[]): Float64Array {
  const out = new Float64Array(parts.reduce((a, p) => a + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

describe("trackPitch", () => {
  test("tracks a steady tone and gates silence", () => {
    const track = trackPitch(
      concat(sine(440, 8192), new Float64Array(8192)),
      SR
    );
    expect(track[0]?.frequency).toBeCloseTo(440, 0);
    expect(track.at(-1)?.frequency).toBeNull();
    expect(track[0]?.rms).toBeCloseTo(Math.SQRT1_2, 2);
  });

  test("reports frame times in seconds at the hop", () => {
    const track = trackPitch(sine(220, 8192), SR, { hop: 512 });
    expect(track[1]?.time).toBeCloseTo(512 / SR, 9);
  });
});

describe("transcribeMelody", () => {
  test("three tones become three notes", () => {
    const audio = concat(
      sine(261.63, 11025), // C4
      sine(329.63, 11025), // E4
      sine(392, 11025) // G4
    );
    const notes = transcribeMelody(audio, SR);
    expect(notes.map((e) => e.pitch.toString())).toEqual(["C4", "E4", "G4"]);
    expect(notes[1]?.start).toBeCloseTo(0.25, 1);
    expect(notes[0]?.duration).toBeGreaterThan(0.15);
  });

  test("silence separates repeated notes", () => {
    const audio = concat(
      sine(440, 8192),
      new Float64Array(4096),
      sine(440, 8192)
    );
    const notes = transcribeMelody(audio, SR);
    expect(notes.map((e) => e.pitch.toString())).toEqual(["A4", "A4"]);
    expect((notes[1]?.start ?? 0) - (notes[0]?.start ?? 0)).toBeGreaterThan(
      0.2
    );
  });

  test("short blips are dropped", () => {
    const audio = concat(sine(440, 16384), sine(880, 1024));
    const notes = transcribeMelody(audio, SR);
    expect(notes.map((e) => e.pitch.toString())).toEqual(["A4"]);
  });

  test("velocity scales with level", () => {
    const audio = concat(sine(440, 11025, 1), sine(523.25, 11025, 0.25));
    const notes = transcribeMelody(audio, SR);
    expect(notes.length).toBe(2);
    expect(notes[0]?.velocity).toBe(127);
    expect(notes[1]?.velocity ?? 0).toBeLessThan(50);
  });

  test("flat spelling preference", () => {
    const notes = transcribeMelody(sine(466.16, 11025), SR, {
      prefer: "flat",
    });
    expect(notes[0]?.pitch.toString()).toBe("Bb4");
  });

  test("empty and silent input produce no notes", () => {
    expect(transcribeMelody(new Float64Array(0), SR)).toEqual([]);
    expect(transcribeMelody(new Float64Array(8192), SR)).toEqual([]);
  });
});

describe("constant-Q", () => {
  test("cqt peaks at the tone's semitone bin", () => {
    const bins = cqt(sine(440, 8192), SR);
    expect(bins.length).toBe(84);
    expect(bins.indexOf(Math.max(...bins))).toBe(45); // A4 = 45 above C1
    expect(Math.max(...bins)).toBeCloseTo(0.5, 1);
  });

  test("neighbouring semitones stay separated in the bass", () => {
    const bins = cqt(sine(110, 16384), SR); // A2 = bin 21
    const peak = bins[21] as number;
    expect(bins.indexOf(Math.max(...bins))).toBe(21);
    // ~-6 dB at the next semitone, and well down two semitones out.
    expect((bins[20] as number) / peak).toBeLessThan(0.55);
    expect((bins[22] as number) / peak).toBeLessThan(0.55);
    expect((bins[19] as number) / peak).toBeLessThan(0.2);
    expect((bins[23] as number) / peak).toBeLessThan(0.2);
  });

  test("cqtChroma folds to pitch classes, even for low notes", () => {
    const chroma = cqtChroma(sine(110, 16384), SR); // A2
    expect(chroma.length).toBe(12);
    expect(chroma.indexOf(Math.max(...chroma))).toBe(9);
    expect(chroma[9]).toBe(1);
  });

  test("respects binsPerOctave and octaves options", () => {
    const bins = cqt(sine(440, 8192), SR, { binsPerOctave: 24, octaves: 5 });
    expect(bins.length).toBe(120);
    expect(bins.indexOf(Math.max(...bins))).toBe(90); // 45 semitones × 2
  });
});
