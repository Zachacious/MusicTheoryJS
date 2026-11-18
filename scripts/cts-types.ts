/**
 * Mirrors every emitted `dist/**\/*.d.ts` to a `.d.cts` sibling for the
 * `require` condition of the exports map.
 *
 * The package is `"type": "module"`, so TypeScript reads `.d.ts` files as ES
 * module declarations. Under `moduleResolution: node16`/`nodenext`, a CommonJS
 * consumer pointed at them gets TS1479 ("cannot be imported with require").
 * A `.d.cts` copy whose relative specifiers end in `.cjs` describes the CJS
 * build instead. Run after `tsc -p tsconfig.build.json`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { Glob } from "bun";

const RELATIVE_JS =
  /(\bfrom\s*|\bimport\s*\(\s*)(["'])(\.{1,2}\/[^"']*)\.js\2/g;

let count = 0;
for (const path of new Glob("dist/**/*.d.ts").scanSync(".")) {
  const source = readFileSync(path, "utf8");
  const cts = source
    .replace(RELATIVE_JS, "$1$2$3.cjs$2")
    // The declaration map describes the .d.ts; drop the pointer rather than
    // ship a map whose `file` names a different declaration.
    .replace(/\n\/\/# sourceMappingURL=.*$/, "\n");
  writeFileSync(path.replace(/\.d\.ts$/, ".d.cts"), cts);
  count++;
}

console.info(`Wrote ${count} .d.cts declarations to dist/`);
