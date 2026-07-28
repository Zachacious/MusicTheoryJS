# Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets)
and GitHub Actions. The flow is:

1. **Add a changeset** with each meaningful change:
   ```bash
   bun run changeset
   ```
   Pick the bump type (patch / minor / major) and write a short summary. This
   creates a markdown file under `.changeset/`. Commit it with your change.

2. **Merge to `master`.** The [Release workflow](.github/workflows/release.yml)
   runs on every push to `master`:
   - If there are pending changesets, it opens (or updates) a **“Version
     Packages”** PR that bumps the version and updates the changelog.
   - When that PR is merged, the workflow builds and **publishes to npm** with
     [provenance](https://docs.npmjs.com/generating-provenance-statements).

3. **Docs** are rebuilt and deployed to GitHub Pages by the
   [Docs workflow](.github/workflows/docs.yml) on every push to `master`.

## One-time setup

- **`NPM_TOKEN`** repository secret — an npm *automation* token with publish
  rights to `musictheoryjs` (Settings → Secrets and variables → Actions).
- **GitHub Pages** — set Settings → Pages → Source to **GitHub Actions**.
- Provenance needs no secret; it uses the workflow's OIDC `id-token` permission
  (already configured).

## Manual release (fallback)

```bash
bun run version   # apply changesets: bump version + changelog
bun run release   # build + changeset publish (needs npm auth locally)
```

## Scripts

| Script | Purpose |
| --- | --- |
| `bun run changeset` | Author a changeset |
| `bun run version` | Consume changesets: bump version + changelog |
| `bun run release` | `build` then `changeset publish` |
