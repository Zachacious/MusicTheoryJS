/**
 * Type-checks a consumer of the BUILT package under every module resolution
 * mode a user might configure, for both ESM (.mts) and CJS (.cts) consumers.
 * Declarations are checked too (no skipLibCheck), so a relative import without
 * an extension in dist/**\/*.d.ts fails here. Run after `bun run build`.
 */

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
const modes = [
  ["node16", "node16"],
  ["nodenext", "nodenext"],
  ["preserve", "bundler"],
];
const files = [
  "scripts/e2e-types/consumer.mts",
  "scripts/e2e-types/consumer.cts",
];

let failed = false;
for (const [module, moduleResolution] of modes) {
  for (const file of files) {
    const label = `${file} (module ${module}, moduleResolution ${moduleResolution})`;
    try {
      execFileSync(
        process.execPath,
        [
          tsc,
          "--noEmit",
          "--strict",
          "--target",
          "es2022",
          "--module",
          module,
          "--moduleResolution",
          moduleResolution,
          file,
        ],
        { stdio: "pipe" }
      );
      console.info(`ok   ${label}`);
    } catch (error) {
      failed = true;
      console.error(`FAIL ${label}\n${error.stdout}${error.stderr}`);
    }
  }
}

if (failed) process.exit(1);
console.info("e2e types: OK");
