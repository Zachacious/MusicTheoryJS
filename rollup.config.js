import typescript from "rollup-plugin-typescript2";
import { uglify } from "rollup-plugin-uglify";
import dts from "rollup-plugin-dts";

const uglifyOptions = {
  sourcemap: true,
};

export default [
  {
    input: "src/index.ts",
    output: [
      {
        name: "MusicTheory",
        file: "dist/musictheory.js",
        format: "umd",
      },
    ],
    plugins: [typescript()],
  },

  {
    input: "src/index.ts",
    output: [
      {
        name: "MusicTheory",
        file: "dist/musictheory.min.js",
        format: "umd",
      },
    ],
    plugins: [typescript(), uglify(uglifyOptions)],
  },

  {
    input: "dist/index.d.ts",
    output: [
      {
        file: "dist/musictheory.d.ts",
        format: "umd",
      },
    ],
    plugins: [dts()],
  },
];
