/**
 * Doctest runner: every fenced ```ts block inside an `@example` JSDoc in
 * `src/**` and every ```ts fence in README.md is extracted and executed here.
 *
 * Conventions for example code (enforced by execution):
 * - `import { a, b } from "musictheoryjs"` (or a subpath) lines are validated
 *   against the real barrel exports, then stripped; the example body runs with
 *   every public export in scope.
 * - A line ending in `; // => <literal>` asserts deep equality with the
 *   evaluated literal (`"Bb4"`, `["C", "Eb"]`, `{ a: 1 }`, `null`, `42`).
 * - `; // => ~<number>` asserts closeness (precision = decimals given).
 * - `; // => throws` asserts the expression throws; `// => throws "text"`
 *   also asserts the message contains `text`.
 * - Plain lines simply execute (and must not throw).
 * - Markdown fences tagged ```ts no-run are skipped (inputs that need real
 *   MIDI bytes or audio buffers).
 *
 * A final ratchet test tracks which public functions still lack an example:
 * documenting one shrinks the list; adding an undocumented function without
 * an example (or a ratchet entry) fails.
 */

import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import * as analysisNS from "./analysis/index";
import * as audioNS from "./audio/index";
import * as chordNS from "./chord/index";
import * as root from "./index";
import * as intervalNS from "./interval/index";
import * as keyNS from "./key/index";
import * as midiNS from "./midi/index";
import * as notationNS from "./notation/index";
import * as noteNS from "./note/index";
import * as rhythmNS from "./rhythm/index";
import * as scaleNS from "./scale/index";
import * as tuningNS from "./tuning/index";

const SRC = import.meta.dir;
const ROOT = join(SRC, "..");

const MODULES: Record<string, Record<string, unknown>> = {
  musictheoryjs: root as Record<string, unknown>,
  "musictheoryjs/analysis": analysisNS,
  "musictheoryjs/audio": audioNS,
  "musictheoryjs/chord": chordNS,
  "musictheoryjs/interval": intervalNS,
  "musictheoryjs/key": keyNS,
  "musictheoryjs/midi": midiNS,
  "musictheoryjs/notation": notationNS,
  "musictheoryjs/note": noteNS,
  "musictheoryjs/rhythm": rhythmNS,
  "musictheoryjs/scale": scaleNS,
  "musictheoryjs/tuning": tuningNS,
};

/** Everything importable, merged into one execution scope. */
const SCOPE: Record<string, unknown> = Object.assign(
  Object.create(null),
  ...Object.values(MODULES)
);

interface Example {
  /** "file:line" of the fence start, for test names. */
  where: string;
  /** Export name the example documents, or null for module docs / markdown. */
  name: string | null;
  code: string;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts"))
      out.push(full);
  }
  return out;
}

/** Extract fenced ```ts blocks from a JSDoc comment body (still starred). */
function fencesFromJsdoc(
  jsdoc: string,
  file: string,
  startLine: number
): string[] {
  const lines = jsdoc.split("\n").map((l) => l.replace(/^\s*\*\s?/, ""));
  const blocks: string[] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (current === null) {
      if (/^```ts\s*$/.test(line.trim())) current = [];
    } else if (line.trim() === "```") {
      blocks.push(current.join("\n"));
      current = null;
    } else {
      current.push(line);
    }
  }
  if (current !== null) {
    throw new Error(`Unclosed \`\`\`ts fence in JSDoc at ${file}:${startLine}`);
  }
  return blocks;
}

/** All examples in a TS source file, with the export they document. */
function extractFromSource(file: string): {
  examples: Example[];
  documented: Set<string>;
} {
  const text = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);
  const examples: Example[] = [];
  const documented = new Set<string>();
  const jsdocRe = /\/\*\*([\s\S]*?)\*\//g;
  let m: RegExpExecArray | null = jsdocRe.exec(text);
  for (; m !== null; m = jsdocRe.exec(text)) {
    const body = m[1] as string;
    if (!body.includes("@example")) continue;
    const line = text.slice(0, m.index).split("\n").length;
    const after = text.slice(m.index + m[0].length);
    const decl =
      /^\s*export\s+(?:async\s+)?(?:function|const|class|let)\s+([A-Za-z0-9_$]+)/.exec(
        after
      );
    const name = decl ? (decl[1] as string) : null;
    for (const code of fencesFromJsdoc(body, rel, line)) {
      examples.push({ where: `${rel}:${line}`, name, code });
      if (name !== null) documented.add(name);
    }
  }
  return { examples, documented };
}

/** All runnable ```ts fences in a markdown file. */
function extractFromMarkdown(file: string): Example[] {
  const text = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);
  const examples: Example[] = [];
  const lines = text.split("\n");
  let current: string[] | null = null;
  let skip = false;
  let startLine = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (current === null) {
      const fence = /^```(\w+)?(.*)$/.exec(line.trim());
      if (fence && fence[1] === "ts") {
        current = [];
        skip = /\bno-run\b/.test(fence[2] ?? "");
        startLine = i + 1;
      }
    } else if (line.trim() === "```") {
      if (!skip) {
        examples.push({
          where: `${rel}:${startLine}`,
          name: null,
          code: current.join("\n"),
        });
      }
      current = null;
    } else {
      current.push(line);
    }
  }
  if (current !== null) {
    throw new Error(`Unclosed \`\`\` fence in ${rel}:${startLine}`);
  }
  return examples;
}

/**
 * Validate-and-strip import lines; every imported name must genuinely be
 * exported by the module the example claims to import it from.
 */
function stripImports(code: string, where: string): string {
  const importRe =
    /import\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+["']([^"']+)["'];?/g;
  return code.replace(
    importRe,
    (_all, typeOnly: string | undefined, names: string, spec: string) => {
      const mod = MODULES[spec];
      if (mod === undefined) {
        throw new Error(
          `Example at ${where} imports from unknown module "${spec}"`
        );
      }
      if (!typeOnly) {
        for (const rawName of names.split(",")) {
          const name = rawName.replace(/\btype\b/, "").trim();
          if (name === "") continue;
          if (!(name in mod)) {
            throw new Error(
              `Example at ${where} imports "${name}" which "${spec}" does not export`
            );
          }
        }
      }
      return "";
    }
  );
}

/** Rewrite `expr; // => expected` lines into __assert() calls. */
function instrument(code: string): { body: string; assertions: number } {
  let assertions = 0;
  const body = code
    .split("\n")
    .map((line) => {
      const m = /^(\s*)(.+);\s*\/\/\s*=>\s*(.+?)\s*$/.exec(line);
      if (m === null) return line;
      assertions++;
      const [, indent, expr, expected] = m as unknown as [
        string,
        string,
        string,
        string,
      ];
      return `${indent}__assert(() => (${expr}), ${JSON.stringify(
        expected
      )}, ${JSON.stringify(expr.trim())});`;
    })
    .join("\n");
  return { body, assertions };
}

function __assert(
  actualThunk: () => unknown,
  expectedRaw: string,
  exprText: string
): void {
  const throwsMatch = /^throws(?:\s+"([\s\S]*)")?$/.exec(expectedRaw);
  if (throwsMatch !== null) {
    let threw: unknown = null;
    let didThrow = false;
    try {
      actualThunk();
    } catch (error) {
      didThrow = true;
      threw = error;
    }
    if (!didThrow) {
      throw new Error(`\`${exprText}\` should throw, but did not`);
    }
    const substring = throwsMatch[1];
    if (substring !== undefined) {
      const message = threw instanceof Error ? threw.message : String(threw);
      if (!message.includes(substring)) {
        throw new Error(
          `\`${exprText}\` threw "${message}", expected it to contain "${substring}"`
        );
      }
    }
    return;
  }
  const actual = actualThunk();
  if (expectedRaw.startsWith("~")) {
    const num = expectedRaw.slice(1);
    const decimals = num.includes(".")
      ? (num.split(".")[1] as string).length
      : 0;
    expect(actual).toBeCloseTo(Number(num), decimals);
    return;
  }
  // biome-ignore lint/security/noGlobalEval: evaluating our own doc literals
  // biome-ignore lint/style/noCommaOperator: indirect eval keeps global scope
  const expected = (0, eval)(`(${expectedRaw})`);
  expect(actual).toEqual(expected);
}

function runExample(example: Example): number {
  const withoutImports = stripImports(example.code, example.where);
  const { body, assertions } = instrument(withoutImports);
  // Sloppy-mode Function so `with` can expose the whole public API to the
  // example body without rewriting identifiers.
  const fn = new Function(
    "__scope",
    "__assert",
    `with (__scope) {\n${body}\n}`
  );
  fn(SCOPE, __assert);
  return assertions;
}

const sourceFiles = walk(SRC);
const perFile = sourceFiles.map((f) => ({
  file: relative(ROOT, f),
  ...extractFromSource(f),
}));

describe("doctest: src @example blocks", () => {
  for (const { file, examples } of perFile) {
    if (examples.length === 0) continue;
    describe(file, () => {
      for (const example of examples) {
        it(`${example.name ?? "(module)"} @ ${example.where}`, () => {
          const assertions = runExample(example);
          // Every source example must actually check something.
          expect(assertions).toBeGreaterThan(0);
        });
      }
    });
  }
});

describe("doctest: README code fences", () => {
  for (const example of extractFromMarkdown(join(ROOT, "README.md"))) {
    it(`fence @ ${example.where}`, () => {
      runExample(example);
    });
  }
});

/**
 * Public functions that predate the doctest runner and do not yet carry an
 * `@example`. Shrink this list; never grow it. (Phase 2+ ports must land
 * with examples from day one.)
 */
const RATCHET: readonly string[] = [
  "Chord",
  "Key",
  "Note",
  "Scale",
  "addIntervals",
  "analyzeHarmony",
  "bpmToTempo",
  "centsBetween",
  "centsTuning",
  "chroma",
  "chromagram",
  "closeVoicing",
  "degreeCents",
  "detectCadences",
  "detectChord",
  "detectChordAt",
  "detectKey",
  "detectNote",
  "detectOnsets",
  "detectPitch",
  "detectQuality",
  "drop2",
  "drop3",
  "edo",
  "equalTemperament",
  "fft",
  "formatAccidental",
  "formatNote",
  "frequencyOfDegree",
  "frequencyOfNote",
  "fromFrequency",
  "hann",
  "harmonicRhythm",
  "interval",
  "intervalBetween",
  "intervalClassVector",
  "intervalName",
  "intervalNumber",
  "intervalQuality",
  "isChordQuality",
  "isEnharmonic",
  "isScaleName",
  "justIntonation",
  "letterOf",
  "magnitudeSpectrum",
  "midi",
  "midiToNoteStream",
  "mode",
  "modes",
  "negateInterval",
  "nextPow2",
  "note",
  "noteCents",
  "noteStreamToMidi",
  "notesSoundingAt",
  "onsetTimes",
  "parseChordSymbol",
  "parseMidi",
  "parseNote",
  "parseRoman",
  "pitchClass",
  "pitchClassWeights",
  "pitchClassWeightsFromStream",
  "pitchClasses",
  "point",
  "pythagorean",
  "quarterCommaMeantone",
  "raiseOctave",
  "ratioTuning",
  "romanProgression",
  "scalaTuning",
  "scaleFromTuning",
  "secondsPerTick",
  "segmentChords",
  "spectralFlux",
  "spelled",
  "spelledEquals",
  "spread",
  "tempoToBpm",
  "toFrequency",
  "transpose",
  "transposeCents",
  "tryParseChordSymbol",
  "tryParseNote",
  "writeMidi",
];

describe("doctest coverage ratchet", () => {
  it("every public function has an @example or a ratchet entry", () => {
    const documented = new Set<string>();
    for (const { documented: d } of perFile) {
      for (const name of d) documented.add(name);
    }
    const missing = Object.entries(root as Record<string, unknown>)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
      .filter((name) => !documented.has(name))
      .sort();
    expect(missing).toEqual([...RATCHET].sort());
  });
});
