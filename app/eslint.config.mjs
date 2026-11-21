import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

// Keep lint mechanical. Domain correctness and MVC dependencies have separate
// TypeScript/Vitest safeguards, and warnings request review rather than edits
// that could change historic behavior.
export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', 'dist-server/**', 'coverage/**', 'test-results/**'],
  },
  {
    files: ['**/*.{ts,tsx,mjs}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...js.configs.recommended.rules,
      // TypeScript's own checker handles references, types and declarations.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-debugger': 'error',
      'no-eval': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
)
