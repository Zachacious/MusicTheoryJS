/**
 * Astro integration: builds the What's new page (/whats-new/) from the
 * repository's CHANGELOG.md, so release notes are written once, as a
 * changeset, and the site never drifts from what was published.
 *
 * Runs on every `astro dev` and `astro build`, before the content layer reads
 * the docs collection. In dev, editing CHANGELOG.md restarts the server,
 * which regenerates the page. The generated file is gitignored.
 *
 * Changesets writes no dates, so each release is dated by the commit that
 * added its `## x.y.z` heading to CHANGELOG.md: the merge of the Version
 * Packages PR, which is when it published. A shallow clone has no such
 * history, and the page then omits dates rather than print wrong ones (the
 * docs workflow checks out with full history).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const CHANGELOG = `${ROOT}CHANGELOG.md`;
const PAGE = fileURLToPath(
  new URL("../content/docs/whats-new.md", import.meta.url),
);
const REPO = "https://github.com/Zachacious/MusicTheoryJS";

const RELEASE_KIND = {
  Major: "Major release",
  Minor: "Minor release",
  Patch: "Patch release",
};

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

/** YYYY-MM-DD → "August 1, 2026", or "" when the history can't say. */
function releaseDate(version, shallow) {
  if (shallow) return "";
  // Oldest commit that changed the count of this heading. Taking the oldest
  // also handles prefixes: adding "## 3.0.10" later matches "## 3.0.1" too.
  const days = git([
    "log",
    "--format=%cs",
    `-S## ${version}`,
    "--",
    "CHANGELOG.md",
  ]).split("\n");
  const day = days[days.length - 1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** CHANGELOG.md → [{ version, groups: [{ heading, kind, lines }] }]. */
function parse(markdown) {
  const releases = [];
  let release;
  let group;
  for (const line of markdown.split("\n")) {
    const version = /^## (\S+)\s*$/.exec(line);
    if (version) {
      release = { version: version[1], groups: [] };
      releases.push(release);
      group = undefined;
      continue;
    }
    if (!release) continue; // the "# musictheoryjs" title
    const heading = /^### (.+?)\s*$/.exec(line);
    if (heading) {
      const kind = /^(Major|Minor|Patch) Changes$/.exec(heading[1])?.[1];
      group = { heading: heading[1], kind, lines: [] };
      release.groups.push(group);
      continue;
    }
    // "- fdf7139: Text" → "- Text": the short hash means nothing to readers.
    if (group) group.lines.push(line.replace(/^- [0-9a-f]{7,40}: /, "- "));
  }
  return releases;
}

function trimBlank(lines) {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start++;
  while (end > start && lines[end - 1].trim() === "") end--;
  return lines.slice(start, end);
}

function render(releases, shallow) {
  const out = [
    "---",
    "title: What's new",
    "description: Every published version of MusicTheoryJS, newest first, with what each one added, changed, and fixed.",
    "tableOfContents:",
    "  maxHeadingLevel: 2",
    "---",
    "",
    "<!-- Generated from CHANGELOG.md by src/integrations/whats-new.mjs. Edit the changeset, not this file. -->",
    "",
    `Every published version, newest first. The same notes are in [CHANGELOG.md](${REPO}/blob/master/CHANGELOG.md) and on [GitHub Releases](${REPO}/releases). Coming from 2.x? Start with the [migration guide](/guides/migration/).`,
    "",
  ];
  for (const { version, groups } of releases) {
    const kind = groups.map((g) => g.kind).find(Boolean);
    const meta = [RELEASE_KIND[kind], releaseDate(version, shallow)]
      .filter(Boolean)
      .join(" · ");
    out.push(`## ${version}`, "");
    if (meta) out.push(`*${meta}*`, "");
    for (const group of groups) {
      // One group is the norm; label them only when a release mixes kinds.
      if (groups.length > 1) out.push(`### ${group.heading}`, "");
      out.push(...trimBlank(group.lines), "");
    }
  }
  return `${out.join("\n").trimEnd()}\n`;
}

export function generateWhatsNew() {
  const shallow = git(["rev-parse", "--is-shallow-repository"]) === "true";
  const page = render(parse(readFileSync(CHANGELOG, "utf8")), shallow);
  // Rewriting an unchanged file would trigger a needless content reload.
  if (existsSync(PAGE) && readFileSync(PAGE, "utf8") === page) return;
  writeFileSync(PAGE, page);
}

export function whatsNew() {
  return {
    name: "mtjs-whats-new",
    hooks: {
      "astro:config:setup": ({ addWatchFile, logger }) => {
        generateWhatsNew();
        addWatchFile(CHANGELOG);
        logger.info("generated whats-new.md from CHANGELOG.md");
      },
    },
  };
}
