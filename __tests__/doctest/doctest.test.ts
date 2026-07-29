/**
 * Doctest runner: every `@example` block in `src/**` and every ```ts fence in
 * the markdown docs (README.md, MIGRATION.md) is extracted and executed here.
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
 * - Markdown fences tagged ```ts no-run are skipped (e.g. legacy v2 code in
 *   the migration guide).
 *
 * A final test enforces coverage: every function-valued export of the root
 * barrel must carry at least one `@example`.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import * as root from "../../src";
import * as chordNS from "../../src/chord";
import * as coreNS from "../../src/core";
import * as dictNS from "../../src/dict";
import * as harmonyNS from "../../src/harmony";
import * as keyNS from "../../src/key";
import * as microNS from "../../src/micro";
import * as pcsetNS from "../../src/pcset";
import * as progressionNS from "../../src/progression";
import * as romanNS from "../../src/roman";
import * as scaleNS from "../../src/scale";
import * as tuningNS from "../../src/tuning";

const ROOT = join(__dirname, "..", "..");

const MODULES: Record<string, Record<string, unknown>> = {
  musictheoryjs: root as Record<string, unknown>,
  "musictheoryjs/chord": chordNS,
  "musictheoryjs/core": coreNS,
  "musictheoryjs/dict": dictNS,
  "musictheoryjs/harmony": harmonyNS,
  "musictheoryjs/key": keyNS,
  "musictheoryjs/micro": microNS,
  "musictheoryjs/pcset": pcsetNS,
  "musictheoryjs/progression": progressionNS,
  "musictheoryjs/roman": romanNS,
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
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

/** Extract fenced ```ts blocks from a JSDoc comment body (still starred). */
function fencesFromJsdoc(jsdoc: string, file: string, startLine: number): string[] {
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
function extractFromSource(file: string): { examples: Example[]; documented: Set<string> } {
  const text = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);
  const examples: Example[] = [];
  const documented = new Set<string>();
  const jsdocRe = /\/\*\*([\s\S]*?)\*\//g;
  let m: RegExpExecArray | null;
  while ((m = jsdocRe.exec(text)) !== null) {
    const body = m[1];
    if (!body.includes("@example")) continue;
    const line = text.slice(0, m.index).split("\n").length;
    const after = text.slice(m.index + m[0].length);
    const decl = /^\s*export\s+(?:async\s+)?(?:function|const|class|let)\s+([A-Za-z0-9_$]+)/.exec(
      after
    );
    const name = decl ? decl[1] : null;
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
    const line = lines[i];
    if (current === null) {
      const fence = /^```(\w+)?(.*)$/.exec(line.trim());
      if (fence && fence[1] === "ts") {
        current = [];
        skip = /\bno-run\b/.test(fence[2] ?? "");
        startLine = i + 1;
      }
    } else if (line.trim() === "```") {
      if (!skip) examples.push({ where: `${rel}:${startLine}`, name: null, code: current.join("\n") });
      current = null;
    } else {
      current.push(line);
    }
  }
  if (current !== null) throw new Error(`Unclosed \`\`\` fence in ${rel}:${startLine}`);
  return examples;
}

/**
 * Validate-and-strip import lines; every imported name must genuinely be
 * exported by the module the example claims to import it from.
 */
function stripImports(code: string, where: string): string {
  const importRe = /import\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+["']([^"']+)["'];?/g;
  return code.replace(importRe, (_all, typeOnly, names: string, spec: string) => {
    const mod = MODULES[spec];
    if (mod === undefined) {
      throw new Error(`Example at ${where} imports from unknown module "${spec}"`);
    }
    if (!typeOnly) {
      for (const rawName of names.split(",")) {
        const name = rawName.replace(/\btype\b/, "").trim();
        if (name === "") continue;
        if (!(name in mod)) {
          throw new Error(`Example at ${where} imports "${name}" which "${spec}" does not export`);
        }
      }
    }
    return "";
  });
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
      const [, indent, expr, expected] = m;
      return `${indent}__assert(() => (${expr}), ${JSON.stringify(expected)}, ${JSON.stringify(
        expr.trim()
      )});`;
    })
    .join("\n");
  return { body, assertions };
}

function __assert(actualThunk: () => unknown, expectedRaw: string, exprText: string): void {
  const throwsMatch = /^throws(?:\s+"([\s\S]*)")?$/.exec(expectedRaw);
  if (throwsMatch !== null) {
    const substring = throwsMatch[1];
    expect(actualThunk, `\`${exprText}\` should throw`).toThrowError(
      substring === undefined ? undefined : new RegExp(escapeRegExp(substring))
    );
    return;
  }
  const actual = actualThunk();
  if (expectedRaw.startsWith("~")) {
    const num = expectedRaw.slice(1);
    const decimals = num.includes(".") ? num.split(".")[1].length : 0;
    expect(actual, `\`${exprText}\``).toBeCloseTo(Number(num), decimals);
    return;
  }
  // eslint-disable-next-line no-eval
  const expected = (0, eval)(`(${expectedRaw})`);
  expect(actual, `\`${exprText}\``).toEqual(expected);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

const sourceFiles = walk(join(ROOT, "src"));
const perFile = sourceFiles.map((f) => ({ file: relative(ROOT, f), ...extractFromSource(f) }));
const markdownFiles = ["README.md", "MIGRATION.md"].filter((f) => {
  try {
    statSync(join(ROOT, f));
    return true;
  } catch {
    return false;
  }
});

describe("doctest: src @example blocks", () => {
  for (const { file, examples } of perFile) {
    if (examples.length === 0) continue;
    describe(file, () => {
      for (const example of examples) {
        it(`${example.name ?? "(module)"} @ ${example.where}`, () => {
          const assertions = runExample(example);
          // Every example must actually check something, not just not-crash.
          expect(assertions, `example at ${example.where} has no \`// =>\` assertions`).toBeGreaterThan(0);
        });
      }
    });
  }
});

describe("doctest: markdown code fences", () => {
  for (const file of markdownFiles) {
    describe(file, () => {
      for (const example of extractFromMarkdown(join(ROOT, file))) {
        it(`fence @ ${example.where}`, () => {
          runExample(example);
        });
      }
    });
  }
});

describe("doctest coverage", () => {
  it("every public function has at least one executed @example", () => {
    const documented = new Set<string>();
    for (const { documented: d } of perFile) for (const name of d) documented.add(name);
    const missing = Object.entries(root as Record<string, unknown>)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
      .filter((name) => !documented.has(name))
      .sort();
    expect(missing, `public functions without an @example:\n  ${missing.join("\n  ")}`).toEqual([]);
  });
});
