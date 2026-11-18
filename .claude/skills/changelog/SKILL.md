---
name: changelog
description: Write the changeset (the changelog entry) for a change to MusicTheoryJS — read what changed, decide whether people using the package would notice, pick the semver bump, and add or update one file in .changeset/. Use after shipping a feature or a fix users would notice, when the Stop hook asks for one, or when the user types /changelog.
---

# Changelog entry (a changeset)

A changeset is a small markdown file in `.changeset/`. Its text is published
word for word, in three places:

1. **`CHANGELOG.md`**. CI's "Version Packages" PR runs `bun run version`,
   which turns every pending changeset into one release: it bumps
   `package.json` and the `VERSION` constant, writes the notes, and deletes
   the changeset files.
2. **The GitHub Release** that the release workflow creates when that PR is
   merged and the version publishes to npm.
3. **The What's new page** on the docs site (`/whats-new/`), generated from
   `CHANGELOG.md` at build time by `docs/src/integrations/whats-new.mjs`.

The readers are JavaScript and TypeScript developers who use the library.
They know the API, not the repo.

## 1. Decide whether there is anything to say

Look at what this session changed (`git diff`, plus new files). Write an
entry for anything someone using the package would **notice**:

- a new export, option, subpath or capability
- different output or behaviour from an existing call
- a type change (stricter, looser, renamed)
- a bug fix in released code
- packaging: `exports`, CJS/ESM output, engines, dependencies
- README or `skills/musictheoryjs/` text. npm shows the README and the skill
  ships in the tarball, so neither reaches anyone until a release (3.2.2 was
  a README-only release).

Write no entry for tests, refactors that behave the same, benchmarks,
`examples/`, `scripts/`, CI, or docs-site-only changes (the site deploys on
every push to master without a release). Do the same for a fix to something
not yet released: update the pending changeset that introduced the feature
instead. When there is nothing to say, say so in one line.

Check `.changeset/` for pending files first. If one covers the same feature
and is from this session or still unreleased, **edit it** rather than adding
another. Each changeset becomes one bullet in the release notes.

## 2. Bump

- **major**: anything that breaks existing code, such as a removed or renamed
  export, a changed signature, a changed return shape that callers rely on,
  or dropped runtime support. **Only when the user says so.** If a change
  looks breaking, stop and tell them instead of writing a major.
- **minor**: additive. A new export, option, subpath or capability.
- **patch**: bug fixes, README and skill text, performance, internals that
  people can only see as "it works better".

## 3. Write it

`.changeset/<short-kebab-name>.md`:

```md
---
"musictheoryjs": patch
---

Fix the exported `VERSION` constant, which reported `"3.0.0"` on 3.0.1, 3.0.2,
and 3.1.0. It now always matches the published version.
```

Follow how the entries already in `CHANGELOG.md` are written:

- **Open with what someone can now do, or what is different.** One plain
  sentence, before any background.
- **Name the real exports** in backticks, and give a short call where it
  makes the change concrete (`parseProgression("ii7 V7 I", "C major")`).
- **For a larger release**, use bullets with a bold lead
  (`- **Open dictionaries.** …`), one feature per bullet.
- **For a fix**, say what was wrong in terms the reader saw ("reported
  `"3.0.0"` on 3.0.1"), then what it does now.
- **For a breaking change**, say what to change in their code.
- Wrap at about 80 columns.
- Leave out internal file paths, test names and CI details. The exception is
  paths people use: `musictheoryjs/sequence`, `skills/musictheoryjs/`.
- No other libraries' names, and no "not X but Y" flourishes or unverified
  superlatives.
- Plain code fences are fine. Never tag one `ts live`: the docs site turns
  those into playgrounds.

## 4. Check

```bash
bunx changeset status --verbose
```

It lists every pending changeset and the version they add up to, and it fails
if one does not parse. Do not run `bun run version` or publish, and do not
commit; CI cuts the release, and the user commits.
