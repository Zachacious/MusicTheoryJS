/**
 * The audio module: dependency-free DSP over caller-provided sample buffers —
 * a radix-2 FFT, monophonic (YIN) pitch detection, chroma extraction, and
 * spectral-flux onset detection.
 *
 * The library never captures audio; a client app obtains samples (e.g. from the
 * Web Audio API) and passes them in. Polyphonic transcription is a client
 * concern.
 */

export * from "./fft";
export * from "./pitch";
export * from "./chroma";
export * from "./onset";
