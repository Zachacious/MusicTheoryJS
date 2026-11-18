/**
 * The audio module: dependency-free DSP over caller-provided sample buffers —
 * a radix-2 FFT, monophonic (YIN) pitch detection, FFT and constant-Q chroma
 * extraction, spectral-flux onset detection, and a monophonic melody
 * transcriber that turns all of it into a symbolic note stream.
 *
 * The library never captures audio; a client app obtains samples (e.g. from the
 * Web Audio API) and passes them in. Polyphonic transcription is a client
 * concern.
 */

export * from "./fft.js";
export * from "./pitch.js";
export * from "./chroma.js";
export * from "./cqt.js";
export * from "./onset.js";
export * from "./transcribe.js";
