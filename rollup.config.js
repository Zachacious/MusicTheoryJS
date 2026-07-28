import commonjs from "@rollup/plugin-commonjs";
import dts from "rollup-plugin-dts";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import typescript from "rollup-plugin-typescript2";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        name: "MusicTheoryJS",
        file: "dist/musictheory.js",
        format: "umd",
        sourcemap: true,
      },
      {
        file: "dist/musictheory.esm.js",
        format: "esm",
        sourcemap: true,
      },
      {
        file: "dist/musictheory.cjs",
        format: "cjs",
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: "tsconfig.build.json",
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          compilerOptions: { emitDeclarationOnly: false },
          exclude: ["**/*.test.ts", "**/*.spec.ts"],
        },
      }),
      nodeResolve(),
      commonjs(),
      json(),
    ],
  },

  {
    input: "src/index.ts",
    output: [
      {
        name: "MusicTheoryJS",
        file: "dist/musictheory.min.js",
        format: "umd",
        sourcemap: true,
      },
      {
        file: "dist/musictheory.esm.min.js",
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: "tsconfig.build.json",
        useTsconfigDeclarationDir: true,
        tsconfigOverride: {
          compilerOptions: { emitDeclarationOnly: false },
          exclude: ["**/*.test.ts", "**/*.spec.ts"],
        },
      }),
      nodeResolve(),
      commonjs(),
      json(),
      terser({
        format: {
          comments: false,
        },
      }),
    ],
  },

  {
    input: "dist/index.d.ts",
    output: [
      {
        file: "dist/musictheory.d.ts",
        format: "es",
      },
    ],
    plugins: [dts()],
  },
];
