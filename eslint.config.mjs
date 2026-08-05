import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["src/components/DocumentViewer.tsx"],
    rules: {
      // React's own documented data-fetching-in-effect pattern — setLoading(true)
      // synchronously at the top of the effect, see
      // https://react.dev/reference/react/useEffect#fetching-data-with-effects —
      // trips this rule (confirmed by isolating that exact example). This
      // component's password-gated decrypt flow doesn't map cleanly onto
      // React Query without a larger rewrite, so it's scoped to just this
      // file rather than weakening the guardrail everywhere.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
