import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

// Pages must style with the semantic tokens (bg-card, text-muted-foreground,
// border-border, etc. — defined in src/app/globals.css with a .dark override
// block) instead of raw gray-* palette classes, so dark-mode correctness lives
// in the theme rather than in per-element dark: twins. See issue #35. The few
// genuinely intentional raw grays (e.g. the always-dark footer on the landing
// page) are marked with an eslint-disable comment and an explanation.
const noRawGrayClasses = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ban raw gray-* Tailwind classes in page code; use semantic tokens instead",
    },
    messages: {
      grayClass:
        'Use a semantic token instead of raw "{{ cls }}" (bg-card, text-muted-foreground, border-border, etc. from src/app/globals.css) so the page stays correct in both themes.',
    },
    schema: [],
  },
  create(context) {
    // Matches color-role utilities (with optional variant prefixes like
    // dark:/hover:/group-hover:) against the Tailwind gray palette.
    const GRAY_RE =
      /((?:[a-z-]+:)?(?:bg|text|border|divide|ring|from|to|via|fill|stroke|outline|placeholder)-gray-(?:50|100|200|300|400|500|600|700|800|900|950))\b/g;

    function checkString(node, value) {
      if (typeof value !== "string") return;
      GRAY_RE.lastIndex = 0;
      let match;
      while ((match = GRAY_RE.exec(value)) !== null) {
        context.report({
          node,
          messageId: "grayClass",
          data: { cls: match[1] },
        });
      }
    }

    // Recurse into className expressions so classes hidden in ternaries or
    // template interpolations (e.g. `... ${x ? 'bg-green-500' : 'bg-gray-300'}`)
    // are caught too — the class strings live in Literals either way.
    function visitExpression(node) {
      if (!node) return;
      if (node.type === "Literal" && typeof node.value === "string") {
        checkString(node, node.value);
      } else if (node.type === "TemplateLiteral") {
        for (const quasi of node.quasis) checkString(node, quasi.value.cooked);
        for (const expr of node.expressions) visitExpression(expr);
      } else if (node.type === "ConditionalExpression") {
        visitExpression(node.consequent);
        visitExpression(node.alternate);
      }
    }

    return {
      JSXAttribute(node) {
        if (
          node.name.type !== "JSXIdentifier" ||
          node.name.name !== "className"
        ) {
          return;
        }
        const value = node.value;
        if (!value) return;
        if (value.type === "Literal") {
          checkString(node, value.value);
        } else if (value.type === "JSXExpressionContainer") {
          visitExpression(value.expression);
        }
      },
    };
  },
};

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  // The plugin is already registered by eslint-config-next; only add the
  // recommended ruleset without re-declaring the plugin entry.
  {
    plugins: {},
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
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
  {
    files: ["src/app/**/*.{ts,tsx}"],
    plugins: {
      ourdao: { rules: { "no-raw-gray-classes": noRawGrayClasses } },
    },
    rules: {
      "ourdao/no-raw-gray-classes": "error",
    },
  },
];

export default eslintConfig;
