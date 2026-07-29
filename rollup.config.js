import commonjs from "@rollup/plugin-commonjs";
import dts from "rollup-plugin-dts";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "rollup-plugin-typescript2";

/** Every subpath export ships as its own entry (plus the root barrel). */
const MODULES = [
  "core",
  "pcset",
  "dict",
  "chord",
  "scale",
  "key",
  "roman",
  "progression",
  "harmony",
  "micro",
  "tuning",
];

const input = {
  index: "src/index.ts",
  ...Object.fromEntries(MODULES.map((m) => [m, `src/${m}/index.ts`])),
};

const tsPlugin = () =>
  typescript({
    tsconfig: "tsconfig.build.json",
    tsconfigOverride: {
      compilerOptions: { declaration: false, emitDeclarationOnly: false, noEmit: false },
      exclude: ["**/*.test.ts", "**/*.spec.ts", "__tests__"],
    },
  });

export default [
  // Modular ESM + CJS builds, code-split so subpath entries share chunks.
  {
    input,
    output: [
      {
        dir: "dist/esm",
        format: "esm",
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        sourcemap: true,
      },
      {
        dir: "dist/cjs",
        format: "cjs",
        entryFileNames: "[name].cjs",
        chunkFileNames: "chunks/[name]-[hash].cjs",
        exports: "named",
        sourcemap: true,
      },
    ],
    plugins: [tsPlugin(), nodeResolve(), commonjs(), json()],
  },

  // Browser UMD build of the full library (plus a minified copy for CDNs).
  {
    input: "src/index.ts",
    output: [
      {
        name: "MusicTheoryJS",
        file: "dist/musictheory.umd.js",
        format: "umd",
        sourcemap: true,
      },
      {
        name: "MusicTheoryJS",
        file: "dist/musictheory.umd.min.js",
        format: "umd",
        sourcemap: true,
        plugins: [terser({ format: { comments: false } })],
      },
    ],
    plugins: [tsPlugin(), nodeResolve(), commonjs(), json()],
  },

  // Self-contained declaration bundles: one .d.ts + identical .d.cts per
  // entry, rolled up from the tsc output in dist/types-tmp.
  ...Object.entries(input).map(([name, src]) => ({
    input: src.replace(/^src\/(.*)\.ts$/, "dist/types-tmp/$1.d.ts"),
    output: [
      { file: `dist/types/${name}.d.ts`, format: "es" },
      { file: `dist/types/${name}.d.cts`, format: "es" },
    ],
    plugins: [dts()],
  })),
];
