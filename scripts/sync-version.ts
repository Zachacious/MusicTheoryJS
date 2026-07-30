/**
 * Keep the exported `VERSION` constant in step with `package.json`.
 *
 * The constant is a literal in `src/index.ts` rather than a read of
 * `package.json`, so the published bundles stay self-contained and need no JSON
 * import. The cost of that is a value which can drift — and it did: it sat at
 * `3.0.0` through the 3.0.1, 3.0.2, and 3.1.0 releases.
 *
 * This runs from the `version` script, right after Changesets bumps
 * `package.json`, so the two move together. `src/index.test.ts` asserts they
 * match, so a release that skips this step fails CI rather than shipping a lie.
 */

export {};

const ROOT = new URL("..", import.meta.url).pathname;
const INDEX = `${ROOT}src/index.ts`;

const pkg = (await Bun.file(`${ROOT}package.json`).json()) as {
  version: string;
};
const source = await Bun.file(INDEX).text();

const PATTERN = /^(export const VERSION = ")([^"]*)(";)$/m;
const match = PATTERN.exec(source);
if (!match) {
  throw new Error(
    `could not find the VERSION constant in ${INDEX} — has it been renamed?`
  );
}

if (match[2] === pkg.version) {
  console.log(`VERSION already ${pkg.version} — nothing to do`);
} else {
  await Bun.write(INDEX, source.replace(PATTERN, `$1${pkg.version}$3`));
  console.log(`VERSION ${match[2]} → ${pkg.version}`);
}
