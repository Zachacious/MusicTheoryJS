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

export * from "./fft";
export * from "./pitch";
export * from "./chroma";
export * from "./cqt";
export * from "./onset";
export * from "./transcribe";
