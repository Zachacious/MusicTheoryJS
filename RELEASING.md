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

### 1. Create an npm token and add it as `NPM_TOKEN`

1. Log in at <https://www.npmjs.com> as a user with publish rights to
   `musictheoryjs` (the package owner/maintainer).
2. Avatar menu → **Access Tokens** → **Generate New Token** →
   **Granular Access Token** (recommended) — or a classic **Automation** token.
   - Granular: set **Packages and scopes → Read and write**, limited to
     `musictheoryjs`; pick an expiry; leave IP allowlist empty for CI.
   - Classic: choose **Automation** (bypasses 2FA in CI).
3. Copy the token (shown once).
4. In GitHub: repo **Settings → Secrets and variables → Actions → New repository
   secret**. Name it exactly **`NPM_TOKEN`**, paste the value.

The workflow reads it as `NODE_AUTH_TOKEN` for the publish step. Provenance
itself needs **no** secret — it uses the workflow's OIDC `id-token` permission,
already configured.

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
