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

If your npm account has two-factor auth on (it does by default), a plain publish
from CI fails with `EOTP` because it can't enter a one-time password. Pick one of
these so it doesn't need to:

**Option A — automation token (simplest).** An npm *automation* token skips 2FA
in CI.

1. npmjs.com → avatar → **Access Tokens → Generate New Token**. Choose a classic
   **Automation** token, or a **Granular** token with read/write scoped to
   `musictheoryjs`.
2. Copy it (shown once).
3. GitHub repo → **Settings → Secrets and variables → Actions → New repository
   secret**, name it **`NPM_TOKEN`**, paste the value.

The workflow reads it as `NODE_AUTH_TOKEN`. Done.

**Option B — trusted publishing (no token).** npm can authenticate the workflow
directly through GitHub's OIDC, with no secret at all.

1. npmjs.com → the **`musictheoryjs`** package → **Settings → Trusted Publisher**.
2. Add a **GitHub Actions** publisher: organization/user `Zachacious`, repository
   `MusicTheoryJS`, workflow file `release.yml` (leave the environment blank).
3. Save, then re-run the release. The workflow already has `id-token: write` and
   upgrades npm to a version that supports OIDC.

Either way, provenance is signed automatically.

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
| `bun run changeset` | Author a changeset for your change |
| `bun run version` | Consume changesets: bump version + changelog |
| `bun run release` | `build` then `changeset publish` |
| `bun run e2e` | Build, then run the ESM + CJS end-to-end checks |
