/**
 * Release helper — turns the multi-step Changesets flow into one command.
 *
 *   bun run release:cut <patch|minor|major> "<summary>" [options]
 *
 * By default it authors a changeset for the summary you give, stages every
 * pending change, and commits. Add --push to send it to `master`, where the
 * Release workflow opens (or updates) the "Version Packages" PR; merging that
 * PR publishes to npm with provenance. That is the normal path.
 *
 * When you'd rather not wait on CI (e.g. a docs-only fix that has to hit npm
 * now), --publish runs the whole thing locally: version bump, build, verify,
 * `changeset publish`, and a tag push. It needs `npm login` first.
 *
 * Options:
 *   --push       push the commit to the current branch (kicks off CI)
 *   --publish    publish locally end-to-end instead of handing off to CI
 *   --dry-run    print every step without writing, committing, or publishing
 *
 * Examples:
 *   bun run release:cut patch "Rewrite README for a JS-developer audience"
 *   bun run release:cut patch "Fix homepage URL" --push
 *   bun run release:cut patch "Ship README now" --publish
 */

export {};

type Bump = "patch" | "minor" | "major";

const PKG = "musictheoryjs";
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const positional = argv.filter((a) => !a.startsWith("--"));

const dryRun = flags.has("--dry-run");
const doPush = flags.has("--push");
const doPublish = flags.has("--publish");

const [bump, ...summaryParts] = positional;
const summary = summaryParts.join(" ").trim();

function die(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

if (bump !== "patch" && bump !== "minor" && bump !== "major") {
  die(
    'First argument must be the bump type: "patch", "minor", or "major".\n' +
      '  bun run release:cut patch "Summary of the change" [--push|--publish]'
  );
}
if (!summary) {
  die('Give a one-line summary in quotes: bun run release:cut patch "…".');
}

/** Run a command, streaming its output. Skips execution on --dry-run. */
function run(cmd: string[], { always = false } = {}): void {
  const shown = cmd.join(" ");
  if (dryRun && !always) {
    console.log(`  · would run: ${shown}`);
    return;
  }
  console.log(`  $ ${shown}`);
  const { exitCode } = Bun.spawnSync(cmd, {
    stdout: "inherit",
    stderr: "inherit",
  });
  if (exitCode !== 0) die(`Command failed (${exitCode}): ${shown}`);
}

/** Capture a command's stdout (always runs, even on --dry-run — read-only). */
function capture(cmd: string[]): string {
  return Bun.spawnSync(cmd, { stdout: "pipe" }).stdout.toString().trim();
}

const branch = capture(["git", "rev-parse", "--abbrev-ref", "HEAD"]);
if (branch !== "master") {
  console.warn(
    `⚠  You're on "${branch}", not "master". Releases publish from master.`
  );
}

// 1. Author the changeset.
const slug =
  summary
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "release";
const id = crypto.randomUUID().slice(0, 8);
const changesetPath = `.changeset/${slug}-${id}.md`;
const changeset = `---\n"${PKG}": ${bump satisfies Bump}\n---\n\n${summary}\n`;

console.log(`\n▸ Authoring changeset  (${bump})`);
if (dryRun) {
  console.log(`  · would write ${changesetPath}:\n`);
  console.log(changeset.replace(/^/gm, "    "));
} else {
  await Bun.write(changesetPath, changeset);
  console.log(`  wrote ${changesetPath}`);
}

if (doPublish) {
  // Local end-to-end publish. Reuses the same npm scripts CI runs.
  console.log("\n▸ Publishing locally (skipping the CI Version PR)");
  run(["bun", "run", "version"]); // apply changesets: bump package.json + CHANGELOG
  run(["git", "add", "-A"]);
  const version = dryRun
    ? "<next>"
    : JSON.parse(await Bun.file("package.json").text()).version;
  run(["git", "commit", "-m", `chore: release v${version}`]);
  run(["bun", "run", "release"]); // build + changeset publish (with provenance in CI; local needs npm login)
  run(["git", "push", "--follow-tags"]);
  console.log(`\n✓ Published v${version} and pushed tags.`);
} else {
  // Hand off to CI: commit the work, optionally push.
  console.log("\n▸ Committing pending work");
  console.log(
    capture(["git", "status", "--short"]).replace(/^/gm, "    ") ||
      "    (clean)"
  );
  run(["git", "add", "-A"]);
  run(["git", "commit", "-m", summary]);
  if (doPush) run(["git", "push"]);

  console.log(`\n✓ Changeset committed${doPush ? " and pushed." : "."}`);
  if (!doPush) {
    console.log(
      "  Next: git push   → the Release workflow opens the Version Packages PR."
    );
  } else {
    console.log(
      "  Next: merge the Version Packages PR on GitHub → CI publishes to npm."
    );
  }
}

if (dryRun)
  console.log("\n(dry run — nothing was written, committed, or published.)");
