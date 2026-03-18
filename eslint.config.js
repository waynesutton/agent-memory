import convexPlugin from "@convex-dev/eslint-plugin";

export default [
  {
    plugins: {
      "@convex-dev": convexPlugin,
    },
    files: ["src/component/**/*.ts"],
    rules: {
      "@convex-dev/no-old-registered-function-syntax": "error",
      "@convex-dev/require-argument-validators": "error",
      "@convex-dev/no-collect-in-query": "error",
    },
  },
];
