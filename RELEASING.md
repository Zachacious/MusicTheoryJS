# Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets)
and GitHub Actions. You never run `npm publish` by hand.

## How the automation works

The [Release workflow](.github/workflows/release.yml) runs on every push to
**`master`**:

1. **Accumulate** — each change that should ship carries a *changeset* (a small
   markdown file in `.changeset/` describing the bump). While changesets are
   pending, the workflow opens/updates a **“Version Packages” PR** that applies
   them: it bumps `version` in `package.json`, writes `CHANGELOG.md`, and deletes
   the consumed changeset files.
2. **Publish** — when you merge that Version PR, the workflow runs the full
   verify gate (lint, typecheck, tests, build, ESM+CJS end-to-end) and then
   publishes to npm **with provenance**.

So the human decisions are only: *(a)* land changes (each with a changeset) on
`master`, and *(b)* merge the Version PR when you want to cut the release.

## The short way: `bun run release:cut`

One command authors the changeset and commits your pending work, so you don't
step through the interactive `changeset` prompts by hand:

```bash
bun run release:cut patch "Rewrite README for a JS-developer audience"
# then: git push   → CI opens the Version Packages PR; merge it to publish
```

Add `--push` to push in the same step. Add `--dry-run` to see every action
without touching anything. For a docs-only fix that has to hit npm immediately,
`--publish` runs the whole thing locally — version bump, build, verify,
`changeset publish`, tag push — but needs `npm login` first and skips the
provenance you get from CI. Prefer the CI path unless you need it live now.

## Where the release notes go

A changeset's text is the release note. `bun run version` writes it into
`CHANGELOG.md`, the release workflow posts it as the GitHub Release, and the
docs site's [What's new](https://musictheoryjs.com/whats-new/) page is
generated from `CHANGELOG.md` on every build
(`docs/src/integrations/whats-new.mjs`), so nothing is written twice.

In Claude Code sessions, a Stop hook (`.claude/hooks/changelog-check.sh`)
notices when code that ships to npm (`src/`, `skills/`, `README.md`,
`package.json`) changed but no changeset did, and asks for one once.
`.claude/skills/changelog/SKILL.md` (or `/changelog`) says how to write it.

## The v3.0.0 release (this one is a major)

- npm currently has `latest = 2.0.2`. `package.json` is intentionally set to
  **`2.0.2`** (the last published version) so Changesets computes the next
  version *from* it.
- There is a **`major`** changeset in [`.changeset/`](.changeset), so the first
  release from this branch bumps `2.0.2 → 3.0.0`.
- Concretely: merge `v3-rewrite` → `master` → the workflow opens a “Version
  Packages” PR bumping to `3.0.0` → merge that PR → `3.0.0` publishes.

To add more changes before release, run `bun run changeset` and commit the file.

## One-time setup (required before the first publish)

### 1. Let CI authenticate to npm

CI publishes with npm **trusted publishing**: npm accepts the workflow's GitHub
OIDC identity in place of a token, so there is no secret to store, expire, or
leak. (npm revoked classic and automation tokens in December 2025, and
write-enabled granular tokens now expire within 90 days, so a token-based CI
publish is not an option worth keeping.) This is already configured; releases
since 3.0.0 have published this way.

To set it up again (a new package, or after a repo rename):

1. npmjs.com → the **`musictheoryjs`** package → **Settings → Trusted Publisher**.
2. Add a **GitHub Actions** publisher: organization/user `Zachacious`, repository
   `MusicTheoryJS`, workflow file `release.yml` (leave the environment blank).
3. Run a release within 48 hours. npm drops a trusted-publisher configuration
   that is never used. The workflow already has `id-token: write` and installs
   an npm new enough for OIDC.

Provenance is signed automatically. Renaming `release.yml` breaks publishing
until the publisher on npmjs.com is updated to match.

Once a release has gone through, harden the package: npmjs.com → package
**Settings → Publishing access → "Require two-factor authentication and
disallow tokens"**. Trusted publishing keeps working; a leaked token can no
longer publish.

### 2. Enable GitHub Pages (for docs)

Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**. The
[Docs workflow](.github/workflows/docs.yml) then deploys the TypeDoc site on each
push to `master`.

## Manual release (fallback, if you ever need it)

```bash
bun run version   # apply changesets: bump package.json + CHANGELOG
npm login         # authenticate locally
bun run release   # build + verify + changeset publish (add --provenance manually if desired)
```

## Scripts

| Script | Purpose |
| --- | --- |
| `bun run release:cut <bump> "<summary>"` | Author a changeset + commit in one step (`--push`, `--publish`, `--dry-run`) |
| `bun run changeset` | Author a changeset interactively |
| `bun run version` | Consume changesets: bump version + changelog |
| `bun run release` | `build` then `changeset publish` |
| `bun run e2e` | Build, then run the ESM + CJS end-to-end checks |
