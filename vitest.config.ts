import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Coverage is measured against the rebuilt modules; the remaining
      // legacy modules (note/tuning) are replaced in Phase 4 (see
      // REDESIGN.md) and not counted until then.
      include: [
        "src/core/**",
        "src/pcset/**",
        "src/dict/**",
        "src/chord/**",
        "src/scale/**",
        "src/key/**",
        "src/roman/**",
        "src/progression/**",
      ],
    },
  },
});
