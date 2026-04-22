import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(...tseslint.configs.recommended, {
  files: ['**/*.ts', '**/*.tsx', '**/*.d.ts'],
  languageOptions: {
    parserOptions: {
      projectService: false,
      tsconfigRootDir: import.meta.dirname,
    },
    globals: {
      ...globals.browser,
      ...globals.node,
    },
  },
  rules: {
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': 'off', //['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-this-alias': 'off',
  },
  ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'],
});
