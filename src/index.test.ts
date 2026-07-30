/**
 * Guards on the root barrel itself, rather than on any one music concept.
 */

import { describe, expect, test } from "bun:test";
import pkg from "../package.json" with { type: "json" };
import { VERSION } from "./index";

describe("VERSION", () => {
  test("matches the version in package.json", () => {
    // The constant is a literal so the bundles stay self-contained, which means
    // it can drift from package.json — it silently did for three releases.
    // `bun run scripts/sync-version.ts` (wired into the `version` script)
    // rewrites it; this test is what makes skipping that a build failure.
    expect(VERSION).toBe(pkg.version);
  });

  test("looks like a semver release", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+(-[\w.]+)?$/);
  });
});
