import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Coverage is measured against the new core; legacy modules are
      // replaced phase by phase (see REDESIGN.md) and not counted.
      include: ["src/core/**", "src/pcset/**", "src/dict/**"],
    },
  },
});
