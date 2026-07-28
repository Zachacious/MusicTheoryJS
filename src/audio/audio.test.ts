import { describe, expect, test } from "bun:test";
import { chromagram } from "./chroma";
import { fft, magnitudeSpectrum, nextPow2 } from "./fft";
import { detectOnsets } from "./onset";
import { detectNote, detectPitch } from "./pitch";

const SR = 44100;

function sine(freq: number, length: number, sampleRate = SR): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return out;
}

describe("fft", () => {
  test("nextPow2", () => {
    expect(nextPow2(1000)).toBe(1024);
    expect(nextPow2(1024)).toBe(1024);
  });

  test("impulse has a flat magnitude spectrum", () => {
    const re = new Float64Array([1, 0, 0, 0]);
    const im = new Float64Array(4);
    fft(re, im);
    for (let i = 0; i < 4; i++)
      expect(Math.hypot(re[i] as number, im[i] as number)).toBeCloseTo(1, 9);
  });

  test("rejects non-power-of-two lengths", () => {
    expect(() => fft(new Float64Array(3), new Float64Array(3))).toThrow();
  });

  test("a pure tone peaks at the expected bin", () => {
    const size = 4096;
    const freq = 440;
    const mag = magnitudeSpectrum(sine(freq, size));
    let peak = 0;
    for (let i = 1; i < mag.length; i++)
      if ((mag[i] as number) > (mag[peak] as number)) peak = i;
    const expectedBin = Math.round((freq * size) / SR);
    expect(Math.abs(peak - expectedBin)).toBeLessThanOrEqual(1);
  });
});

describe("YIN pitch detection", () => {
  test("detects A4 = 440 Hz", () => {
    const f = detectPitch(sine(440, 4096), SR);
    expect(f).not.toBeNull();
    expect(Math.abs((f as number) - 440)).toBeLessThan(2);
  });

  test("detects across the range", () => {
    for (const target of [110, 220, 330, 660, 880]) {
      const f = detectPitch(sine(target, 4096), SR) as number;
      expect(Math.abs(f - target) / target).toBeLessThan(0.02);
    }
  });

  test("detectNote spells the detected pitch", () => {
    expect(detectNote(sine(440, 4096), SR)?.toString()).toBe("A4");
    expect(detectNote(sine(261.63, 8192), SR)?.toString()).toBe("C4");
  });

  test("returns null for silence", () => {
    expect(detectPitch(new Float32Array(4096), SR)).toBeNull();
  });
});

describe("chromagram", () => {
  test("a 440 Hz tone lights up pitch class A", () => {
    const chroma = chromagram(sine(440, 8192), SR);
    let argmax = 0;
    for (let i = 1; i < 12; i++)
      if ((chroma[i] as number) > (chroma[argmax] as number)) argmax = i;
    expect(argmax).toBe(9); // A
    expect(chroma[9]).toBeCloseTo(1, 6); // normalised peak
  });
});

describe("onset detection", () => {
  test("finds an onset where a tone starts after silence", () => {
    const silence = new Float32Array(8192); // ~0.186s
    const tone = sine(440, 8192);
    const signal = new Float32Array(silence.length + tone.length);
    signal.set(silence, 0);
    signal.set(tone, silence.length);

    const onsets = detectOnsets(signal, SR);
    expect(onsets.length).toBeGreaterThanOrEqual(1);
    const near = onsets.some((t) => Math.abs(t - 8192 / SR) < 0.05);
    expect(near).toBe(true);
  });

  test("silence yields no onsets", () => {
    expect(detectOnsets(new Float32Array(8192), SR)).toEqual([]);
  });
});
