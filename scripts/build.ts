/**
 * Build script: emits tree-shakable ESM + CJS bundles for the main entry and
 * each public subpath. Type declarations are emitted separately by
 * `tsc -p tsconfig.build.json` (see the `build:types` script).
 */

export {};

const entrypoints = [
  "src/index.ts",
  "src/note/index.ts",
  "src/interval/index.ts",
  "src/scale/index.ts",
  "src/chord/index.ts",
  "src/key/index.ts",
  "src/analysis/index.ts",
  "src/midi/index.ts",
  "src/audio/index.ts",
  "src/tuning/index.ts",
];

async function buildFormat(format: "esm" | "cjs") {
  const result = await Bun.build({
    entrypoints,
    outdir: "dist",
    // Pin the root to `src` so outputs land at dist/<subpath>/index.js — matching
    // the exports map and the tsc-emitted .d.ts layout — rather than dist/src/…
    root: "src",
    target: "node",
    format,
    splitting: format === "esm",
    minify: false,
    sourcemap: "external",
    naming: {
      entry: format === "cjs" ? "[dir]/[name].cjs" : "[dir]/[name].js",
      chunk: "chunks/[name]-[hash].[ext]",
    },
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error(`${format.toUpperCase()} build failed`);
  }
  return result;
}

// With `root: "src"`, outputs land at dist/index.js, dist/note/index.js, etc.
await buildFormat("esm");
await buildFormat("cjs");

console.info("Build complete: ESM + CJS written to dist/");
