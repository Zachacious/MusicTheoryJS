import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // The legacy source is fully replaced as of Phase 4: all of src/ counts.
      include: ["src/**"],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 100,
        lines: 95,
      },
    },
  },
});
