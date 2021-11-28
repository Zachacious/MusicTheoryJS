require("esbuild")
  .build({
    entryPoints: ["src/index.res"],
    bundle: true,
    // outfile: "dist/MusicTheory.js",
    outdir: "dist",
    format: "esm",
    define: {
      "process.env.NODE_ENV": JSON.stringify("development"),
    },
    minify: false,
    target: "es6",
    watch: true,
    splitting: true,
    chunkNames: "chunk/[name]-[hash].js",
    incremental: true,
    treeShaking: true,
  })
  .catch(() => process.exit(1));
