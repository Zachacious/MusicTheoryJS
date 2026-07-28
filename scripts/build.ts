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
  "src/tuning/index.ts",
];

async function buildFormat(format: "esm" | "cjs") {
  const result = await Bun.build({
    entrypoints,
    outdir: "dist",
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

// `dir` naming keeps the `src/` prefix off the output; Bun strips the common
// root of the entrypoints automatically, so outputs land at dist/index.js,
// dist/note/index.js, etc.
await buildFormat("esm");
await buildFormat("cjs");

console.info("Build complete: ESM + CJS written to dist/");
