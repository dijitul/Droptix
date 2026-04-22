// @ts-check
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'plugin:jsx-a11y/recommended'),
  {
    rules: {
      // ── Money rule ─────────────────────────────────────────
      // Enforce the "always bigint pence" invariant. These catch
      // the most common drifts; the Money value object itself is
      // the canonical path.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name='parseFloat'][arguments.0.type='Identifier'][arguments.0.name=/.*(amount|price|fee|total|subtotal|cost|commission|payout).*/i]",
          message:
            'Do not parseFloat money. Use Money.fromMajor() or Money.fromMinor() — see src/lib/money.ts.',
        },
        {
          selector:
            "CallExpression[callee.name='Number'][arguments.0.type='Identifier'][arguments.0.name=/.*(amount|price|fee|total|subtotal|cost|commission|payout).*/i]",
          message:
            'Do not Number() money. Use Money.fromMinor() — see src/lib/money.ts.',
        },
        {
          selector:
            "VariableDeclarator[id.name=/.*(amount|price|fee|total|subtotal|cost|commission|payout).*/i] > Literal[raw=/^\\d+\\.\\d+$/]",
          message:
            'Floating-point money literal. Store as bigint pence — use Money.fromMajor("10.50") at the boundary only.',
        },
      ],

      // Accessibility — enforced by jsx-a11y; these elevate key ones to errors.
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],

      // Type safety
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Next.js
      '@next/next/no-img-element': 'warn',
    },
  },
  {
    // Tests can use looser rules
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Money value object is the one place floats appear — it's the boundary
    files: ['src/lib/money.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'dist/**', 'coverage/**', 'prisma/generated/**'],
  },
];
