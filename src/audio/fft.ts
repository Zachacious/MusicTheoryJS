/**
 * A dependency-free radix-2 Cooley–Tukey FFT and a magnitude-spectrum helper.
 *
 * These operate on plain sample arrays the caller provides (e.g. a frame pulled
 * from the Web Audio API). The library does no audio capture itself.
 */

/** Smallest power of two ≥ `n`. */
export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * In-place complex FFT. `re` and `im` must have the same power-of-two length;
 * on return they hold the transform.
 * @throws if the length is not a power of two.
 */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (n !== im.length || (n & (n - 1)) !== 0 || n === 0) {
    throw new RangeError("fft length must be a non-zero power of two");
  }

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i] as number;
      re[i] = re[j] as number;
      re[j] = tr;
      const ti = im[i] as number;
      im[i] = im[j] as number;
      im[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const ra = re[a] as number;
        const ia = im[a] as number;
        const rb = re[b] as number;
        const ib = im[b] as number;
        const tr = rb * cr - ib * ci;
        const ti = rb * ci + ib * cr;
        re[b] = ra - tr;
        im[b] = ia - ti;
        re[a] = ra + tr;
        im[a] = ia + ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/** A Hann window of length `n` applied to `samples` (zero-padded to `n`). */
export function hann(
  samples: Float32Array | Float64Array,
  n = samples.length
): Float64Array {
  const out = new Float64Array(n);
  const len = Math.min(samples.length, n);
  for (let i = 0; i < len; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1 || 1));
    out[i] = (samples[i] as number) * w;
  }
  return out;
}

/**
 * The magnitude spectrum (first half) of a real signal. The signal is
 * zero-padded to the next power of two. Bin `i` corresponds to frequency
 * `i * sampleRate / fftSize`.
 */
export function magnitudeSpectrum(
  samples: Float32Array | Float64Array
): Float64Array {
  const size = nextPow2(samples.length);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  for (let i = 0; i < samples.length; i++) re[i] = samples[i] as number;
  fft(re, im);
  const half = size >> 1;
  const mag = new Float64Array(half);
  for (let i = 0; i < half; i++)
    mag[i] = Math.hypot(re[i] as number, im[i] as number);
  return mag;
}
