---
"musictheoryjs": patch
---

Fix the exported `VERSION` constant, which reported `"3.0.0"` on 3.0.1, 3.0.2,
and 3.1.0. It is a literal so the bundles stay self-contained, and nothing kept
it in step with `package.json`.

Two changes so it cannot drift again: the `version` script now runs
`scripts/sync-version.ts` immediately after Changesets bumps `package.json`, and
a test asserts the two match — so a release that skips the sync fails CI instead
of shipping a wrong version string.
