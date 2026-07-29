/**
 * The live-example playground: upgrades every `.mtjs-live` block (emitted by
 * the remark-live plugin) into an editable snippet that runs against the real
 * library, bundled straight from this repo's source.
 *
 * Inside a snippet the whole public API is in scope, plus two helpers:
 * - `log(...values)` prints to the block's output panel.
 * - `play(input)` makes sound with the Web Audio API: a `Note`/name plays one
 *   tone, a `Chord` sounds its notes together, a `Scale`/array plays a run, a
 *   `NoteStream` (events with `pitch`/`start`/`duration` in seconds) plays on
 *   its own timeline, and tuned degrees / raw numbers are frequencies in Hz.
 */

import * as lib from "musictheoryjs";

/* ---------------------------------------------------------------- format */

function format(value: unknown): string {
  // Multi-line strings (ABC tunes, MusicXML) print raw; short ones quoted.
  if (typeof value === "string") {
    return value.includes("\n") ? value : JSON.stringify(value);
  }
  if (typeof value !== "object" || value === null) return String(value);
  if (Array.isArray(value)) return `[${value.map(format).join(", ")}]`;
  if (ArrayBuffer.isView(value)) {
    const rounded = Array.from(value as unknown as ArrayLike<number>).map(
      (x) => Math.round(x * 1000) / 1000
    );
    return format(rounded);
  }
  const proto = Object.getPrototypeOf(value) as { toString?: unknown } | null;
  if (proto && proto.toString !== Object.prototype.toString) {
    return String(value);
  }
  try {
    const json = JSON.stringify(value);
    if (json === undefined) return String(value);
    return json.length > 400 ? `${json.slice(0, 400)}…` : json;
  } catch {
    return String(value);
  }
}

/* ------------------------------------------------------------------ play */

interface Voice {
  frequency: number;
  start: number;
  duration: number;
}

function frequencyOf(x: unknown): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") return lib.frequencyOfNote(lib.note(x));
  if (typeof x === "object" && x !== null) {
    if ("frequency" in x && typeof x.frequency === "number") {
      return x.frequency;
    }
    if ("step" in x) return lib.frequencyOfNote(x as lib.SpelledPitch);
    if ("pitch" in x) return frequencyOf((x as { pitch: unknown }).pitch);
  }
  throw new Error(`play(): cannot find a frequency in ${format(x)}`);
}

let ctx: AudioContext | undefined;

function schedule(voices: Voice[]): void {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  const t0 = ctx.currentTime + 0.04;
  for (const v of voices) {
    if (!Number.isFinite(v.frequency) || v.frequency <= 0) continue;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = v.frequency;
    const gain = ctx.createGain();
    const start = t0 + v.start;
    const end = start + v.duration;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.015);
    gain.gain.setValueAtTime(0.12, Math.max(start + 0.015, end - 0.05));
    gain.gain.linearRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.05);
  }
}

function play(input: unknown, options: { tempo?: number } = {}): void {
  const perNote = 60 / (options.tempo ?? 180);
  const run = (items: readonly unknown[]): Voice[] =>
    items.map((x, i) => ({
      frequency: frequencyOf(x),
      start: i * perNote,
      duration: perNote * 0.92,
    }));

  let voices: Voice[];
  if (input instanceof lib.Chord) {
    voices = input.notes.map((n) => ({
      frequency: lib.frequencyOfNote(n),
      start: 0,
      duration: 1.2,
    }));
  } else if (input instanceof lib.Scale) {
    voices = run(input.notes);
  } else if (Array.isArray(input)) {
    const first: unknown = input[0];
    const isStream =
      typeof first === "object" &&
      first !== null &&
      "pitch" in first &&
      "start" in first;
    voices = isStream
      ? (input as ReadonlyArray<Record<string, unknown>>).map((e) => ({
          frequency: frequencyOf(e.pitch),
          start: Number(e.start),
          duration: Math.max(0.08, Number(e.duration ?? 0.3)),
        }))
      : run(input);
  } else {
    voices = [{ frequency: frequencyOf(input), start: 0, duration: 0.8 }];
  }
  schedule(voices);
}

/* ------------------------------------------------------------------- run */

function execute(code: string): { lines: string[]; error: boolean } {
  const lines: string[] = [];
  const log = (...args: unknown[]) => {
    lines.push(args.map(format).join(" "));
  };
  const scope: Record<string, unknown> = {
    ...lib,
    log,
    play,
    console: { ...console, log },
  };
  try {
    // Sloppy-mode Function so `with` can expose the whole public API to the
    // snippet without rewriting identifiers (mirrors the doctest runner).
    const fn = new Function("__scope", `with (__scope) {\n${code}\n}`);
    fn(scope);
    if (lines.length === 0) {
      lines.push("✓ ran — log(…) prints here, play(…) makes sound");
    }
    return { lines, error: false };
  } catch (error) {
    // Keep whatever was logged before the failure, then show the error.
    lines.push(String(error));
    return { lines, error: true };
  }
}

/* -------------------------------------------------------------------- UI */

function button(label: string, primary: boolean): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.className = primary ? "mtjs-live-btn primary" : "mtjs-live-btn";
  return b;
}

function upgrade(el: HTMLElement): void {
  const original = decodeURIComponent(el.dataset.code ?? "");
  el.textContent = "";

  const editor = document.createElement("textarea");
  editor.className = "mtjs-live-editor";
  editor.value = original;
  editor.spellcheck = false;
  editor.setAttribute("aria-label", "Editable example code");
  const size = () => {
    editor.style.height = "auto";
    editor.style.height = `${editor.scrollHeight + 2}px`;
  };
  editor.addEventListener("input", size);

  const output = document.createElement("pre");
  output.className = "mtjs-live-output";
  output.hidden = true;

  const runBtn = button("Run ▶", true);
  runBtn.addEventListener("click", () => {
    const result = execute(editor.value);
    output.hidden = false;
    output.classList.toggle("error", result.error);
    output.textContent = result.lines.join("\n");
  });

  const resetBtn = button("Reset", false);
  resetBtn.addEventListener("click", () => {
    editor.value = original;
    output.hidden = true;
    size();
  });

  const bar = document.createElement("div");
  bar.className = "mtjs-live-bar";
  bar.append(runBtn, resetBtn);

  el.append(editor, bar, output);
  size();
}

for (const el of document.querySelectorAll<HTMLElement>(".mtjs-live")) {
  upgrade(el);
}
