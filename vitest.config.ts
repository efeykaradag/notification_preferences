import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            exclude: [
                "**/vitest.config.*",
                "src/types.ts",
                "src/http.ts",
            ],
            thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 }
        },
        globals: true
    }
});
